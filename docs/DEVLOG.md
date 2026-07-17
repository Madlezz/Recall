# Recall — Dev Log

Append-only. Newest first.

---

## 2026-07-18 — Batch H: self-host-first cloud sync

**Branch:** `feat/self-host-sync-first`

### Done

- `getDefaultRelayUrl()` returns empty - no maintainer public relay
- `resolveRelayUrl()` requires non-empty HTTPS before any sync call
- Settings UI: relay URL required up front; self-host hint; save relay when paired
- i18n en/id: relayRequired, selfHostHint, saveRelay, copy update
- Tests: empty default, resolveRelayUrl, fail-fast missing URL (13 pass)
- AGENTS.md Cost / infra + SYNC.md self-host wording

### Product model

Ship the **feature** (`sync-relay/` + client). Users own the bill (free tier OK).
Folder/file sync still works with zero cloud.

### Next

1. More free tests / handoff refresh
2. S1 ceiling (keyring) only if wanted later - still free/on-device

---

## 2026-07-18 — Batch G: coverage ratchet (T4)

**Branch:** `chore/coverage-ratchet`

### Done

- Measured `pnpm test:coverage` after #51/#55/#56: **796** tests,
  All files ~ **Stmts 35.63 / Branch 30.33 / Funcs 31.78 / Lines 36.37**
- Ratchet vitest thresholds: lines 32→**35**, statements 32→**35**,
  functions 28→**31**, branches 28→**29** (~0.5pt under floor)
- Exclude `sync-relay/**` from vitest discovery so local `npm install` there
  cannot pull wrangler tests into app suite

### Next

1. Free work: more service tests (`repository.ts`, `sync-secret.ts`, `sync.ts`)
2. S1 ceiling (keyring) only if wanted later - still free/on-device

---

## 2026-07-18 — Batch F: relay production deploy checklist (S4 ops)

**Branch:** `docs/relay-deploy-checklist`

### Done

- Expand `docs/DEPLOYMENT.md` Sync Relay section: preconditions, deploy,
  post-deploy curl smoke (ETag create + 409 stale + GET + DELETE), client
  spot-check, rollback via `wrangler rollback`, size/TTL/CORS notes
- Align `sync-relay/README.md` API with ETag/If-Match/409 + link full checklist
- Fix default URL typo (`sync.recall-app` → `sync.recall.app`)
- Document client 5 MB download vs worker 50 MB PUT caps honestly
- AUDIT: S4 note + ops open for **prod deploy** (code already on main #56)

### Policy (2026-07-18)

- **No owner-paid infra.** Maintainer does not fund Cloudflare/prod relay.
- S4 ops public deploy = **deferred**. Checklist remains for **self-hosters**.
- Rules written: `AGENTS.md` Cost / infra + vault Product and Engineering Rules.

### Not done (intentionally)

- Maintainer `wrangler deploy` / live `sync.recall.app` ops

### Next

1. Free work only: S1 keyring-in-app ceiling / coverage ratchet / handoff docs
2. Self-hosters: use DEPLOYMENT checklist on **their** CF account

---

## 2026-07-17 — Batch E: relay ETag concurrency (S4 partial)

**Branch:** `feat/sync-relay-etag`

### Done
- Worker: revision in R2 metadata, GET ETag, PUT If-Match, 409 on stale
- Client: send If-Match from GET; retry once on SyncConflictError
- Tests: If-Match on create/update + 409 retry path
- Docs: SYNC/AUDIT/DEVLOG

### Ceiling
- Full-snapshot merge still LWW at field level; no CRDT
- Deploy relay to production separately after merge

---

## 2026-07-17 — Batch D: syncCode at rest (S1 partial)

**Branch:** `feat/sync-code-at-rest`

### Done
- New `src/services/sync-secret.ts` — AES-GCM wrap (`enc:v1:`), device key in IndexedDB + localStorage mirror
- Repository load/save seals disk snapshot; memory stays plaintext
- Legacy plaintext migrates on next save
- Tests: 7 new (`sync-secret.test.ts`); suite **795** pass

### Ceiling / next
- OS keyring / Tauri stronghold for device wrapping key
- S4 relay ETag concurrency still open

---

## 2026-07-17 — Maintenance session (Batches A–C + security)

**Main tip after merges:** `3eb6da0a` (+ pending #53)

### Merged
| PR | What |
|---|---|
| #50 | Audit map + HTTPS all relay calls + SYNC.md truth |
| #49 | `react-i18next` 17.0.10 |
| #47 | GitHub Actions group bumps |
| #51 | sync-protocol tests 4 → 10 (first upload, merge, delete, garbage) |
| #52 | Manual dev-deps bump (supersedes conflicted #48) |
| #53 | `serde_with` 3.21.0 — GHSA-7gcf-g7xr-8hxj / Dependabot #9 *(open at write-time)* |

### Metrics
- Tests: **788** pass (after #51)
- Coverage gate still 32% lines / 28% branches
- Lint: 0 errors

### Still open (next)
1. **S1** — `syncCode` at-rest wrap (IndexedDB / keyring)
2. **S4** — relay ETag / revision concurrency
3. Coverage ratchet after more service tests
4. Confirm Dependabot alert #9 closes after #53

### Notes
- `gh` must use account **Madlezz** (not EasyUMKM) for merge/PR create on this repo
- Dependabot #48 closed as superseded by #52

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
