# Recall — Maintenance Audit

**Date:** 2026-07-17  
**Auditor:** agent session (maintenance mandate)  
**Repo:** [Madlezz/Recall](https://github.com/Madlezz/Recall)  
**Baseline commit:** `176a54bf` (`main`, clean)  
**Release:** v1.1.0 (2026-07-04)

This file is the working map for maintenance. Update it after each batch (or append to `docs/DEVLOG.md`).

---

## 1. Executive summary

Repo is **not** raw vibe-code chaos. Recent sessions already shipped a real security/a11y/perf audit (`79ba715a`), batch DB writes, stats O(n) fix, mobile nav, design tokens, CI (lint + coverage + e2e + cargo audit + CodeQL), and solid docs under `docs/`.

**Health today**

| Check | Result |
|---|---|
| Unit tests | **778 / 778 pass** (50 files) |
| Typecheck | clean (`tsc -b --noEmit`) |
| Lint | **0 errors**, 130 warnings (`no-explicit-any`, almost all tests) |
| Coverage | **34.68% lines / 29.33% branches** (gates 32 / 28) |
| `pnpm audit --prod` | no known vulns |
| Open product issues | **none** |
| Open PRs | 3 Dependabot (all CI green) |
| Dependabot API alerts | 403 from this token (check GH Security UI) |

**Biggest remaining risks:** plaintext `syncCode` at rest, incomplete HTTPS enforcement on sync client, last-writer-wins relay, zero unit coverage on `sync-protocol.ts`, and docs claiming `sync-secret.ts` that was removed.

**Mandate stance:** no big rewrite. Small, high-impact fixes on branch + PR. Prefer security and truthfulness of docs over feature churn.

---

## 2. What was reviewed

- Vault: `00 Home`, `01 Current State`, `02 Project Map`, `SESSION_HANDOFF.md`
- Graphify: security / sync / crypto neighborhoods
- Source hotspots: `crypto.ts`, `sync-protocol.ts`, `repository.ts`, `import-export.ts`, `RichCard.tsx`, `sync-relay/src/worker.ts`
- Docs: README, SECURITY, ROADMAP, SYNC, ARCHITECTURE, CONTRIBUTING
- CI workflows, Dependabot PRs #47–#49, release list
- Local: `pnpm test`, `pnpm lint`, `pnpm test:coverage`, `pnpm audit --prod`

Not fully deep-read this pass: every UI component, full Rust DB surface, Anki parser edge cases. Source + graph route future work.

---

## 3. Architecture snapshot (truth)

```
User → React components → Zustand (recall-store + slices)
                         → repository (Dexie browser / Rusqlite Tauri)
                         → FSRS (ts-fsrs via fsrs-engine)
                         → crypto + sync-protocol (optional E2E relay)
                         → import-export (.recall / Anki / CSV / MD)
```

Key files: see root `AGENTS.md` architecture table. Do not reinvent that map here.

---

## 4. Findings

Severity: **C** critical · **H** high · **M** medium · **L** low · **I** info  
Status: open / partial / fixed (prior) / wontfix

### 4.1 Security

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| S1 | **H** | **`syncCode` stored in plaintext** → device-local AES-GCM wrap via `sync-secret.ts` on load/save. Not OS keychain yet. | `sync-secret.ts` + repository seal/unseal | **partial 2026-07-17** (wrap done; keyring later) |
| S2 | **H** | **Docs lie about at-rest protection.** `docs/SYNC.md` describes `sync-secret.ts` wrapping key in IndexedDB; file was removed (`f9a0d998` "orphaned sync-secret.ts") and is **absent**. | `docs/SYNC.md` L74–89; `test -f` → NO | open (docs + product) |
| S3 | **H** | **`enforceHttps` only on download path.** Fixed: upload/download/health/delete all use returned `safeUrl`. | `sync-protocol.ts` + `sync-protocol.test.ts` | **fixed 2026-07-17** |
| S4 | **M** | **Relay last-writer-wins.** → ETag/revision + If-Match + 1 retry on 409 in code (#56). Merge still full-snapshot (not CRDT). **Prod worker must be redeployed** for 409 to fire live. | `worker.ts` + `sync-protocol.ts` + `docs/DEPLOYMENT.md` checklist | **partial 2026-07-17** (code); **ops open 2026-07-18** |
| S5 | **M** | **DELETE + PUT authenticated only by knowledge of blob key** (SHA-256 of sync code). Expected for "code is the secret" design, but no rate-limit beyond CF defaults documented; no proof-of-possession beyond hash. | `worker.ts` | accepted design; document |
| S6 | **L** | **CORS `*`** on relay — required for browser PWA; fine because ciphertext only. | `worker.ts` | accepted |
| S7 | **partial** | Import hijack of device sync settings mitigated by `preserveDeviceSyncSettings`. | `repository.ts` + tests | fixed prior (`79ba715a`) |
| S8 | **partial** | Markdown path uses `rehype-sanitize` before katex; remote images blocked; `allowHtml` opt-in + raw plugin. | `RichCard.tsx` | good; keep order |
| S9 | **I** | Crypto primitives sound: AES-GCM-256, PBKDF2 600k, random salt/IV. | `crypto.ts` | good |

### 4.2 Correctness / reliability

| ID | Sev | Finding | Status |
|---|---|---|---|
| R1 | M | `mergeImportPayload` + full re-upload is the only conflict strategy — can drop concurrent card edits | open |
| R2 | L | Browser `localStorage` snapshot path non-atomic (documented) | accepted for preview |
| R3 | fixed | Settings clobber on deck optimize | prior audit |
| R4 | fixed | FSRS optimizer div-by-zero | prior audit |
| R5 | fixed | Image export catch swallowed errors | prior audit |

### 4.3 Testing & quality

| ID | Sev | Finding | Notes |
|---|---|---|---|
| T1 | **H** | **`sync-protocol.ts` coverage 0%** → happy-path unit tests landed (#51, 10 cases) | partial — expand further as needed |
| T2 | **H** | **`sync.ts` coverage** → unit tests landed (8 cases, 2026-07-18) | partial |
| T3 | M | `repository.ts` ~25% lines — bulk of persistence untested outside helpers | raise targeted tests |
| T4 | M | Coverage gate **35% lines / 35% stmts / 31% funcs / 29% branches** (ratchet 2026-07-18; measured ~36.4L) | keep bumping after test batches |
| T5 | M | E2E exists (`smoke`, `core-loop`, `card-crud`, `settings`) but no sync E2E | optional later |
| T6 | L | 130 `any` warnings concentrated in tests — `no-explicit-any` already error in `src` | defer mass cleanup |
| T7 | I | 778 tests, solid domain/lib coverage (`src/lib` ~95% lines) | keep |

### 4.4 Dependencies & CI

| ID | Sev | Finding | Action |
|---|---|---|---|
| D1 | L | Dependabot PR **#49** `react-i18next` 17.0.9→17.0.10 | merge after quick smoke |
| D2 | L | Dependabot PR **#48** dev group (vite, vitest, eslint, playwright, …) | merge; watch vite 8.1.x |
| D3 | L | Dependabot PR **#47** actions (setup-node v7, codeql, rust-toolchain) | merge |
| D4 | I | All three PRs currently **CI green** | |
| D5 | I | `pnpm audit --prod` clean locally | recheck after merges |
| D6 | I | Dependabot security alerts API 403 with current token | owner: check Security tab |

### 4.5 Docs & process

| ID | Sev | Finding | Action |
|---|---|---|---|
| Doc1 | **H** | SYNC.md documents non-existent `sync-secret.ts` as if present | **fixed 2026-07-17** (#50) |
| Doc2 | M | `SESSION_HANDOFF.md` partially corrupted / stale vs `git log` | rewrite after next real session |
| Doc3 | M | Vault `01 Current State` lagging (mentions mid-audit dirty tree) | human/vault refresh |
| Doc4 | L | No `docs/AUDIT.md` / `docs/DEVLOG.md` before this file | this file |
| Doc5 | I | README, ARCHITECTURE, SECURITY, ROADMAP generally good | keep prose ASCII dashes |

### 4.6 Product / roadmap (not bugs)

From `ROADMAP.md` + gaps:

- Native mobile still open (PWA exists)
- Auto-detect iCloud/OneDrive folder
- More locales (es/pt/zh/ja) — after string churn slows
- Concurrent sync UX (S4)
- Biometrics / widgets — later

Do **not** start native mobile in maintenance mode without user demand.

---

## 5. Priority backlog (impact × effort)

Score: impact 1–5, effort 1–5 (lower effort better). **Do first = high impact, low effort.**

| Pri | ID | Work | Impact | Effort | Why |
|---|---|---|---|---|---|
| ~~P0~~ | S3 | HTTPS on all relay entrypoints | 5 | 1 | **done** #50 |
| ~~P0~~ | Doc1 | SYNC.md at-rest honesty | 4 | 1 | **done** #50 |
| ~~P1~~ | T1 | Unit tests for `sync-protocol` happy paths | 5 | 2 | **done** #51 (10 cases) |
| **P1** | S1 | At-rest `syncCode`: WebCrypto wrap + IndexedDB key **landed** #55; ceiling = OS keyring / Tauri stronghold | 5 | 3 | Device key still in IDB/localStorage |
| ~~P1~~ | S4 code | ETag/If-Match + 409 retry | 4 | 3 | **done** #56 |
| **P3** | S4 ops | Redeploy public relay | - | - | **deferred (no owner-paid infra)** - self-host checklist only |
| **P3** | S4 ceiling | Field-level CRDT / smarter merge (beyond full-snapshot LWW) | 3 | 5 | Only if multi-device clobber still hurts after ops |
| ~~P2~~ | D1–D3 | Merge Dependabot #47/#49 + manual #52 for #48 | 2 | 1 | **done** |
| ~~P2~~ | Alert #9 | `serde_with` 3.21.0 | 3 | 1 | PR #53 |
| **P2** | T3 | Targeted `repository` tests for snapshot preserve + batch move/upsert | 3 | 2 | Perf path already landed |
| ~~P2~~ | T4 | Ratchet coverage gate | 2 | 1 | **done 2026-07-18** lines/stmts 35, funcs 31, branches 29 |
| **P3** | Doc2 | Refresh `SESSION_HANDOFF.md` | 2 | 1 | Agent efficiency |
| **P3** | T6 | Chip away test `any`s | 1 | 3 | Noise only |
| **P3** | Roadmap | Extra locales / folder auto-detect | 3 | 4 | Product, not firefight |

### Explicit non-goals this quarter

- Plugin system / AnkiConnect clone
- Rewrite state management
- Raising `any` to error inside tests overnight
- Full native iOS/Android port without product owner

---

## 6. Execution plan (batches)

### Batch A — truth + HTTPS (this / next session)

1. Branch from `main` (not direct push).
2. `enforceHttps` on all client network entrypoints in `sync-protocol.ts`.
3. Tests: reject `http://` relay for upload/health/delete paths.
4. Rewrite SYNC.md device-local section: **not enforced**; link this audit + planned S1.
5. PR: `fix(sync): enforce HTTPS on all relay calls + docs truth`.

### Batch B — sync tests + coverage ratchet

1. Mock `fetch` tests for happy path upload-only and download-merge-upload.
2. Assert `validateDecryptedPayload` rejects garbage.
3. Bump vitest thresholds slightly if green.

### Batch C — Dependabot

1. Merge #49, #47, then #48 (dev churn last).
2. Re-run local test + build.

### Batch D — syncCode at rest (design first)

1. Spec in AUDIT/DEVLOG: wrap key in IndexedDB (web) / keyring plugin (Tauri).
2. Migrate existing plaintext once on load.
3. Never write `syncCode` into export payloads (already stripped — keep tests).

### Batch E — relay concurrency

1. Store `revision` metadata on R2 object.
2. Client sends `If-Match`; worker returns 409.
3. Client re-downloads, re-merges, retries once.

---

## 7. Suggested first PR scope (narrow)

**Do not** implement S1+S4 in the same PR as docs. First PR after this audit file:

- HTTPS fix + SYNC.md honesty + AUDIT.md (this file) + DEVLOG stub entry.

---

## 8. Metrics to re-check each batch

```bash
pnpm test
pnpm test:coverage   # note All files % Lines / % Branch
pnpm lint            # errors must stay 0
npx tsc -b --noEmit
pnpm audit --prod
```

Record in `docs/DEVLOG.md`:

- commit SHA
- test count
- coverage %
- what closed from this backlog

---

## 9. Verdict

Recall is **maintainable and already past the "zero tests" vibe stage**. Highest ROI work is **closing the gap between security story and code** (S1–S3, Doc1) and **putting a test harness around sync** (T1). Everything else is polish or roadmap.

Next agent: start **Batch D (S1 syncCode at rest)** unless product owner reprioritizes.
