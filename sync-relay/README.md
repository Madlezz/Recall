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
npx wrangler whoami   # confirm prod account before deploy
npx wrangler r2 bucket create recall-sync-blobs   # first time only
npx wrangler deploy
```

Default workers.dev URL: `https://recall-sync-relay.<your-subdomain>.workers.dev`.
Product default client URL is `https://sync.recall.app` (custom domain / DNS on you).

**Production checklist** (ETag / 409 smoke, rollback, client spot-check):
see [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md#sync-relay).

Client already implements optimistic concurrency (`If-Match` + one 409 retry).
Until this worker is live in prod, multi-device uploads can still silent-clobber.

## Self-hosting

Users can self-host their own relay:
1. Create a Cloudflare account (free tier is sufficient)
2. `npm install && npx wrangler deploy`
3. Enter the worker URL in Recall Settings → Sync
4. Prefer keeping ETag / If-Match / 409 behavior from `src/worker.ts`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/sync/:key` | Download encrypted blob (404 if none). Returns `ETag` revision. |
| PUT | `/sync/:key` | Upload encrypted blob. Requires `If-Match` for updates (`"0"` create). `409` on stale. |
| DELETE | `/sync/:key` | Delete blob (unlink device) |

Headers:

- Request: `Content-Type`, `X-Device-Id`, `If-Match` (PUT)
- Response: `ETag` (exposed via CORS `Access-Control-Expose-Headers`)

`:key` must be `^[a-f0-9]{64}$` (SHA-256 hex of the sync code).

## Limits

- **Blob size (worker)**: 50 MB max on PUT
- **Blob size (official client download)**: 5 MB max (client-side guard)
- **TTL**: 90 days since last upload (R2 lifecycle rule; configure in dashboard)
- **Rate limit**: 60 req/min per IP (Cloudflare built-in)
- **Concurrency**: monotonic `revision` in R2 `customMetadata`; stale PUT → 409
