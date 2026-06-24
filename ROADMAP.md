# Roadmap

This document outlines the planned features and improvements for Recall. Items are grouped by priority, not by release timeline.

## In Progress

- [ ] Mobile app (iOS and Android) using Tauri's cross-platform capabilities
  - [ ] PWA (Progressive Web App) as lightweight alternative to native mobile builds
- [ ] Sync protocol for optional cloud backup (privacy-preserving, end-to-end encrypted)
  - [ ] Auto-detect iCloud Drive / OneDrive folders for one-click "painless cloud sync"
- [ ] Spaced repetition algorithm options (switch between FSRS variants)

## Planned

### Core Features
- [ ] Deck sharing and marketplace (community card decks)
- [ ] Collaborative deck editing (multi-user real-time)
- [ ] Advanced statistics (retention curves, forgetting curves, optimal review timing)
  - [ ] FSRS-specific metrics: Stability (S), Difficulty (D) visualization
  - [ ] Desired Retention target overlay on retention curve
  - [ ] Forgetting curve prediction graph with actual vs predicted comparison
- [ ] Custom scheduling algorithms (user-defined intervals)
- [ ] Plugin system for extensions (themes, card types, import/export formats)
  - [ ] Local API / Webhook system for third-party integrations (like AnkiConnect)

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
- [x] High contrast themes (v1.0.13)
- [ ] Screen reader support (ARIA labels, focus management)
- [ ] Customizable keyboard shortcuts
- [x] Dyslexia-friendly font option (v1.0.13)
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
- [x] Card editor: paste (Ctrl+V) and drag-drop image support (Unreleased)
- [x] Text-to-Speech: auto-read cards in study mode with configurable speed (Unreleased)
- [x] FSRS optimizer: analyze review history to auto-tune spacing weights (Unreleased)
- [x] Workload forecast: 30-day due card chart with new vs review breakdown (Unreleased)
- [x] Command palette: Ctrl+K quick navigation (Unreleased)
- [x] FSRS interval preview: rating buttons show predicted intervals (Unreleased)
- [x] Retention curve: rolling 7-day retention visualization on stats dashboard (Unreleased)
- [x] Tags as first-class citizens: hierarchical tag tree, saved searches, tag autocomplete (v1.0.13)
- [x] Onboarding template deck gallery: 4 starter decks (Languages, Coding, GRE, Med) (v1.0.13)
- [x] Theming depth: 6 accent colors + dyslexia-friendly font (v1.0.13)
- [x] Folder-based cloud sync: merge-on-import to Dropbox/Google Drive/etc. (v1.0.13)
- [x] Image Occlusion cards: draw rectangles on images, reveal during study (Unreleased)
- [x] Richer Anki import: media extraction (images from .apkg) with recall:// URLs (Unreleased)

## Contributing

Want to help with any of these items? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and development guidelines.

Have an idea that's not on this list? Open an issue to discuss it.
