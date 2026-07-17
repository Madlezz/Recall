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
| `GET` | `/sync/:key` | Download blob. `404` = no data yet (first sync). |
| `PUT` | `/sync/:key` | Upload blob. `X-Device-Id` header. |
| `DELETE` | `/sync/:key` | Unlink this sync code (`deleteSyncData`). |

`:key` must match `^[a-f0-9]{64}$` (a SHA-256 hex blob key). Responses are
CORS-open (`Access-Control-Allow-Origin: *`) so the PWA can call the relay
directly from the browser. Blob size is capped at **5 MB** on download; blob TTL
is 90 days since last update (R2 lifecycle rule).

## Sync flow (`performEncryptedSync`)

1. Compute `blobKey = SHA-256(normalize(syncCode))`.
2. `GET /sync/:key`.
   - **404** → first sync: encrypt local state, `PUT`, done.
   - **200** → decrypt remote blob with the sync code, validate shape
     (`validateDecryptedPayload` → `parseImportPayload`).
3. Merge remote into local via `mergeImportPayload(localState, remoteData)`.
   The merge counts decks/cards/reviewLogs changed for the result.
4. Re-encrypt the merged snapshot (`buildExportPayload` → `encryptData`) and
   `PUT /sync/:key`.
5. Return `SyncResult { success, uploaded, downloaded, mergedSnapshot, changes }`.

Each device carries a persistent `deviceId` (`localStorage` / web, used as
`X-Device-Id`) so the relay can attribute writes; merges are idempotent per
device.

## Device-local key protection

`syncCode` is E2E key material. It **must never** be serialized into exports
or logged. Import paths strip device sync fields via
`preserveDeviceSyncSettings()` in `repository.ts`.

**At-rest status (2026-07-17):** the sync code is still stored **in plaintext**
in app settings (SQLite `sync_code` on desktop, snapshot/localStorage in the
browser). There is no wrapping key / OS keychain integration yet.
`sync-secret.ts` was removed as orphaned work and is **not** in the tree.

Treat disk encryption / full-disk access control as the current boundary for
at-rest secrecy. Planned work (see [`AUDIT.md`](./AUDIT.md) item S1): wrap the
code with a device-local AES-GCM key (IndexedDB on web; platform keyring on
Tauri) and migrate existing plaintext on load.

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
