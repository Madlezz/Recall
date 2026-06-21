# Roadmap

This document outlines the planned features and improvements for Recall. Items are grouped by priority, not by release timeline.

## In Progress

- [ ] Mobile app (iOS and Android) using Tauri's cross-platform capabilities
- [ ] Sync protocol for optional cloud backup (privacy-preserving, end-to-end encrypted)
- [ ] Card editor improvements (WYSIWYG, drag-and-drop media)
- [ ] Spaced repetition algorithm options (switch between FSRS variants)

## Planned

### Core Features
- [ ] Deck sharing and marketplace (community card decks)
- [ ] Collaborative deck editing (multi-user real-time)
- [ ] Advanced statistics (retention curves, forgetting curves, optimal review timing)
- [ ] Custom scheduling algorithms (user-defined intervals)
- [ ] Plugin system for extensions (themes, card types, import/export formats)

### Study Experience
- [ ] Voice input for card creation (speech-to-text)
- [ ] Handwriting recognition for handwritten notes
- [ ] Spaced repetition for audio/video content
- [ ] Adaptive difficulty (cards get harder/easier based on performance)
- [ ] Study streaks with social sharing (optional, privacy-preserving)

### Mobile App
- [ ] Native iOS and Android apps using Tauri
- [ ] Touch-optimized UI with swipe gestures
- [ ] Offline-first with background sync
- [ ] Biometric authentication (Face ID, fingerprint)
- [ ] Widgets for quick review sessions
- [ ] Apple Pencil / stylus support for handwriting

### Performance & Scale
- [ ] Database optimization for large decks (10,000+ cards) *(done: DB-side queries + pagination in v1.0.8, UI wired in v1.0.11)*
- [ ] Incremental search indexing
- [ ] Lazy loading for card browser
- [ ] Memory optimization for mobile devices

### Accessibility
- [ ] Screen reader support (ARIA labels, focus management)
- [ ] High contrast themes
- [ ] Customizable keyboard shortcuts
- [ ] Dyslexia-friendly font option
- [ ] Color-blind friendly UI

## Completed (v1.0.x)

- [x] FSRS-based spaced repetition
- [x] Local SQLite storage
- [x] Anki .apkg import
- [x] CSV import with column mapping
- [x] Cloze deletion cards
- [x] Rich cards (Markdown, LaTeX, code)
- [x] Card browser with bulk operations
- [x] XP and leveling system
- [x] 14 achievement milestones
- [x] Daily goals
- [x] Session summaries
- [x] Focus timer (Pomodoro)
- [x] Ambient soundscapes
- [x] Match game
- [x] Review calendar heatmap
- [x] Stats dashboard
- [x] Deck health metrics
- [x] Keyboard-first navigation
- [x] Global hotkey for quick-add
- [x] Multi-platform (Windows, macOS, Linux)
- [x] Comprehensive test suite (165 tests)
- [x] CI/CD with automated releases
- [x] Accessibility documentation and ARIA labels
- [x] User-friendly error messages across all dialogs
- [x] Image support in cards (paste or drag-drop)
- [x] JSON export/import for backup and migration
- [x] Raw HTML toggle in RichCard
- [x] Anki cloze hint syntax (`{{c1::answer::hint}}`)
- [x] Incremental persistence via atomic Rust commands (v1.0.6)
- [x] Configurable FSRS desired retention slider (v1.0.7)
- [x] DB-side card query with filtering/sorting/pagination (v1.0.8)
- [x] Release signing: ed25519 updater keys + SHA256SUMS (v1.0.9)
- [x] Auto-updater artifacts: `latest.json` + `.sig` generation (v1.0.11)
- [x] CodeQL Rust analysis (v1.0.11)
- [x] Cargo-audit ignore justification file (v1.0.11)
- [x] Anki media import warning (v1.0.11)
- [x] Card browser UI wired to DB queries (v1.0.11)

## Contributing

Want to help with any of these items? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and development guidelines.

Have an idea that's not on this list? Open an issue to discuss it.
