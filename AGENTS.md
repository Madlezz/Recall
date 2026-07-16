# AGENTS.md — Recall Flashcard App

## Project
React + TypeScript + Vite frontend, Tauri desktop backend. FSRS spaced repetition (ts-fsrs). Zustand state, Dexie (browser) / Rusqlite (Tauri) persistence.

## Architecture-at-a-glance
| Concern | File |
|---|---|
| State | `src/stores/recall-store.ts` (Zustand store), slices in `src/stores/slices/` |
| Repo layer | `src/services/repository.ts` (DB abstraction, import/export/migrate) |
| DB schema | `src/db/schema.ts` |
| Crypto (E2E sync) | `src/services/crypto.ts` — AES-GCM, PBKDF2 |
| FSRS scheduling | `src/services/fsrs-engine.ts` (`applyReview`, `previewIntervals`) |
| FSRS optimizer | `src/services/fsrs-optimizer.ts` |
| Import/export | `src/services/import-export.ts` — `.recall` format, parse/validate/merge |
| Sync protocol | `src/services/sync-protocol.ts` — encrypted upload/download to relay |
| Sync folder | `src/services/sync.ts` — local folder sync |
| i18n | `src/lib/i18n.ts` (i18next, en+id), locales in `src/locales/` |
| Design tokens | `src/index.css` (CSS custom props) — 3 themes: light/dark/high-contrast |

## Key patterns
- Zustand store: `dataState(get())` → destructure `{ decks, cards, settings, ... }` for persistence shape.
- Settings updates: `updateSettings(partial)` merges into existing settings. **Never pass full objects that clobber user prefs.**
- DB writes use `saveSnapshot(snapshot)` (full wipe+insert) or `saveSettings(settings, state)` (targeted). Both take the full `RecallStateSnapshot` shape for safety.
- i18n: `t("namespace.key")`. Plural keys use `_one`/`_other` (NOT legacy `_plural`).
- Tauri-only: dynamic-import Tauri modules inside try/catch. Browser fallback must not throw.
- **Security:** `syncCode` = E2E key material. Never serialize into exports. `preserveDeviceSyncSettings()` in `repository.ts` protects device creds from import override.

## Testing
```bash
pnpm test          # vitest, 771 tests
npx tsc -b --noEmit # typecheck
pnpm lint          # eslint (warnings-only for any)
playwright:pwa     # e2e browser
```

## Agent Efficiency Notes
- Avoid re-reading files you just edited — Edit tool confirms success from context.
- `grep -n` to find exact lines before reading big files; don't Read whole 600-line files when you need 20 lines.
- Prefer 1-2 focused subagents over 4 parallel (each burns ~600k tokens).
- Big files (>500 lines without headers): read once at opening, use grep thereafter.

## Obsidian Vault + Graphify
- **Vault:** `C:\Users\nnand\Documents\Obsidian\RecallFlashcard\`
- **Graph:** `graphify-out/graph.json` (1691 nodes, 3581 edges, 169 communities)
- **Workflow:** Read vault → `00 Home.md` → `02 Project Map.md` → `graphify query "<question>"` → `grep` → read source → verify
- **After changes:** `graphify update .` → copy `graphify-out/` to vault
- **Playbook:** `Agent Tooling/Obsidian and Graphify Playbook.md` in vault
- **Session handoff:** `SESSION_HANDOFF.md` — latest changes, test counts, remaining items
