# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- A3/A4: Clarified DB architecture in `src/db/client.ts` — all writes go through Rust atomic commands, executor is read-only in production
- A8: Added explicit fs scope to Tauri capabilities — restricted to `$APPDATA/**` and dialog-selected paths
- A12: Added coverage threshold (70% lines/functions/branches/statements) and benchmark test stub

### Fixed
- A9: Verified LRU cache implementation is correct (already uses delete+set for reordering)
- R2: Documented OS code signing status in SECURITY.md (binaries not OS-signed, only updater-signed)

## [1.0.11] - 2026-06-21

### Added
- R2: `bundle.createUpdaterArtifacts: true` — auto-generates `latest.json` + `.sig` files for updater
- R4: CodeQL Rust analysis — separate job for Rust security scanning alongside JS/TS
- A5: Anki import now warns when media files (images/audio) are detected but not transferred

### Changed
- A2: Wired `query_cards` into card browser UI — DB-side pagination instead of loading all cards
- A7: `chrono_lite_timestamp()` uses milliseconds + atomic counter (collision-proof)
- R1: Cargo-audit ignores moved to `src-tauri/.cargo/audit.toml` with per-line justification

### Fixed
- R9: Download table in README corrected (msi/AppImage only, removed .exe/.deb)
- Lint: 0 warnings — disabled `react-refresh/only-export-components` for UI primitives
- Rust: Fixed borrow checker issue in Anki import with explicit `drop()` calls

## [1.0.9] - 2026-06-20

### Added
- Release signing: Tauri updater plugin with ed25519 key verification
- CI: SHA256SUMS generation for all release assets
- CI: Signed updater bundles via `TAURI_SIGNING_PRIVATE_KEY` secret

### Changed
- Pinned tailwindcss to v3.4.19 (v4 has breaking PostCSS changes)
- TypeScript 7 compatibility: added `ignoreDeprecations` for `baseUrl`
- Vite: `manualChunks` converted from object to function (Rollup v5)
- CSS module declarations in `src/vite-env.d.ts` for TypeScript strictness

### Fixed
- Rust formatting drift (`cargo fmt`)
- ESLint: disabled new `react-hooks/set-state-in-effect` and `preserve-manual-memoization` rules that flagged legitimate form initialization patterns
- Clippy: allow `too_many_arguments` on `query_cards` (8 params, Tauri command)
- Lockfile regenerated after tailwind downgrade

## [1.0.8] - 2026-06-20

### Added
- A2: DB-side card query command (`query_cards`) with filtering, sorting, pagination
- SQL WHERE clauses for `deck_id`, `state`, search (LIKE on front/back/hint/tags)
- Dynamic ORDER BY with validated sort fields (prevents SQL injection)
- LIMIT/OFFSET pagination
- Returns `(Vec<CardRowData>, total_count)` tuple for UI pagination
- TypeScript repository layer: `queryCards()` method on both Sqlite and LocalStorage implementations

## [1.0.7] - 2026-06-19

### Added
- A6: Configurable FSRS desired retention slider (Settings page)
- Range: 0.70 to 0.99 with 0.01 step
- Real-time preview of how retention affects scheduling intervals
- Persists to `settings` table in SQLite

## [1.0.6] - 2026-06-19

### Added
- A1: Incremental persistence via atomic Rust commands
- `upsert_deck_atomic`, `upsert_card_atomic`, `delete_deck_atomic`, `delete_card_atomic`, `upsert_setting_atomic`
- Each command writes only the affected rows (not full DB rewrite)
- Reduces disk I/O and improves performance for large decks

### Changed
- Repository layer: TypeScript calls atomic commands instead of full snapshot save

## [1.0.5] - 2026-06-18

### Added
- Anki `.apkg` import with deck extraction
- CSV import with column mapping UI
- Image support in cards (paste or drag-drop)
- JSON export/import for backup and migration
- Raw HTML toggle in RichCard (default off, for trusted content)
- Anki cloze hint syntax: `{{c1::answer::hint}}`

### Fixed
- `.recall` image import/export returns structured warnings report
- Stricter numeric/date validation in import
- FS permissions for binary image read/write in Tauri capability

## [1.0.3] - 2026-06-18

### Fixed
- CI workflow: ignore known unmaintained Tauri transitive dependencies in cargo audit
- Release workflow: generate complete icon set (PNG/ICO/ICNS) for all platforms
- ESLint: fix no-useless-escape in downloadFile regex
- Remove unused StateCreator import from recall-store

### Changed
- Download file routing: use Tauri dialog.save() in desktop mode, browser fallback in preview
- Memoize stat computations (getStudyStreak, getLevel, getLevelTitle)
- Add 3 Rust unit tests for anki_import.rs (deck map flattening, card extraction, missing deck fallback)
- Update README with prerequisites, test commands, E2E documentation
- Add CONTRIBUTING.md Rust development section
- Add PR template with breaking changes and security checkboxes
- Update bug report template with platform-specific log file locations
- Fix RecallSettings indentation in types.ts

## [1.0.2] - 2026-06-17

### Fixed
- Complete audit findings resolution (audit-4 through audit-11)
- Remaining audit findings (#11-#20): CI, download routing, README, memoization, Rust tests, repo hygiene

## [1.0.1] - 2026-06-16

### Fixed
- Initial audit findings (audit-1 through audit-10)
- Security improvements across codebase

## [1.0.0] - 2026-06-01

### Added
- Initial release
- FSRS-based spaced repetition scheduling
- Local SQLite storage with JSON export/import
- Anki .apkg import support
- CSV import with column mapping
- Cloze deletion cards (`{{c1::hidden text}}`)
- Rich cards with Markdown, LaTeX, and syntax-highlighted code
- Card browser with search, filter, sort, bulk operations
- XP and leveling system (Curious Mind to Legend)
- 14 achievement milestones
- Daily goals with progress tracking
- Session summaries with ratings breakdown
- Focus timer with Pomodoro presets (15/25/45m)
- Ambient soundscapes (Rain, Cafe, Lofi) synthesized locally
- Match game for alternative study
- Review calendar with activity heatmap
- Stats dashboard (review volume, rating distribution, time-of-day patterns)
- Deck health metrics (retention, leeches, overdue)
- Keyboard-first navigation and shortcuts
- Global hotkey for quick-add (Ctrl+Shift+N)
- Undo last review (Ctrl+Z)
- Custom study mode (deck, count, tag filter, new-only)
- Privacy-first: no account, no cloud, no telemetry
- Multi-platform support: Windows, macOS (Intel + Apple Silicon), Linux
- Comprehensive test suite (103 tests)
- CI/CD pipeline with automated testing, linting, and multi-platform release builds
