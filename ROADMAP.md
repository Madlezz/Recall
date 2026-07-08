# Roadmap

## Vision

Recall exists for people who have a real, external reason to memorize things - an exam, a language, a licensing test - but who have never used a spaced-repetition tool and find Anki/Mochi/RemNote intimidating to even start. It gives them an on-ramp that just works, with zero paradigm literacy required.

Recall is *not* trying to out-feature Anki for its existing power users. That's a 20-year ecosystem battle a solo developer cannot win, and it isn't the point.

**Target audience:** access-gap non-users - people with real memorization needs (UTBK, CPNS, medical/pharmacy board exams, language learning) who would benefit from SRS but never got a friendly enough introduction. The Indonesian market is a concrete target: no competitor offers real Bahasa Indonesia localization.

## In Progress

- [x] **Onboarding rewrite** - Explain what spaced repetition is and why review timing matters, in plain language, before naming the algorithm. Added "how this works" demo deck and UTBK Indonesia starter content. Done in v1.1.0.
- [ ] **Mobile app** (iOS and Android) using Tauri's cross-platform capabilities
  - Reframed: not "feature parity" but "access" - desktop-only is a real barrier for a smartphone-primary target population.
  - [x] PWA (Progressive Web App) as lightweight alternative to native mobile builds (v1.1.0 - live at madlezz.github.io/Recall)
  - [x] Mobile-first responsive layout - bottom tab bar, compact study UI, safe-area insets, 44px touch targets (v1.1.0)
  - [x] E2E encrypted sync protocol - AES-256-GCM + PBKDF2, sync code pairing, Cloudflare Worker relay (v1.1.0)
- [x] Sync protocol for optional cloud backup (privacy-preserving, end-to-end encrypted) — shipped in v1.1.0
  - [ ] Auto-detect iCloud Drive / OneDrive folders for one-click "painless cloud sync"

## Planned

### Core Fixes
- [x] **FSRS graduation bug** - `learning_steps` was hardcoded to 0, cards never graduated past ~10-minute intervals. Fixed in v1.1.0.
- [x] **Relearning state mapping** - `relearning` was mapped to `State.Learning` instead of `State.Relearning`. Fixed in v1.1.0.
- [x] **Anki import scheduling history** - Import now reads FSRS `memory_state` (s/d) from Anki 23.10+ `data` column, falls back to SM-2 ease→difficulty estimation for legacy cards. State, stability, difficulty, reps, lapses, and due interval all preserved. Fixed in v1.1.0.

### Study Experience
- [x] **Voice input for card creation** (speech-to-text) - lowers the barrier for someone uncomfortable typing/using markdown. Uses Web Speech API (offline, no cloud). Mic button in card editor + quick-add. Language auto-detected from app locale. Toggle in Settings → Study. Done in v1.1.0.
- [ ] Handwriting recognition for handwritten notes
- [ ] Spaced repetition for audio/video content
- [ ] Adaptive difficulty (cards get harder/easier based on performance)
- [ ] Study streaks with social sharing (optional, privacy-preserving)

### Internationalization
- [ ] Additional languages: Spanish (es), Portuguese (pt), Chinese Simplified (zh-CN), Japanese (ja)
  - **Trigger:** Implement after core feature development slows down (post-v1.1 stable). During active development, new UI strings are added frequently - each new language adds maintenance overhead per string change.
  - **Approach:** Generate initial translations from en.json (873 keys) using LLM, then community review/refine. Zero code changes needed per language - just add a JSON file to `src/locales/`.
  - **CJK note:** Verify font rendering on all target platforms before release.
  - **Future:** Arabic (ar) requires RTL layout support (CSS `dir="rtl"`), defer to separate milestone.

### Mobile App
- [ ] Native iOS and Android apps using Tauri
- [x] Touch-optimized UI with swipe gestures (v1.1.0 - PWA)
- [ ] Offline-first with background sync
- [ ] Biometric authentication (Face ID, fingerprint)
- [ ] Widgets for quick review sessions
- [ ] Apple Pencil / stylus support for handwriting

### Performance & Scale
- [x] Database optimization for large decks (10,000+ cards) *(done: DB-side queries + pagination in v1.0.8, UI wired in v1.0.11)*
- [ ] Incremental search indexing
- [ ] Lazy loading for card browser
- [ ] Memory optimization for mobile devices

### Accessibility
- [x] High contrast themes (v1.0.13)
- [x] Screen reader support (ARIA labels, focus management)
- [ ] Customizable keyboard shortcuts
- [x] Dyslexia-friendly font option (v1.0.13)
- [ ] Color-blind friendly UI

## Someday / Not a Current Priority

*These items chase Anki's 20-year power-user ecosystem or are only legible to someone who already knows SRS/FSRS terminology. Not deleted - deferred until there's a user base that actually asks for them.*

- [ ] Plugin system / Local API / Webhook system (like AnkiConnect)
- [ ] Custom scheduling algorithms (user-defined intervals)
- [ ] Advanced statistics: FSRS Stability (S) / Difficulty (D) visualization, forgetting-curve prediction
- [ ] Deck sharing / marketplace, collaborative real-time editing
- [ ] Spaced repetition algorithm options (switch between FSRS variants)

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
- [x] Comprehensive test suite (761 tests)
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
- [x] Card editor: paste (Ctrl+V) and drag-drop image support (v1.1.0)
- [x] Text-to-Speech: auto-read cards in study mode with configurable speed (v1.1.0)
- [x] FSRS optimizer: analyze review history to auto-tune spacing weights (v1.1.0)
- [x] Workload forecast: 30-day due card chart with new vs review breakdown (v1.1.0)
- [x] Command palette: Ctrl+K quick navigation (v1.1.0)
- [x] FSRS interval preview: rating buttons show predicted intervals (v1.1.0)
- [x] Retention curve: rolling 7-day retention visualization on stats dashboard (v1.1.0)
- [x] Tags as first-class citizens: hierarchical tag tree, saved searches, tag autocomplete (v1.0.13)
- [x] Onboarding template deck gallery: 4 starter decks (Languages, Coding, GRE, Med) (v1.0.13)
- [x] Theming depth: 6 accent colors + dyslexia-friendly font (v1.0.13)
- [x] Folder-based cloud sync: merge-on-import to Dropbox/Google Drive/etc. (v1.0.13)
- [x] Image Occlusion cards: draw rectangles on images, reveal during study (v1.1.0)
- [x] Richer Anki import: media extraction (images from .apkg) with recall:// URLs (v1.1.0)
- [x] Internationalization (i18n): react-i18next with English + Bahasa Indonesia, 40 namespaces / 873 keys, language switcher in Settings (v1.1.0)
- [x] Swipe gestures: swipe to reveal and rate cards on mobile - left=again, right=good, up=easy, down=hard, with visual feedback (v1.1.0)

## Contributing

Want to help with any of these items? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and development guidelines.

Have an idea that's not on this list? Open an issue to discuss it.
