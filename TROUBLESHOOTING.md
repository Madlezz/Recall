# Troubleshooting

Quick answers for the most common failure modes while developing or deploying
Recall.

## `fnm: command not found` / Node version errors

Git Bash on Windows prompts fnm to evaluate `fnm env` on every command. If
`.node-version` is set but fnm isn't initialized, you'll see:

```
We can't find the necessary environment variables to replace the Node version.
```

Fix: activate fnm in your shell profile, or use Node directly for this project.

```bash
# Option A — add to ~/.bashrc or ~/.zshrc, then restart shell
eval "$(fnm env)"

# Option B — bypass profile, run directly (no pnpm cache benefits)
bash --noprofile --norc -c "pnpm test"
```

`.node-version` in the repo root pins the expected version; CI uses
`setup-node@22`.

## Tauri desktop build fails on Linux

Missing GTK / indicator / SVG / patchelf packages:

```bash
# Ubuntu / Debian
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

The release workflow (`release.yml`) installs these on the `ubuntu-22.04` runner.

## Build fails on macOS — code signing warnings

`tauri.conf.json` has `"certificateThumbprint": null` for Apple builds.
Expect "unidentified developer" / SmartScreen warnings until OS-level code
signing is configured (requires Apple Developer account). Updater signing
(ed25519) still works.

## Android emulator doesn't start (low RAM)

The Android emulator needs ≥4 GB RAM. If virtualized memory is constrained
(Windows host with limited RAM), the emulator process may hang or fail to boot.
Close other memory-intensive apps or use a smaller AVD profile.

## Sync fails — "Sync relay must use HTTPS"

The client **requires** HTTPS for the relay URL. If you're testing locally with
`http://localhost:8787`, either add it as a tunnel (e.g. `ngrok https`) or
bypass the check in dev only. The `enforceHttps` guard is in
`src/services/sync-protocol.ts:150`.

## Sync — first device returns 404, nothing to merge

That is **expected** on a brand-new sync code. The server returns `404` when no
blob exists yet; the client uploads the local snapshot as the initial blob.

## Sync — "Sync payload exceeds maximum size (5MB)"

Blobs larger than ~5 MB are rejected. Trim large `.recall` exports, or import
individual decks. The cap is controlled in `sync-protocol.ts:120`.

## Sync — stale blobs / "no data yet" disappears

Blobs on the relay have a **90-day TTL** since last write. If neither device
synced within that window, the blob is garbage-collected by the R2 lifecycle
rule. Re-sync manually.

## Sync — merge overwrites device sync credentials

If a `.recall` file restores the wrong `syncCode`, `preserveDeviceSyncSettings()`
in `repository.ts` strips `syncCode`, `syncRelayUrl`, and `syncEnabled` during
import, so the device keeps its own credentials. If you see sync stop working
after a restore, check that the stored `syncCode` in settings matches the one
entered at the prompt.

## Tests fail — coverage gate below the floor

`vitest.config.ts` enforces a coverage floor (~26% lines, ratcheted). Empty
test files, skipped coverage, or deleted tests will fail CI. Run
`pnpm test:coverage` locally first to see the report and identify the shortfall.

## Tests fail — Dexie/IndexedDB not available

Most unit tests don't load the persistence layer; the store is initialized via
a mock in `src/test-setup.ts`. If a test imports `repository.ts` directly it
needs the live DB or a stub — refactor the test to mock the repository
interface instead of hitting IndexedDB.

## PWA doesn't pick up new version

Service Worker caches the old shell. The `pwa-update-prompt` component should
show a banner when the SW detects a new version. If it doesn't, the SW install
may be blocked (another SW still controlling the page, or devtools "Update on
reload" is off).

## TypeScript build errors after pulling

```bash
pnpm install          # update lockfile / deps
npx tsc -b --noEmit   # surface errors in one pass
```

If `tsconfig.app.tsbuildinfo` is stale (cached after merge conflicts), delete it
before rebuilding — it lives at the repo root.

## Rust tests or cargo audit fail on Tauri transitive advisories

`src-tauri/.cargo/audit.toml` carries an allow-list for known Tauri v2
transitive advisories that have no upstream fix yet. Re-evaluate the list on
each Tauri minor release bump. The Rust CI jobs are `rust-quality` (fmt,
clippy, tests) and `rust-audit` in `.github/workflows/ci.yml`.

## Git stash / PR has staged screenshot deletes from another repo

The `docs/screenshots/` folder is a monorepo artifact. Before stashing or
committing screenshots, confirm they are the only diff. If `git status` shows
`RD screenshot-focus-timer.png` etc. but the file doesn't exist yet in your
working tree, the deletes are from a different clone that already moved them.

## GitHub Releases shows only the SHA256SUMS, not installers

Confirm **all** required repo secrets are set:
`TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Without
them the signing step fails and the release job may publish only the checksum.
