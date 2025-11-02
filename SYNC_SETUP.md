# Stoct Sync Setup Instructions

## Cloudflare Workers Setup

### 1. Create KV Namespace
```bash
wrangler kv:namespace create stoct_vaults
```

### 2. Update wrangler.toml
Replace the placeholder IDs in `wrangler.toml` with the actual IDs returned from the command above:
```toml
[[kv_namespaces]]
binding = "VAULTS"
id = "your_actual_kv_id_here"
preview_id = "your_actual_kv_id_here"
```

### 3. Deploy Worker
```bash
# For development
wrangler dev

# For production
wrangler deploy
```

### 4. Set Environment Variable
Create a `.env.local` file in the project root:
```
NEXT_PUBLIC_STOCT_CF_BASE=https://stoct-vault.stoct-sync.workers.dev
```

Your worker is now deployed and accessible at the URL above.

## Features

### Zero-Knowledge Sync
- All data is encrypted client-side before uploading to Cloudflare KV
- Server never sees plaintext data
- Uses ETag/If-Match for conflict resolution

### Peer-to-Peer Transfer
- Direct WebRTC connection between devices
- QR code exchange for SDP offers/answers
- No server storage required
- Encrypted data transfer

## Usage

### Cloud Sync
1. Set up a passcode in Settings
2. Modal will appear asking to enable sync
3. Click "Use Cloudflare Sync" to initialize
4. Data will be automatically synced on changes

### Device Transfer
1. Go to Settings → Move to This Device
2. **Send Tab**: Generate QR code, scan on receiving device
3. **Receive Tab**: Scan sender's QR code, show response QR
4. Complete handshake and transfer data

## Security Notes

- Vault data is encrypted with AES-GCM before upload
- Fresh IV used for each encryption
- KV stores only encrypted blobs + metadata
- WebRTC provides DTLS encryption for P2P transfers
- QR codes contain only SDP data, not secrets

## Limits

- KV blob size: Keep encrypted vaults under 10-15 MB
- For larger vaults, consider migrating to Cloudflare R2
- WebRTC chunk size: 64KB default (configurable)
