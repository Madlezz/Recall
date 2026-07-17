# Architecture

System overview for contributors. The visual design system lives in
[`DESIGN.md`](../DESIGN.md); the contribution workflow in
[`CONTRIBUTING.md`](../CONTRIBUTING.md). This document covers data flow, module
boundaries, and the two runtimes.

## Overview

Recall is a flashcard app with **FSRS** spaced-repetition scheduling. It runs in
two modes from one codebase:

- **Web / PWA** — React + Vite, persisted in the browser via Dexie (IndexedDB).
- **Desktop** — Tauri v2 shell wrapping the same web UI, persisted via SQLite
  (Rusqlite) accessed through Rust atomic commands.

The shared core is plain TypeScript with no runtime dependency on either host,
so the bulk of logic is testable in isolation (see `vitest.config.ts`).

```
┌─────────────────────────────────────────────────────────────┐
│  React UI (src/components, src/App.tsx)                      │
│  hooks (src/hooks) · i18n (src/lib/i18n.ts)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ reads/writes
┌───────────────────────────▼─────────────────────────────────┐
│  Zustand store (src/stores/recall-store.ts + slices/)        │
│  - RecallStateSnapshot (decks, cards, reviewLogs,            │
│    studySessions, settings)                                  │
│  - action methods (startReview, answerCurrentCard, …)        │
└───────────────────────────┬─────────────────────────────────┘
                            │ via store-helpers
┌───────────────────────────▼─────────────────────────────────┐
│  Repository (src/services/repository.ts)                     │
│  RecallRepository interface → saveSnapshot / upsert* /       │
│  queryCards / loadReviewLogs / mergeDataFromImport          │
└───────────────┬───────────────────────────┬─────────────────┘
                │                            │
   ┌────────────▼───────────┐    ┌───────────▼──────────────────┐
   │ Browser: Dexie         │    │ Tauri: SqlExecutor (read) +  │
   │ (src/db/client.ts)     │    │ Rust atomic commands (write) │
   │                        │    │ (db_atomic.rs)               │
   └────────────────────────┘    └──────────────────────────────┘
```

## Layers

| Layer | Location | Responsibility |
|---|---|---|
| UI | `src/components/*` | Render state, capture user input, fire store actions. |
| State | `src/stores/recall-store.ts`, `src/stores/slices/*` | Single source of truth (`RecallStateSnapshot`) + actions. |
| Repository | `src/services/repository.ts` | Persistence abstraction. Knows nothing about UI. |
| DB drivers | `src/db/client.ts`, mappers in `src/db/mappers.ts` | Translate rows ↔ domain types; runtime detection. |
| Domain logic | `src/lib/*` (`stats`, `fsrs-engine`, `xp`, `cloze`, `domain`) | Pure functions, fully unit-tested. |
| Services | `src/services/*` | FSRS scheduling, crypto, sync, import/export, storage, audio, notifications. |
| Types | `src/types.ts` | Shared domain types (Deck, Card, ReviewLog, RecallSettings, …). |

### Store composition

`recall-store.ts` merges the snapshot shape with four slices:

- `navigationSlice` — current view / selection.
- `deckCardSlice` — deck & card CRUD, study session lifecycle.
- `settingsSlice` — `updateSettings(partial)` (merges, never clobbers).
- `savedSearchSlice` — saved filters.

`store-helpers.ts` exposes `dataState()` (extract the persistable subset) and
the `persist*` helpers. **Persist the full `RecallStateSnapshot` shape** even for
targeted writes — `saveSettings` / `saveSnapshot` take the whole snapshot for
safety.

### Persistence model

- **Browser**: `DexieRecallRepository` (IndexedDB). `saveSnapshot` wipes + re-inserts.
- **Tauri**: reads go through `SqlExecutor` (`src/db/client.ts`); **writes go
  through Rust atomic commands** (`src-tauri/src/db_atomic.rs`) so multi-statement
  operations get real `BEGIN IMMEDIATE / COMMIT / ROLLBACK`. The JS `transaction()`
  path is only the browser fallback.
- Per-review persistence uses `persistReviewDelta` (targeted `UPDATE`/`INSERT`),
  which is far cheaper than a full `saveSnapshot`.

The DB schema is owned by Tauri SQL migrations in `src-tauri/src/lib.rs`; the TS
side has no schema file by design (`src/db/schema.ts` is intentionally empty).

## Runtimes

| Concern | Browser | Tauri |
|---|---|---|
| Storage | Dexie / IndexedDB | Rusqlite via Rust `invoke()` |
| FS access | none | `@tauri-apps/plugin-fs` (dynamic import, try/catch) |
| Notifications | Web API | Tauri plugin, fallback to Web |
| Scheduling | `setTimeout` / Web Worker | native timer |
| Auto-update | PWA SW | Tauri updater (ed25519-signed) |

Tauri-only modules are **dynamically imported inside try/catch**; the browser
fallback must never throw. See `src/services/sync.ts` (folder sync) and
`src/services/updater.ts`.

## Sync

Recall supports two independent sync paths (see [`SYNC.md`](./SYNC.md) for the
protocol details):

1. **Encrypted relay** (`src/services/sync-protocol.ts`) — E2E-encrypted blobs
   uploaded to a Cloudflare Worker (`sync-relay/`). The server never sees
   plaintext or the key.
2. **Folder sync** (`src/services/sync.ts`) — Tauri-only; writes
   `recall-sync.json` to a user folder (Dropbox/Drive), merges on import.

`import-export.ts` is the shared merge/parse/validate engine for both: it
produces `RecallExportPayload` and `mergeImportPayload`. **Security boundary:**
`preserveDeviceSyncSettings()` in `repository.ts` strips `syncCode`,
`syncRelayUrl`, and `syncEnabled` from any imported payload so a restore never
overrides the device's own sync credentials.

## FSRS scheduling

`src/services/fsrs-engine.ts` (`applyReview`, `previewIntervals`) and
`src/services/fsrs-optimizer.ts` wrap `ts-fsrs`. Card scheduling fields
(`stability`, `difficulty`, `state`, `nextReviewDate`, …) live on `Card` in
`src/types.ts`.

## Testing layout

- `*.test.ts(x)` colocated next to the code they cover (e.g. `src/lib/__tests__/`).
- Domain logic and services are pure → unit-tested without a DOM.
- `e2e/` holds Playwright specs against the built PWA.
- `src-tauri/tests/large_deck_benchmark.rs` is a Rust perf benchmark (not CI-run).

## Key invariants

- `updateSettings(partial)` must **merge**, never replace full settings objects.
- DB writes always go through the repository interface, never raw SQL from JS on
  Tauri (writes are Rust-side).
- `syncCode` is E2E key material — never serialize it into exports or logs.
- i18n strings: `t("namespace.key")`; plurals use `_one` / `_other`.
