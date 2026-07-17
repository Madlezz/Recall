# Sync

Recall has two independent sync paths. Both reuse the same import/export merge
engine (`src/services/import-export.ts`) so conflict handling is identical.

1. **Encrypted relay** — E2E-encrypted blobs on a Cloudflare Worker + R2
   (`sync-relay/`). The server never sees plaintext or the key.
2. **Folder sync** — Tauri-only; writes `recall-sync.json` to a user folder
   (Dropbox/Drive), merges on import (`src/services/sync.ts`).

This doc covers the encrypted relay in detail. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for where sync sits in the stack.

## Encrypted relay — threat model

| The relay stores | The relay NEVER sees |
|---|---|
| Opaque AES-GCM ciphertext blobs, keyed by a SHA-256 hash of the sync code | Plaintext data, or the encryption key |

The relay is "zero-knowledge" by construction: it only stores encrypted blobs
and serves them back. A compromised relay yields only ciphertext.

## Key derivation

- The **sync code** is a human-readable string that encodes the key material.
  Users share it between devices (out-of-band).
- `sync-protocol.ts` derives the blob key with
  `SHA-256(normalize(syncCode))` where normalize = strip `-`/whitespace,
  uppercase. This key is the **R2 object key** — the relay cannot reverse it to
  the sync code.
- The actual encryption key is derived inside `crypto.ts` via
  **PBKDF2-SHA-256, 600k iterations** (OWASP 2023) from the sync code + a random
  16-byte salt. Each encryption uses a fresh 12-byte IV (AES-GCM).

Relevant types live in `src/services/crypto.ts`:

- `EncryptedPayload { ciphertext, iv, salt, iterations }` — what gets uploaded.
- `SyncCode { code, salt }`.

## Wire protocol

Endpoints (see `sync-relay/src/worker.ts`). All require HTTPS — the client
throws if the relay URL is not `https://` (`enforceHttps`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Connectivity check (`testSyncRelay`). |
| `GET` | `/sync/:key` | Download blob. `404` = no data yet (first sync). Returns `ETag` revision. |
| `PUT` | `/sync/:key` | Upload blob. `X-Device-Id` + `If-Match` (optimistic concurrency). |
| `DELETE` | `/sync/:key` | Unlink this sync code (`deleteSyncData`). |

`:key` must match `^[a-f0-9]{64}$` (a SHA-256 hex blob key). Responses are
CORS-open (`Access-Control-Allow-Origin: *`) so the PWA can call the relay
directly from the browser. Blob size is capped at **5 MB** on download; blob TTL
is 90 days since last update (R2 lifecycle rule).

## Sync flow (`performEncryptedSync`)

1. Compute `blobKey = SHA-256(normalize(syncCode))`.
2. `GET /sync/:key`.
   - **404** → first sync: encrypt local state, `PUT` with `If-Match: "0"`.
   - **200** → read `ETag` revision; decrypt remote blob; validate shape
     (`validateDecryptedPayload` → `parseImportPayload`).
3. Merge remote into local via `mergeImportPayload(localState, remoteData)`.
4. Re-encrypt the merged snapshot and `PUT /sync/:key` with `If-Match` = that ETag.
5. On **409 Conflict**: re-download, re-merge, retry **once**. Still 409 → fail.
6. Return `SyncResult { success, uploaded, downloaded, mergedSnapshot, changes }`.

### Optimistic concurrency

Relay stores a monotonic `revision` in R2 `customMetadata`. GET returns it as
`ETag`. PUT rejects stale writers with 409 + current ETag. Merge is still
full-snapshot (not field-level CRDT); concurrency only prevents silent clobber
of a concurrent upload.

Each device carries a persistent `deviceId` (`localStorage` / web, used as
`X-Device-Id`) so the relay can attribute writes.

## Device-local key protection

`syncCode` is E2E key material. It **must never** be serialized into exports
or logged. Import paths strip device sync fields via
`preserveDeviceSyncSettings()` in `repository.ts`.

**At-rest status (2026-07-17):** `syncCode` is wrapped before disk write via
`src/services/sync-secret.ts` (AES-GCM with a random device key). Format:
`enc:v1:` + base64(JSON ciphertext/iv). The device key is stored in IndexedDB
(`recall-secrets`) with a `localStorage` mirror for restricted webviews.

- In-memory / Zustand still holds **plaintext** so crypto + UI work unchanged.
- Legacy plaintext values are accepted on load and rewritten sealed on the next
  `saveSettings` / `saveSnapshot`.
- Not yet OS keychain / Tauri stronghold — a stolen device key + DB still
  reveals the code. Upgrade path: platform keyring (see AUDIT S1).

## Import safety boundary

`repository.ts › preserveDeviceSyncSettings()` strips `syncCode`,
`syncRelayUrl`, and `syncEnabled` from any imported payload, so restoring a
`.recall` backup or a folder-sync file never overwrites the device's own sync
credentials.

## Self-hosting

The `sync-relay/` folder is a standalone Cloudflare Worker. Deploy with
`wrangler` (binding an R2 bucket named `RECALL_SYNC`). Point clients at your
instance by setting `syncRelayUrl` in settings; the default is
`https://sync.recall.app`. See [`DEPLOYMENT.md`](./DEPLOYMENT.md).
