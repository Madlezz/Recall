# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
