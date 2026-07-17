# Recall — Dev Log

Append-only. Newest first.

---

## 2026-07-17 — Maintenance audit (Batch A start)

**Branch:** `docs/audit-2026-07-17`  
**Baseline:** `176a54bf` on `main`

### Done
- Full maintenance audit → [`docs/AUDIT.md`](./AUDIT.md)
- P0 S3 fixed: HTTPS on upload/download/health/delete (`enforceHttps` → `safeUrl`)
- SYNC.md at-rest section rewritten (no phantom `sync-secret.ts`)
- New tests: `src/services/__tests__/sync-protocol.test.ts` (4 cases)
- Suite: **782** tests pass (+4), typecheck clean

### Still open
See AUDIT.md backlog: S1 (syncCode at rest), S4 (relay concurrency), T1 full merge-path tests, Dependabot #47–#49
