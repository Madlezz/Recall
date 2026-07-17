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

### Deploy

```bash
cd sync-relay
wrangler deploy
```

Requires:

- A Cloudflare account with an **R2 bucket** named `RECALL_SYNC`.
- `wrangler.toml` references the bucket binding.
- POSTDEPLOY: set `CORS` and blob TTL lifecycle rules (90 days) in the R2
  bucket dashboard (or via Wrangler bucket config).

The relay runs at `https://sync.recall-app` by default (configurable per
device in **Settings → Sync**).

### Self-hosting

Users who prefer self-hosted sync can point their client at a custom relay URL
via `Settings → Sync`. The relay only needs:

- GET/PUT/DELETE `/sync/:key` proxied to R2.
- GET `/health` returning `200`.
- CORS headers wide open for PWA browser access.

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
