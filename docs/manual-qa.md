# Recall Manual QA Checklist

## First Launch
- [ ] Fresh install shows onboarding with 4-step carousel
- [ ] "Start Learning" button completes onboarding → Dashboard with seed data
- [ ] "Skip to Dashboard" available from step 2+

## Dashboard
- [ ] Shows 3 seed decks: 🇯🇵 Japanese Basics, 🔬 Science Facts, 🏛️ World History
- [ ] "Start Review" button begins study session with due cards
- [ ] Sidebar shows deck count, card count, due count, XP level
- [ ] Deck cards show retention %, leech count, overdue count

## Deck Management
- [ ] Create deck: name + description + color — empty name rejected, duplicate name rejected
- [ ] Edit deck: rename, change description/color
- [ ] Delete deck: confirmation dialog, removes all cards + reviews
- [ ] Move cards between decks via Card Browser
- [ ] Reset deck progress (keeps cards, resets FSRS state)

## Card Management
- [ ] Create card: front + back + hint + tags + deck selector
- [ ] Empty front rejected; cloze cards allow empty back
- [ ] Edit card: modify any field
- [ ] Delete card: removes review history too
- [ ] Rich card preview: Markdown rendering, LaTeX math, code blocks, cloze `{{c1::text}}`
- [ ] Ctrl+N quick-add from anywhere (modal, last-used deck)
- [ ] CSV import: upload .csv, map columns, choose deck, preview, confirm
- [ ] Anki .apkg import: select file, imports decks + cards + review history

## Card Browser
- [ ] Table view: all cards with Front, Deck, State, Next Review, Lapses, Tags
- [ ] Search: fuzzy match on front, back, hint, tags
- [ ] Filter: by deck dropdown, by state dropdown
- [ ] Sort: click any column header to sort
- [ ] Bulk select: checkbox + Shift-range + select all
- [ ] Bulk delete: confirm dialog, removes cards + review history
- [ ] Bulk move: select target deck
- [ ] Bulk tag: Add / Set / Remove modes

## Study Mode (FSRS — 4 Buttons)
- [ ] Start from Dashboard ("Start Review") or Deck Detail
- [ ] Cards appear centered with deck name + progress (3/23)
- [ ] Space reveals the answer with flip animation
- [ ] `1` = Again (card was forgotten, reschedule soon)
- [ ] `2` = Hard (card was difficult, shorter interval)
- [ ] `3` = Good (card recalled correctly, normal interval)
- [ ] `4` = Easy (card was trivial, longer interval)
- [ ] `B` = Bury card (hide until next day)
- [ ] `S` = Snooze card (hide for 10min / 1h / until tomorrow)
- [ ] Elapsed timer visible during session
- [ ] `?` shows keyboard shortcut help overlay

## Session Summary
- [ ] Shows: cards studied, time spent, rating distribution (Again/Hard/Good/Easy)
- [ ] Shows: XP earned, achievements unlocked (with confetti)
- [ ] Shows: accuracy %, new cards count
- [ ] "Done" returns to Dashboard

## Custom Study
- [ ] Dialog: select deck (or all decks), card count (default 20), tag filter, new-only toggle
- [ ] Live preview shows matching card count
- [ ] Starts study session with filtered cards

## Spaced Repetition (FSRS)
- [ ] New cards scheduled per daily new card limit (default 20)
- [ ] Cards graduate through New → Learning → Review states
- [ ] Again resets a card to relearning; Hard/Good/Easy advance it
- [ ] Cards due today appear in "Start Review" pool
- [ ] Cards not due are hidden from review
- [ ] Bury hides card until next day
- [ ] Leech detection: lapses ≥ threshold → warning indicator on card
- [ ] Exam deadline mode: deadline ≤ 3 days → unlimited new cards for that deck

## Gamification
- [ ] XP earned per review (Again=1, Hard=2, Good=5, Easy=8)
- [ ] 10 levels: Curious Mind → Legend
- [ ] 14 achievements unlock with confetti
- [ ] Daily goal progress bar with confetti on completion
- [ ] Study streak counter on Dashboard
- [ ] Activity heatmap (GitHub-style) on Dashboard

## Tools
- [ ] Focus timer (Pomodoro): 15/25/45 min presets
- [ ] Ambient soundscapes: Rain, Cafe, Lofi (synthesized locally)
- [ ] Match game: tile-matching puzzle from card fronts/backs

## Settings
- [ ] Theme toggle: Dark / Light — persists after reload
- [ ] Daily new card limit: slider or number input
- [ ] Sound volume: 0-100% master gain slider
- [ ] Notifications toggle: enable/disable due reminders
- [ ] "Test notification" button sends a test reminder
- [ ] Reset all data: confirmation dialog, restores seed data

## Data Persistence
- [ ] Deck/card/review changes persist after app reload
- [ ] Theme persists after app reload
- [ ] Settings persist after app reload
- [ ] Streak, XP, achievements persist after app reload

## Import / Export
- [ ] Export JSON: writes valid `.json` file with version 2
- [ ] Import Replace: replaces all data after confirmation
- [ ] Import Merge: adds new decks/cards, skips duplicates by name+front
- [ ] Invalid import file: shows error toast, does not change existing data
- [ ] CSV import: column mapping, deck selector, preview, confirm

## Offline & Privacy
- [ ] App works 100% offline after dependencies installed
- [ ] No network requests during normal operation
- [ ] No telemetry, analytics, or tracking
- [ ] No account or login required
- [ ] SQLite database stored locally on user's machine

## Edge Cases
- [ ] Empty dashboard (no decks): beautiful empty state with "Create your first deck" CTA
- [ ] Empty deck (no cards): "Add your first card" prompt
- [ ] No cards due: "No cards due right now" toast on Start Review
- [ ] 0 cards selected in browser: bulk actions disabled
- [ ] Import with 0 cards: handled gracefully
- [ ] Very long card text: renders without overflow
- [ ] Special characters in card text (emoji, Unicode): render correctly
- [ ] Browser dev mode (`pnpm dev`): app runs without Tauri backend
- [ ] Undo last review: restores previous card state (single undo)