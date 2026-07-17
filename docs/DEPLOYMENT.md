# Deployment

## Desktop (Tauri)

### Prerequisites

- Node.js 22 (`.node-version` pins `24.18.0` during active development; CI
  uses `setup-node@22` at release time).
- Rust stable toolchain.
- Package manager: `pnpm`.
- `pnpm install`, then `pnpm tauri build` to produce platform installers.

### Build artifacts

`pnpm tauri build` outputs platform-specific packages under `src-tauri/target/`
(not tracked). The release artifacts go through GitHub Actions (see below).

### Code signing

- Updater binaries are **ed25519-signed** using the key pair in `recall-updater.key`
  (private) / `recall-updater.key.pub` (public). The public key is bundled into
  the app to verify the update source before installing.
- OS-level code signing (Apple notarization, Windows EV cert) is **not yet
  implemented**. A known limitation until funded; see
  [`SECURITY.md`](../SECURITY.md).

### Release pipeline (GitHub Actions)

Triggered on tag push `v*` (`.github/workflows/release.yml`):

1. `check`: lint + unit tests with coverage + build.
2. `e2e`: Playwright PWA tests.
3. `rust-audit`: `cargo audit` against `src-tauri/.cargo/audit.toml` ignore list.
4. `rust-quality`: `cargo fmt --check` + `cargo clippy -D warnings` + `cargo test`.
5. `build-tauri`: macOS (aarch64, x86_64), Ubuntu 22.04, Windows — produce
   installers, publish to GitHub Releases.
6. `checksums`: download release assets, generate `SHA256SUMS`, upload.

Required repo secrets:

| Secret | Purpose |
|---|---|
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |
| `TAURI_SIGNING_PRIVATE_KEY` | Ed25519 private key for updater |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Passphrase for the key |

## PWA / Web

The web build is a Vite SPA that can be served by any static host (Nginx,
GitHub Pages, Cloudflare Pages, etc.).

### GitHub Pages

`pages.yml` workflow deploys the `dist/` build to a `gh-pages` branch on push
to `main`. Favicon, manifest, and icons are in `public/`.

### PWA update prompt

A Service Worker handles caching. `src/components/pwa-update-prompt.tsx` shows a
"Update available" banner when the SW detects a new version.

## Sync Relay

The relay server is a standalone Cloudflare Worker in `sync-relay/`.
Client (main tip `#56`) already sends `If-Match` and retries once on `409`.
**Production only gets optimistic concurrency after this worker is redeployed.**
Old workers ignore revision metadata and never return useful `ETag` / `409`.

Default client URL: `https://sync.recall.app` (override in **Settings → Sync**).

### Production deploy checklist (owner)

Run from a machine logged into the **production** Cloudflare account that owns
the live worker + R2 bucket. Do **not** deploy from a personal sandbox account
against prod bindings without confirming `wrangler whoami` + account id.

#### 0. Preconditions

| Check | Command / note |
|---|---|
| Cloudflare login | `cd sync-relay && npx wrangler login` then `npx wrangler whoami` |
| Account matches prod | Compare account id to dashboard for `recall-sync-relay` |
| R2 bucket exists | Binding `RECALL_SYNC` → bucket `recall-sync-blobs` (`wrangler.toml`) |
| Node deps | `cd sync-relay && npm install` |
| Code on main | Worker source includes revision / ETag / If-Match (`#56`) |

#### 1. Pre-deploy smoke (optional local)

```bash
cd sync-relay
npx wrangler dev
# other terminal:
curl -sS http://127.0.0.1:8787/health
# expect 200 + JSON ok
```

#### 2. Deploy

```bash
cd sync-relay
npx wrangler deploy
# note printed workers.dev / custom domain URL
```

#### 3. Post-deploy verification (required)

Replace `$RELAY` with the live base URL (no trailing slash). Use a **throwaway**
64-char hex key so you never touch a real user's blob key.

```bash
# Health
curl -sS -D- "$RELAY/health" -o /tmp/relay-health.json
# expect: HTTP 200

# Create (If-Match 0)
curl -sS -D- -X PUT "$RELAY/sync/$KEY" \
  -H 'Content-Type: application/octet-stream' \
  -H 'X-Device-Id: deploy-check' \
  -H 'If-Match: "0"' \
  --data-binary 'cipher-test-v1' -o /tmp/relay-put1.json
# expect: 200, ETag: "1" (or higher if key already used)

# Stale write must 409
curl -sS -D- -X PUT "$RELAY/sync/$KEY" \
  -H 'Content-Type: application/octet-stream' \
  -H 'X-Device-Id: deploy-check' \
  -H 'If-Match: "0"' \
  --data-binary 'should-conflict' -o /tmp/relay-put-stale.json
# expect: HTTP 409, body has revision, ETag header present

# Fresh GET exposes ETag
curl -sS -D- "$RELAY/sync/$KEY" -o /tmp/relay-get.bin
# expect: 200, ETag header, body = last successful ciphertext

# Cleanup test key
curl -sS -D- -X DELETE "$RELAY/sync/$KEY" -o /tmp/relay-del.json
# expect: 200 or 204
```

Pass criteria:

1. `/health` 200
2. Create PUT with `If-Match: "0"` succeeds and returns `ETag`
3. Second PUT with stale `If-Match` returns **409** (not silent overwrite)
4. GET returns matching `ETag` and body
5. CORS still allows browser: response includes
   `Access-Control-Allow-Origin: *` and
   `Access-Control-Expose-Headers: ETag`

#### 4. Client spot-check

1. Point a **dev** device at `$RELAY` (or confirm default already is prod URL).
2. Enable sync with a throwaway sync code.
3. Sync on device A, change a card, sync on device B → no silent clobber.
4. Optional: force two near-simultaneous uploads → one may 409-retry once; both
   end consistent after refresh.

#### 5. Rollback

```bash
cd sync-relay
npx wrangler deployments list
npx wrangler rollback
# re-run section 3; expect no 409 if rolled back to pre-ETag worker
```

#### 6. Ops notes

- **Blob size:** worker rejects PUT body > **50 MB**; client download path
  rejects payloads > **5 MB**. Keep exports small; raise client cap only with
  a deliberate product change.
- **TTL:** set R2 lifecycle **90 days** since last update on `recall-sync-blobs`
  (dashboard or bucket config). Not enforced in worker code alone.
- **Secrets:** relay holds ciphertext only. No app secrets in `wrangler.toml`.
- **CORS:** intentionally `*`; safe because blobs are E2E ciphertext.
- After successful prod deploy, append a line to `docs/DEVLOG.md` with date,
  worker version / deployment id, and "S4 prod active".

### Self-hosting

Users who prefer self-hosted sync can point their client at a custom relay URL
via `Settings → Sync`. The relay only needs:

- GET/PUT/DELETE `/sync/:key` proxied to R2 (or equivalent object store).
- GET `/health` returning `200`.
- CORS headers wide open for PWA browser access.
- **Recommended:** same ETag / If-Match / 409 behavior as `sync-relay/src/worker.ts`
  so multi-device clients do not silent-clobber.

## Updater flow

1. On startup, `src/services/updater.ts` asks the Tauri updater plugin for the
   latest release tag.
2. If newer, download the platform-specific installer and verify the ed25519
   signature against `recall-updater.key.pub`.
3. If valid, prompt the user through the native installer.

The updater is only available in the Tauri desktop app; the PWA uses the
browser's native update cycle.

## Running tests

| Command | What |
|---|---|
| `pnpm test` | Vitest unit tests (771 tests, ~26% coverage floor) |
| `pnpm test:coverage` | + coverage report (`coverage/` artifact, not tracked) |
| `pnpm lint` | ESLint (warnings-only for `any`, errors for safety rules) |
| `npx tsc -b --noEmit` | TypeScript strict check |
| `pnpm e2e` | Playwright PWA specs |
| `cd src-tauri && cargo test` | Rust tests |
| `cd src-tauri && cargo clippy` | Rust lint |
| `cd src-tauri && cargo audit` | Rust dependency audit |
