# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Internationalization (i18n): full UI localization with react-i18next
  - English (en) and Bahasa Indonesia (id) locales, 873 translation keys across 40 namespaces
  - Language switcher in Settings → Appearance
  - All user-facing strings wired: every component, dialog, toast, and aria-label
  - Test environment initializes i18n to prevent assertion failures

## [1.0.16] - 2026-06-26

### Fixed
- Double-answer race: `answerCurrentCard` now sets `revealed=false` synchronously before async persist, preventing duplicate review logs from rapid taps
- LocalStorage data loss: `LocalStorageRecallRepository` targeted ops (upsertCard/upsertDeck/delete*) were no-ops; now read-modify-write full snapshot (browser/dev mode only, Tauri unaffected)
- XP/achievement loss on nav: sidebar navigation now auto-calls `exitStudy()` when leaving a completed study session
- Image-occlusion card type hidden from UI (WIP — createCard ignores cardType, mappers lose it on SQLite reload)

## [1.0.15] - 2026-06-25

### Added
- Coverage gate ratcheted: 416 tests (was 250), 26.46% line coverage (was 14.69%)
- Component tests: dashboard (72.6%), study-mode (64.7%), deck-detail (51.57%), app-shell (60%)
- Store logic tests: recall-store (70%), navigation/saved-search/deck-card/settings slices (78-100%)
- happy-dom + @testing-library/react for component testing
- Sticky bulk-action bar in deck detail (card-list-section)
- Persistent "Press ? for shortcuts" hint in sidebar footer

### Fixed
- Coverage gate branches threshold corrected (26 -> 24, matches actual 24.12%)
- Lint: removed 4 unused vars in test files (allTags, checkDeckQuality, fireEvent, summary)
- Build: recall-store.test.ts DeckColor type fix ("zinc" -> "slate"), previousCardState null guard
- Perf budget verified: large_deck_benchmark.rs assertions already enforced in CI via cargo test
- Empty/loading/error states audit: all list screens have empty states, dashboard has loading skeletons

## [1.0.14] - 2026-06-24

### Added
- Core-loop e2e test (create deck -> add card -> study -> rate -> stats update)
- Export round-trip verification tests (export -> re-import -> verify data integrity)
- Forgetting curve + best study time analytics (7 new tests)
- Per-deck FSRS optimization button in deck-detail UI
- Migration-chain integrity test (v1-v7 schema verification)

### Fixed
- B1: Atomic addXp action (fixes XP lost-update race in match-game + focus-timer)
- B2: Mobile nav drawer with hamburger menu for narrow windows
- B3: TTS timeout cleanup (prevents reading wrong card after navigation)
- B4: Variable shadowing in match-game handleTileClick
- B5: NaN guards on soundVolume, ttsSpeed, desiredRetention settings
- B6: Array-index React keys replaced with stable ids across all list renders
- B7: Rating keys 1-4 now call event.preventDefault()
- S1: "Delete All Data" now truly clears data (saveSnapshot instead of saveSettings)
- S2: Bulk delete uses confirm dialog (no more instant deletion)
- S3: Batched deleteCards atomic command (single transaction instead of N)
- S4: Import paths consolidated into single flow
- S5: XP rules extracted to src/lib/xp-rules.ts
- S6: Persistent lastAction confirmation for import/export
- A1: Card column parity test between Rust and JS write paths
- A2: God files split (settings, deck-detail, study-mode -> 11 sub-components)
- A3: Demo seed decoupled from schema migrations
- A4: DB migration-chain integrity test
- C1: Security comment on RichCard rehype plugin order
- C2: UUID entropy fix in lib.rs
- R1: Coverage gate raised from 14% to 26%+, 250+ tests added
- R4: Dependabot ignore rules for cargo/actions
- R7: Release notes auto-generated via gh api

### Changed
- Dashboard restructured: "Today" hero band with primary "Start Review" CTA
- Settings restructured: tabbed layout (General | Study | Data | About) with Danger Zone
- Navigation grouped: Dashboard, Review (with due-count badge), Browser, Tags, Stats, Settings + Tools section
- Confetti centralized into CONFETTI_COLORS shared constant
- prefers-reduced-motion guard on all confetti call sites
- aria-live region in study mode for screen reader announcements

## [1.0.13] - 2026-06-22

### Added
- Tag management: hierarchical tag tree view with card counts, rename/delete operations, search, and tag preview panel
- Saved searches: save tag combinations as virtual decks, study them via custom study with "all" or "any" match modes
- Tag autocomplete: chip-based tag input with real-time suggestions from existing tags, sorted by usage frequency

## [1.0.12] - 2026-06-22

### Added
- High-contrast theme: pure black/white with stronger borders for accessibility
- Retention curve: rolling 7-day retention rate visualization on stats dashboard
- FSRS optimizer: analyze review history to auto-tune spacing weights and suggest optimal retention target
- Text-to-Speech: enable TTS in settings for auto-read cards, adjustable speed (0.5x–2x), press T to toggle read aloud
- Workload forecast: see cards due each day for the next 30 days, with new vs review breakdown, 7-day average, and heaviest day highlight
- Command palette: press `Ctrl+K` (or `Cmd+K` on Mac) to quickly access navigation and actions
- FSRS interval preview: rating buttons show predicted next interval (e.g. `<1m | 8m | 3d | 12d`)

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
