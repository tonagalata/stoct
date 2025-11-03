export type Meta = { hasVault: boolean, kdf?: any, wrappedVaultKey?: string, etag?: string, version?: number };

const WORKER_BASE = process.env.NEXT_PUBLIC_STOCT_CF_BASE!; // e.g. https://stoct-sync.your.workers.dev

export async function fetchMeta(userId: string): Promise<Meta> {
  try {
    const r = await fetch(`${WORKER_BASE}/v1/meta?user=${encodeURIComponent(userId)}`);
    
    if (r.status === 429) throw new Error('quota_exceeded');
    if (r.status === 503) throw new Error('service_unavailable');
    if (!r.ok) throw new Error('meta');
    
    return r.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('network_error');
    }
    throw error;
  }
}

export async function initVault(userId: string, kdf: any, wrappedVaultKey: string): Promise<{ etag: string }> {
  try {
    const r = await fetch(`${WORKER_BASE}/v1/init`, { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body: JSON.stringify({ userId, kdf, wrappedVaultKey })
    });
    
    if (r.status === 409) throw new Error('exists');
    if (r.status === 429) throw new Error('quota_exceeded');
    if (r.status === 503) throw new Error('service_unavailable');
    if (!r.ok) throw new Error('init');
    
    return r.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('network_error');
    }
    throw error;
  }
}

export async function downloadEncrypted(userId: string): Promise<{ ivct: Uint8Array, etag?: string, version?: number, kdf?: any }> {
  try {
    const r = await fetch(`${WORKER_BASE}/v1/get?user=${encodeURIComponent(userId)}`);
    
    if (r.status === 429) throw new Error('quota_exceeded');
    if (r.status === 503) throw new Error('service_unavailable');
    if (!r.ok) throw new Error('get');
    
    const buf = new Uint8Array(await r.arrayBuffer());
    return { ivct: buf, etag: r.headers.get('x-stoct-etag')||undefined, version: +(r.headers.get('x-stoct-v')||'0'), kdf: safeParse(r.headers.get('x-stoct-kdf')) };
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('network_error');
    }
    throw error;
  }
}

export async function uploadEncrypted(userId: string, ivct: Uint8Array, ifMatch: string): Promise<{ etag: string, version: number }> {
  try {
    const r = await fetch(`${WORKER_BASE}/v1/put?user=${encodeURIComponent(userId)}`, {
      method:'POST', headers:{ 'content-type':'application/octet-stream', 'if-match': ifMatch }, body: ivct
    });
    
    if (r.status === 412) throw new Error('precondition');
    if (r.status === 429) throw new Error('quota_exceeded');
    if (r.status === 503) throw new Error('service_unavailable');
    if (!r.ok) throw new Error('put');
    
    return { etag: r.headers.get('x-stoct-etag')!, version: +(r.headers.get('x-stoct-v')||'0') };
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('network_error');
    }
    throw error;
  }
}

function safeParse(s: string|null) { try { return s ? JSON.parse(s) : undefined; } catch { return undefined; } }
