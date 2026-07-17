# AGENTS.md - Recall Flashcard App

## HARD GATE: session bootstrap (do this before coding)

**Obsidian vault + Graphify exist so agents burn fewer tokens.** Soft "efficiency notes" are not enough. **Skipping this gate is a process failure.**

### Before the first tool call that explores or edits product code

1. **Read vault home**  
   `C:\Users\nnand\Documents\Obsidian\RecallFlashcard\00 Home.md`
2. **Read project map** (or Current State if you only need status)  
   `C:\Users\nnand\Documents\Obsidian\RecallFlashcard\02 Project Map.md`  
   optional: `01 Current State.md`, `SESSION_HANDOFF.md` (repo root)
3. **Route via Graphify before broad search**  
   - Binary: `graphify` (on PATH, often `~/.local/bin/graphify`)  
   - Graph data: repo `graphify-out/` and/or vault `graphify-out/`  
   - Prefer: `graphify query "<your question>"` (from repo root)  
   - Then `rg`/`grep` only on files the graph (or map) pointed at  
   - **Do not** open with multi-file parallel Read of random `src/**` when the map already names the file
4. **Only then** read source and change code
5. **After meaningful code edits** (not pure docs/typo):  
   `graphify update .` from repo root when available; keep vault copy in sync if that is part of your handoff

### Why this is mandatory

- Vault = human/project map (architecture, conventions, active work)
- Graphify = symbol/call/import graph (blast radius)
- Source still wins for truth; vault/graph **route** you so you do not re-discover the tree every session

### Explicitly forbidden

- Ignoring vault/graph because "I know the stack" or "simple task"
- Parallel-reading many large files to "orient" when Home + Project Map already orient
- Treating the Obsidian section at the bottom of this file as optional flavor text

### Playbook (full detail)

`C:\Users\nnand\Documents\Obsidian\RecallFlashcard\Agent Tooling\Obsidian and Graphify Playbook.md`

### Paths (Windows)

| What | Path |
|------|------|
| Vault | `C:\Users\nnand\Documents\Obsidian\RecallFlashcard\` |
| Repo graph | `graphify-out/` (in this repo) |
| Vault graph mirror | vault `graphify-out/` |
| Session handoff | `SESSION_HANDOFF.md` (repo root) |

If vault or `graphify` is missing on this machine: state that once, then fall back to `02 Project Map` architecture table in this file + targeted `rg`. Do not silently skip forever.

---

## Project

React + TypeScript + Vite frontend, Tauri desktop backend. FSRS spaced repetition (`ts-fsrs`). Zustand state, Dexie (browser) / Rusqlite (Tauri) persistence.

## Architecture-at-a-glance

| Concern | File |
|---|---|
| State | `src/stores/recall-store.ts` (Zustand store), slices in `src/stores/slices/` |
| Repo layer | `src/services/repository.ts` (DB abstraction, import/export/migrate) |
| DB schema | `src/db/schema.ts` |
| Crypto (E2E sync) | `src/services/crypto.ts` AES-GCM, PBKDF2 |
| FSRS scheduling | `src/services/fsrs-engine.ts` (`applyReview`, `previewIntervals`) |
| FSRS optimizer | `src/services/fsrs-optimizer.ts` |
| Import/export | `src/services/import-export.ts` `.recall` format, parse/validate/merge |
| Sync protocol | `src/services/sync-protocol.ts` encrypted upload/download to relay |
| Sync folder | `src/services/sync.ts` local folder sync |
| i18n | `src/lib/i18n.ts` (i18next, en+id), locales in `src/locales/` |
| Design tokens | `src/index.css` (CSS custom props) 3 themes: light/dark/high-contrast |

## Key patterns

- Zustand store: `dataState(get())` then destructure `{ decks, cards, settings, ... }` for persistence shape.
- Settings updates: `updateSettings(partial)` merges into existing settings. **Never pass full objects that clobber user prefs.**
- DB writes use `saveSnapshot(snapshot)` (full wipe+insert) or `saveSettings(settings, state)` (targeted). Both take the full `RecallStateSnapshot` shape for safety.
- i18n: `t("namespace.key")`. Plural keys use `_one`/`_other` (NOT legacy `_plural`).
- Tauri-only: dynamic-import Tauri modules inside try/catch. Browser fallback must not throw.
- **Security:** `syncCode` = E2E key material. Never serialize into exports. `preserveDeviceSyncSettings()` in `repository.ts` protects device creds from import override.
- **Prose:** avoid em dash (U+2014) and en dash (U+2013) in agent-written docs/README; use ASCII `-` or rewrite the sentence.

## Testing

```bash
pnpm test          # vitest (count drifts; run to verify)
npx tsc -b --noEmit # typecheck
pnpm lint          # eslint
pnpm test:e2e      # playwright (starts pnpm dev via config)
```

## Agent efficiency (after bootstrap)

- Avoid re-reading files you just edited. Edit tool confirms success from context.
- `rg -n` / `grep -n` to find exact lines before reading big files; do not Read whole 600-line files when you need 20 lines.
- Prefer 1-2 focused subagents over 4 parallel (each burns huge context).
- Big files (>500 lines without headers): read once at opening, use grep thereafter.
- Prefer vault + graphify over inventing a second architecture narrative.

## GitHub account

This repo is **Madlezz/Recall**. Prefer `gh` as user `Madlezz` for PRs/issues/pushes that affect this repo.

## Cost / infra (HARD)

**Maintainer does not pay for hosted infra on this open-source project.**

- **Do not** deploy, renew, or operate **owner-billed** cloud services (Cloudflare paid plans, custom domain DNS that bills the maintainer, paid Workers/R2 beyond free-tier play if it risks charges, hosted DBs, paid CI minutes beyond free GitHub Actions, etc.) unless the human **explicitly** says they accept the bill.
- Default for sync: **self-host** (`sync-relay/` + user CF account) or **local folder sync** / file export. Code + docs for a public relay are fine; **running** a maintainer-funded production relay is **out of scope**.
- Agents: if a task needs paid deploy, **stop**, document the checklist, mark backlog **deferred (no owner-paid infra)**, pick free work (tests, security-in-app, docs, self-host guides).
- Free-tier experiments only when the human opts in and understands limits; never assume free forever.
- Prefer features that work offline / on-device. Cloud is optional, never a paid maintainer dependency.
