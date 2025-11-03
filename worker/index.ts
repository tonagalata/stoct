export interface Env {
  VAULTS: any; // KV stores metadata + encrypted vault blob (KVNamespace in Cloudflare context)
}

type Kdf = { type: 'passkey-prf'|'argon2id'|'pbkdf2-sha256', salt?: string|null, params?: any };
type VaultDoc = {
  kdf: Kdf;
  wrappedVaultKey: string; // base64url AES-GCM(KEK, vaultKey)
  etag: string;
  version: number;
  // Encrypted vault stored as one KV value: bytes(iv||ciphertext)
  // Value key: `bin/${userId}`
};

// Helpers
const b64u = {
  toUrl: (u8: Uint8Array) => {
    let s=''; for (let i=0;i<u8.length;i++) s+=String.fromCharCode(u8[i]);
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  },
  fromUrl: (s: string) => {
    const b = atob(s.replace(/-/g,'+').replace(/_/g,'/'));
    const u8 = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u8[i]=b.charCodeAt(i);
    return u8;
  }
};

function json(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type':'application/json', ...init.headers }, ...init });
}

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;

    // CORS (optional)
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // POST /v1/init { userId, kdf, wrappedVaultKey }
    if (pathname === '/v1/init' && req.method === 'POST') {
      const { userId, kdf, wrappedVaultKey } = await req.json();
      const metaKey = `meta/${userId}`;
      const exists = await env.VAULTS.get(metaKey);
      if (exists) return new Response('already-exists', { status: 409, headers: corsHeaders() });

      const etag = crypto.randomUUID();
      const doc: VaultDoc = { kdf, wrappedVaultKey, etag, version: 1 };
      await env.VAULTS.put(metaKey, JSON.stringify(doc));
      return json({ etag }, { headers: corsHeaders() });
    }

    // GET /v1/meta?user=...
    if (pathname === '/v1/meta' && req.method === 'GET') {
      const userId = searchParams.get('user');
      if (!userId) return new Response('bad-request', { status: 400, headers: corsHeaders() });
      const docRaw = await env.VAULTS.get(`meta/${userId}`);
      if (!docRaw) return json({ hasVault: false }, { headers: corsHeaders() });
      const doc = JSON.parse(docRaw) as VaultDoc;
      return json({ hasVault: true, kdf: doc.kdf, wrappedVaultKey: doc.wrappedVaultKey, etag: doc.etag, version: doc.version }, { headers: corsHeaders() });
    }

    // GET /v1/get?user=...  -> returns encrypted vault bytes (iv||ct) as application/octet-stream
    if (pathname === '/v1/get' && req.method === 'GET') {
      const userId = searchParams.get('user');
      if (!userId) return new Response('bad-request', { status: 400, headers: corsHeaders() });
      const bin = await env.VAULTS.get(`bin/${userId}`, 'arrayBuffer');
      if (!bin) return new Response('not-found', { status: 404, headers: corsHeaders() });

      const metaRaw = await env.VAULTS.get(`meta/${userId}`);
      const meta = metaRaw ? (JSON.parse(metaRaw) as VaultDoc) : null;
      const headers: Record<string,string> = { 'content-type':'application/octet-stream', ...corsHeaders() };
      if (meta) { headers['x-stoct-etag'] = meta.etag; headers['x-stoct-v'] = String(meta.version); headers['x-stoct-kdf'] = JSON.stringify(meta.kdf); }
      return new Response(bin, { status: 200, headers });
    }

    // POST /v1/put?user=...  body: raw bytes (iv||ct)  headers: If-Match: <etag>
    if (pathname === '/v1/put' && req.method === 'POST') {
      const userId = searchParams.get('user');
      if (!userId) return new Response('bad-request', { status: 400, headers: corsHeaders() });
      const ifMatch = req.headers.get('if-match');
      if (!ifMatch) return new Response('missing-if-match', { status: 400, headers: corsHeaders() });

      const metaKey = `meta/${userId}`;
      const docRaw = await env.VAULTS.get(metaKey);
      if (!docRaw) return new Response('not-found', { status: 404, headers: corsHeaders() });
      const doc = JSON.parse(docRaw) as VaultDoc;

      if (doc.etag !== ifMatch) {
        return new Response('precondition', { status: 412, headers: corsHeaders() });
      }

      const body = await req.arrayBuffer();
      await env.VAULTS.put(`bin/${userId}`, body); // store encrypted blob
      const nextEtag = crypto.randomUUID();
      const nextDoc: VaultDoc = { ...doc, etag: nextEtag, version: (doc.version ?? 1) + 1 };
      await env.VAULTS.put(metaKey, JSON.stringify(nextDoc));
      const headers = { 'x-stoct-etag': nextEtag, 'x-stoct-v': String(nextDoc.version), ...corsHeaders() };
      return new Response('ok', { status: 200, headers });
    }

    return new Response('not-found', { status: 404, headers: corsHeaders() });
  }
};

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, if-match',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  };
}
