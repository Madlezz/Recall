## Summary

Resolves the final 5 audit items from the v1.0.11 security audit.

## Changes

### A3/A4: Database architecture clarification
- Updated `src/db/client.ts` comment to clarify that the executor is **read-only in production**
- All writes go through Rust atomic commands (`upsert_*_atomic`, `save_snapshot_atomic`, etc.)
- The `transaction()` method is only used by the browser/preview fallback

### A8: Filesystem least-privilege scope
- Added explicit fs scope to `src-tauri/capabilities/default.json`
- Restricted to `$APPDATA/**` (app data dir for images/backups)
- Dialog-selected paths auto-granted by Tauri dialog plugin

### A9: LRU cache verification
- Confirmed image cache implementation is already correct (uses `delete` + `set` for reordering)
- Existing tests in `src/services/__tests__/images.test.ts` validate LRU behavior

### A12: Coverage threshold + benchmark
- Added vitest coverage with v8 provider (70% threshold for lines/functions/branches/statements)
- Added `test:coverage` script to package.json
- Updated CI workflow to run coverage
- Added benchmark test stub documenting performance expectations (full 10k card test requires Tauri runtime)

### R2: OS code signing documentation
- Added "Code Signing Status" section to SECURITY.md
- Documented Windows SmartScreen and macOS Gatekeeper bypass instructions
- Explained that binaries are updater-signed (ed25519) but not OS-signed

## Testing

All checks pass:
- ✅ `pnpm test` — 168 tests
- ✅ `pnpm exec tsc -b` — TypeScript clean
- ✅ `pnpm lint` — 0 warnings (coverage/ directory excluded)
- ✅ `cargo clippy -- -D warnings` — no issues
- ✅ `cargo test` — 4 tests pass

## Verification

- [ ] Image insert/export/import works with restricted fs scope
- [ ] Backup/restore works with restricted fs scope
- [ ] Coverage report generates correctly in CI
