# Recall Sync Relay

End-to-end encrypted sync relay for Recall, built on Cloudflare Workers + R2.

## How it works

1. Device A generates a sync code (encodes encryption key material)
2. Device A encrypts its state with AES-GCM → uploads encrypted blob here
3. Device B enters the sync code → downloads blob → decrypts → merges
4. Both devices now have the same data

**The relay NEVER sees plaintext or encryption keys.** It only stores opaque encrypted blobs, addressed by a SHA-256 hash of the sync code.

## Deploy

```bash
cd sync-relay
npm install
npx wrangler login
npx wrangler r2 bucket create recall-sync-blobs
npx wrangler deploy
```

The worker will be deployed to `https://recall-sync-relay.<your-subdomain>.workers.dev`.

## Self-hosting

Users can self-host their own relay:
1. Create a Cloudflare account (free tier is sufficient)
2. `npm install && npx wrangler deploy`
3. Enter the worker URL in Recall Settings → Sync

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/sync/:key` | Download encrypted blob (404 if none) |
| PUT | `/sync/:key` | Upload encrypted blob |
| DELETE | `/sync/:key` | Delete blob (unlink device) |

## Limits

- **Blob size**: 50MB max
- **TTL**: 90 days since last upload (auto-expired)
- **Rate limit**: 60 req/min per IP (Cloudflare built-in)
