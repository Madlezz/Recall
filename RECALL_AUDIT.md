# Recall — Full Review & Audit (Madlezz/Recall)

> Audit date: 2026-06-23 · Audited version: **v1.0.14** · Default branch: `main` (commit `7254df3`)
> Stack: Tauri 2 + React 19 + TypeScript + Rust + SQLite (FSRS spaced repetition, offline-first)
>
> **Scope exclusions agreed with maintainer:** (a) branch protection is intentionally disabled for now — not flagged; (b) anything requiring spending money (OS code-signing certificates, paid/hosted cloud infra) is marked **[OUT OF SCOPE — $]** and listed for awareness only.

---

## PART 1 — Repository / Project Audit (outside the codebase)

### 1.1 What's in good shape ✅
- **CI is mature.** `ci.yml` runs lint, vitest+coverage, build, Playwright e2e, `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, and `cargo audit`. All GitHub Actions are **pinned to commit SHAs** (supply-chain best practice) — excellent.
- **Security scanning:** CodeQL configured for **both** JavaScript/TS and Rust, on push/PR + weekly schedule.
- **Release pipeline is solid:** multi-platform matrix (macOS arm64/x64, Linux, Windows), Tauri updater artifacts (`latest.json` + `.sig`), ed25519 updater signing via secrets, and a `checksums` job that publishes `SHA256SUMS`.
- **Dependabot** enabled (npm grouped dev/prod + cargo + actions), and the alert history shows the maintainer is actually triaging: 5 dev-dependency CVEs (vitest/vite/esbuild) **FIXED**, 2 Rust runtime advisories (glib, sqlx) reviewed and **dismissed with justification**.
- **Community health files** are all present: `README`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `LICENSE`, `CHANGELOG`, `ROADMAP`, `ACCESSIBILITY`, issue templates (bug/feature), PR template, `FUNDING.yml`.
- Clean release cadence (v1.0.14, 35 PRs, disciplined squash/branch-per-feature workflow).

### 1.2 Findings / gaps
| # | Severity | Area | Finding |
|---|----------|------|---------|
| R1 | Med | CI gate | **Coverage thresholds are decorative.** `vitest.config.ts` sets lines **14%**, functions **8%**, branches **12%**, statements **13%**. With ~19.4k LOC the gate passes even if almost nothing is tested. README/ROADMAP advertise a "comprehensive 165-test suite" — the *number* is fine, but the gate doesn't protect it from regressions. Raise to a realistic floor (e.g. lines 45–55%) and ratchet up. |
| R2 | Med | Releases | **No OS-level code signing / notarization.** `tauri.conf.json` has `certificateThumbprint: null`, empty `timestampUrl`, no Apple notarization. Users get "unidentified developer" / SmartScreen warnings. Updater signing (ed25519) IS done. **[OUT OF SCOPE — $]** (Apple Dev $99/yr, Windows EV cert). Already documented in issue #23 — keep as a known limitation in README. |
| R3 | Low | PR hygiene | PR #35 "Feat/cloud sync" was **closed unmerged** — confirm this is the intentional deferral of hosted/E2E-encrypted sync (matches the "no spend" boundary). Folder-based sync (Dropbox/Drive merge-on-import) already shipped in v1.0.13, so this is consistent. |
| R4 | Low | Dependabot | Many cargo/actions Dependabot PRs were **closed unmerged** (#2–#11, #14, #16, #18). If intentional (pinning policy), add an `ignore:` block or `versioning-strategy` note in `dependabot.yml` so the bot stops reopening them and the PR list stays clean. |
| R5 | Low | Labels/Triage | Issues carry **no labels** and there are **no milestones**. For an OSS project inviting contributors, add a minimal label set (`bug`, `enhancement`, `good first issue`, `security`, `docs`) and group the roadmap into milestones. |
| R6 | Info | Branch protection | Currently disabled — **acknowledged as intentional**, not flagged. (When re-enabled: require the `check` CI job + 1 review on `main`.) |
| R7 | Low | Release notes | Release bodies just link to CHANGELOG. Consider auto-generating per-release notes (the CHANGELOG content or `gh release` `--generate-notes`) so the GitHub Releases page is self-contained. |

---

## PART 2 — Codebase Audit

**Layout:** `src/` (React/TS — 68 `.ts`, 47 `.tsx`), `src-tauri/src/` (Rust — `lib.rs`, `db_atomic.rs`, `anki_import.rs`), ~19.4k LOC. 20 test files + 1 Playwright smoke spec.

### 2.1 Security — strong overall ✅
- **No SQL injection.** Every write in `db_atomic.rs` uses parameterized `conn.execute(...)`. `query_cards` builds a dynamic WHERE but **whitelists** `sort_field` to a fixed column set, validates `sort_dir`, and binds all values via `params_from_iter`. Frontend `repository.ts` uses `?` placeholders everywhere — no template-literal SQL interpolation anywhere in `src/`.
- **`copy_image_to_recall` is hardened well:** rejects symlinks (`symlink_metadata`) and directories, enforces a 50MB cap, validates extension **and magic bytes** (PNG/JPEG/GIF/WEBP), and writes to a UUID filename inside `$APPDATA/images`.
- **Markdown XSS** handled via `rehype-sanitize` (extends `defaultSchema`, additionally strips `form/input/textarea/button/select/details/summary`). Remote images are **blocked for privacy** (only local `recall://` rewritten to `recall.local`). Tight CSP in `tauri.conf.json` (`script-src 'self'`, no remote `connect-src` beyond ipc/asset).
- **Atomic write integrity:** dedicated rusqlite connection with `BEGIN IMMEDIATE / COMMIT / ROLLBACK`, `journal_mode=WAL`, `busy_timeout=30000`, `foreign_keys=ON` (verified at runtime). `create_safety_backup` checkpoints WAL and keeps rolling pre-restore backups.
- Tauri **capabilities are scoped**: `fs` read/write limited to `$APPDATA/**` (issue #20 / A8 done). No `shell`/`http` plugins exposed.

### 2.2 Security — minor notes
| # | Severity | Location | Finding |
|---|----------|----------|---------|
| C1 | Low | `RichCard.tsx` | Rehype plugin order is `rehypeRaw → rehypeSanitize → rehypeHighlight → rehypeKatex`. Sanitize-before-katex is correct, but `rehypeKatex` runs **after** sanitize and emits raw HTML — fine because KaTeX `trust:false` by default (no `\href` js:). Worth a one-line comment so a future refactor doesn't accidentally enable `trust`. The `allowHtml` toggle (raw HTML in cards) relies entirely on `defaultSchema`; confirm `defaultSchema` is acceptable for user-shared decks (it strips `on*`, `script`, `javascript:` — OK). |
| C2 | Low | `lib.rs` `generate_simple_uuid` | `nanos >> 64` on a u128 nanos value is effectively `0` for current timestamps, so that segment is wasted entropy. Collision risk is still negligible (counter+pid+nanos), but either use the full 128 bits or drop the dead segment. Cosmetic. |
| C3 | Info | `anki_import.rs` | 16 `unwrap()` calls. Anki `.apkg` is **untrusted external input** (zip + SQLite). An `unwrap()` on a malformed file = panic instead of a friendly error. Audit each and convert to `?`/`map_err`. (zip-bomb size limits should also be confirmed during extraction.) |

### 2.3 Architecture & maintainability
| # | Severity | Finding |
|---|----------|---------|
| A1 | Med | **Duplicated write logic (schema-drift risk).** Writes exist twice: Rust atomic commands (Tauri runtime) **and** a JS `tx.execute` path in `repository.ts` (browser/preview only). The column lists in the two `INSERT cards (...)` statements must be kept manually in sync with each migration — exactly the kind of thing that caused the migration-5 / `INSERT SELECT` crashes visible in git history (`7d1d8aa`, `42a092e`). Generate the column list from one shared definition, or assert parity in a test. |
| A2 | Med | **God files.** `src-tauri/src/lib.rs` (≈82KB, mostly inline seed-data SQL migrations) and `src/components/settings.tsx` (32KB), `deck-detail.tsx` (25KB), `study-mode.tsx` (24KB). Move seed SQL to versioned `.sql` files (or a `seed.rs` module) and split the largest React components into sub-components/hooks. |
| A3 | Low | **Demo seed shipped in production migrations.** Migration v2 inserts 6 decks / 65 cards as a real migration guarded by `recall_seed_guard`. It works, but coupling demo content to schema migrations is fragile. Consider seeding from the app layer on first run (you already have `src/data/demo-seed.ts` + `seed.ts`). |
| A4 | Low | **No DB-level data-integrity tests** for the migration chain (v1→v7). Add a test that runs all migrations on an empty DB and on a populated DB to catch the `INSERT SELECT` class of bugs before release. |

### 2.4 Testing
- 20 unit test files (logic-focused: tags, stats, session-summary, fsrs) + a single Playwright `smoke.spec.ts`.
- **Gap:** the largest UI components (`settings`, `deck-detail`, `study-mode`, `card-browser`, dialogs) have little/no component-level testing, and e2e covers only smoke. Combined with R1's 14% gate, regressions in the study flow could ship unnoticed.
- **Recommend:** (1) raise coverage gate and ratchet; (2) add e2e flows for the core loop (create deck → add card → study → rate → stats update) and for each importer (Anki/CSV/Markdown/Recall JSON); (3) the existing `large_deck_benchmark.rs` is great — assert a perf budget in CI.

### 2.5 Dependencies / build
- Frontend deps are modern and lean (React 19, zustand, ts-fsrs, radix-ui, react-markdown stack). Rust deps minimal (`rusqlite` bundled, `zip 4`, `tempfile`). No bloat.
- TypeScript `6.0.3`, Vite `8`, Vitest `4`, ESLint `10` are **very leading-edge / near-bleeding-edge** — fine for an app, but pin carefully and watch for ecosystem plugin lag.

---

## PART 3 — Recommended Improvements (new scope — features, UX, polish)

> Ordered roughly by value/effort. None of these require spending money.

### 3.1 UX / UI
1. **Study session ergonomics** — add an undo for the last rating (mis-tap recovery), an "edit card mid-review" affordance, and a session progress bar with remaining-count + ETA. Highest-frequency screen; small wins compound.
2. **Empty & error states pass** — audit every list/dialog for friendly empty states and skeleton loaders (deck list, card browser, stats before data exists). The `error-boundary.tsx` exists — make sure each async dialog surfaces failures via `sonner` toasts consistently.
3. **Onboarding polish** — you already ship a 4-deck template gallery; add a 30-second interactive "first review" walkthrough so new users feel the FSRS loop immediately.
4. **Keyboard map discoverability** — `shortcut-help.tsx` + Ctrl+K command palette exist; surface a persistent "?" hint and ensure every primary action has a shortcut listed in one place.
5. **Density / responsive** — verify the 800×600 min-window layout for the heavy screens (settings, deck-detail) doesn't overflow; consider a collapsible sidebar.

### 3.2 Accessibility (partly on roadmap — worth prioritizing, $0)
6. **Screen-reader support** (ROADMAP open): ARIA roles/labels + focus management on dialogs and the study card flip; announce rating outcomes via an aria-live region.
7. **Customizable keyboard shortcuts** and **color-blind-safe palette** (both already on roadmap) — high impact for a study tool, no cost.

### 3.3 Features (no-spend)
8. **Smarter "Custom Study"** — filter by tag/state/lapses/difficulty into ad-hoc sessions (you have tag tree + DB-side query + custom-study-dialog already; extend the query surface).
9. **Leech detection** — auto-flag cards with high lapses (FSRS data is already stored) and suggest suspend/rephrase. Classic Anki feature, pure logic.
10. **Per-deck FSRS optimization** — you have a global `fsrs-optimizer`; allow per-deck weight tuning and show the before/after retention impact.
11. **Export hardening** — add a "verify backup" round-trip (export → re-import into a temp store → diff) so users trust the JSON backup. Reinforces the offline-first promise at $0.
12. **Local stats depth** — forgetting-curve and true-retention-by-interval charts (data already in `review_logs`), and a "best time of day to study" insight.

### 3.4 Engineering quality (developer-facing)
13. Resolve **A1** (single source of truth for the card column list) and **C3** (`anki_import` panic-safety) first — both are correctness/robustness wins.
14. Raise the **coverage gate (R1)** and add **migration-chain tests (A4)** + core-loop e2e (2.4).
15. Split the **god files (A2)** and move seed SQL out of migrations (A3).

### 3.5 Explicitly OUT OF SCOPE (cost money — listed for awareness only)
- OS code signing / Apple notarization (R2).
- Hosted, end-to-end-encrypted cloud sync server (PR #35 deferral) — the free folder-sync (Dropbox/Drive) already covers most of the need.
- Deck marketplace / collaborative real-time editing (roadmap "Planned") — implies hosting/infra.

---

## TL;DR for the dev agent
- **Project is genuinely well-run**: strong CI/CD, pinned actions, CodeQL (JS+Rust), Dependabot triage, signed updater + checksums, scoped Tauri capabilities, parameterized SQL, hardened image import, sanitized markdown, atomic WAL-backed writes. No high-severity security issues found.
- **Top 5 concrete fixes (all free):** (1) raise the 14% coverage gate + add core-loop e2e and migration tests; (2) de-duplicate the card write/column logic (single source of truth) to kill schema-drift bugs; (3) make `anki_import.rs` panic-safe (remove `unwrap()` on untrusted input); (4) split the god files & move seed SQL out of migrations; (5) repo hygiene — labels, milestones, dependabot ignore rules, branch protection (when ready).
- **Best free product bets:** study-loop UX (undo/edit-in-review/progress), screen-reader a11y, leech detection, and deeper local retention analytics.


---

## PART 4 — UI/UX Deep-Dive & Codebase Bugs (Addendum)

> Based on reading the actual component code (layout, Tailwind, interaction logic). Note: the study flow is already impressively complete — undo (Ctrl+Z), bury (B), snooze (S), TTS toggle (T), 1–4 rating keys, FSRS interval preview, and a "rating flash" for deaf users all already exist. Leech detection is **also** already implemented (deck health, review-inbox, deck-detail badge). So the items below are genuinely new.

### 4.1 Confirmed BUGS in the codebase

| # | Severity | Location | Bug & fix |
|---|----------|----------|-----------|
| **B1** | **Med** | `match-game.tsx:181-185`, `focus-timer.tsx:87` | **XP lost-update race.** Both award XP via read-modify-write from a component closure: `updateSettings({ xp: settings.xp + delta })`. There is **no atomic `addXp` action** in the store. If two XP sources resolve close together (e.g. a focus session completes while answering cards, or rapid level-ups), the later write uses a stale base and **silently overwrites/loses XP**. Fix: add a store action `addXp(delta)` that mutates via `set((s) => ({ xp: s.settings.xp + delta }))` then persists, and call it everywhere instead of read-add-write. |
| **B2** | **Med** | `app-shell.tsx:37,87` | **Narrow-window navigation dead-end.** The sidebar is `hidden ... lg:flex` (≥1024px only). The mobile header (`lg:hidden`) contains **only** the logo (→dashboard) and a Settings button — no hamburger/drawer. There is no `Sheet`/`Drawer` component anywhere. So at any width < 1024px — **including the 800–1024px range that the app's own `minWidth: 800` allows** — Browser, Tags, and Stats are **unreachable** except via the Ctrl+K command palette. Fix: add a slide-out drawer nav (or a bottom tab bar) for `< lg`. |
| **B3** | Low | `study-mode.tsx:58,61` | **TTS can read the wrong card.** Auto-read uses an uncleared `setTimeout(() => speakText(...), 300)`. The cleanup at line 105 calls `stopSpeaking()` on card change, but the pending timeout still fires afterward and speaks the *previous* card's text. Fix: capture the timeout id and `clearTimeout` in the effect cleanup. |
| **B4** | Low | `match-game.tsx:167` | **Variable shadowing.** `const totalPairs = tiles.length / 2` inside `handleTileClick` shadows the outer `totalPairs` (line 204). Numerically equal today, but a refactor could diverge silently. Rename the inner one. |
| **B5** | Low | `settings.tsx:211,247,353` | **NaN-able numeric settings.** `soundVolume` (`parseInt`, no guard), `ttsSpeed` (`parseFloat`), and `desiredRetention` (`parseInt(...)/100`) lack the `|| fallback` guard that the other fields (dailyGoal, leechThreshold) already use. Range inputs make NaN unlikely but not impossible. Add fallbacks for consistency. |
| **B6** | Low | RichCard, import dialogs, `deck-detail.tsx:397` | **Array-index React keys** (`key={i}`) in several list renders → possible reconciliation/animation glitches on reorder/filter. Use stable ids. |
| **B7** | Low | `study-mode.tsx:95-98` | Rating keys `1–4` don't `event.preventDefault()` (unlike Space/B/S which do). Harmless today, but inconsistent. |

### 4.2 UI/UX — improvements & redesign ideas

The current design is clean and tasteful: neutral zinc palette, proper dark mode, a fixed 224px sidebar, skip-to-content link, ARIA on the level progress bar, and a Ctrl+K palette. Good foundation. Suggestions to push it further:

**Navigation & information architecture**
1. **Fix the responsive nav (B2)** first — then add a global **"Review / Due Today"** entry to the main nav (currently study is only reachable contextually from dashboard/deck). The sidebar already computes `dueCount`; make it a clickable jump-into-review.
2. **Surface Focus Timer & Match Game.** Focus Timer is buried inside the dashboard and Match Game is a view with no nav entry. Add them to nav (or a "Tools/Practice" group) so users can find them.
3. **Persistent due-count badge** on the nav "Review" item (like Anki's count), not just a number in the Library widget.

**Study screen (highest-traffic — polish hard)**
4. Add an **"edit this card" affordance mid-review** (undo already exists; editing is the missing companion). 
5. Make the **rating buttons show the FSRS interval preview as the primary label** at larger sizes and add subtle color coding (Again=red, Hard=amber, Good=green, Easy=blue) consistent with the existing `ratingFlash`.
6. **Progress affordance:** a thin top progress bar (answered/total) + remaining-count, plus the elapsed timer you already compute.

**Dashboard & data viz**
7. Tighten the dashboard into a clear **"Today" hero** (due/new/learned + a single primary "Start review" CTA) above the deck grid — reduce the cognitive load of landing on a wall of decks.
8. The deck cards already show health/leech badges — add a tiny **due sparkline / next-review chip** per deck for scannability.

**Design system & consistency**
9. **Centralize the accent/rating color tokens** (you have 6 accent colors + rating flash) into Tailwind theme tokens so buttons, badges, and charts stay consistent; today some colors are hard-coded (e.g. confetti palette, leech amber).
10. **Motion:** standardize transitions (card flip, level-up, match feedback) on a shared duration/easing; respect `prefers-reduced-motion` (important given confetti + flashes — also an a11y win).
11. **Empty/loading/error states** pass across every list and dialog (dashboard has an `animate-pulse` skeleton — replicate that consistency everywhere; route async failures through `sonner` toasts uniformly).

**Accessibility (cheap, high-value)**
12. Add an **`aria-live`** region in study mode to announce reveal + rating outcomes (match-game already has `announcement` — mirror it in study). Combined with reduced-motion (#10) this meaningfully improves the experience for SR/low-vision users — and is already half-done on the roadmap.

### 4.3 Quick-win priority (all $0)
1. **B1** atomic `addXp` (data-correctness).
2. **B2** responsive drawer nav (users on narrow windows are stuck).
3. **B3** TTS timeout cleanup.
4. UX: global "Review/Due" nav entry + surface Focus Timer/Match Game.
5. `prefers-reduced-motion` + study `aria-live`.


---

## PART 5 — Implementation Smells (works, but "not quite right")

These aren't crashes — the feature/button behaves, but the design or implementation choice is questionable.

| # | Severity | Location | What's off & suggested correction |
|---|----------|----------|-----------------------------------|
| **S1** | **Med** | `settings.tsx` `handleReset` (66) + "Reset All Data" | **"Reset" re-seeds demo data.** `resetData()` wipes all user cards/history **and re-injects the 6 demo decks** (toast: *"Seed data restored"*). A user who clicks "Reset All Data" expecting a clean slate ends up with fake demo decks instead. Split into two explicit actions: **"Delete all data"** (→ empty state) and a separate **"Load demo decks"**. Don't conflate factory-reset with demo-seeding. |
| **S2** | **Med** | `deck-detail.tsx:466` `handleBulkDelete` | **Inconsistent destructive-action protection.** Single deck delete and "Reset All Data" use an `AlertDialog` confirm, but **bulk "Delete Selected" deletes instantly with no confirm and no undo**. Deleting 50 cards is one mis-click away. Gate it behind the same confirm pattern (and ideally an undo toast). |
| **S3** | Med | `deck-detail.tsx:194-196` (and likely other bulk ops) | **Bulk operations are N separate transactions.** `for (const id of selectedCardIds) await deleteCard(id)` fires one atomic Rust command (BEGIN IMMEDIATE/COMMIT, plus a safety backup) **per card**. For large selections this is slow and **non-atomic as a unit** — a mid-loop failure leaves a half-deleted selection. Add a batched `deleteCards(ids[])` / `bulkUpdate` command that does it in one transaction. |
| **S4** | Low | `settings.tsx` Import/Export | The hidden `<input type=file>` + `handleNativeImport` falling back to `fileInputRef.current?.click()` is a reasonable web/Tauri dual-path, but the two import entry points (`handleImport` for web, `handleNativeImport` for Tauri) duplicate the merge/replace logic. Consolidate into one path that picks the file source. |
| **S5** | Low | `match-game.tsx` / `focus-timer.tsx` XP rules | XP amounts and level thresholds are **hard-coded inline in components** (base 30, +25 perfect, +20 fast, etc.; timer 15/25/45). Gamification balance is scattered across files — centralize in one `xp-rules` module so the economy is tunable and consistent. |
| **S6** | Low | Toasts as the only feedback for big actions | Export/import/reset success is communicated **only** via a transient `sonner` toast. For data-mutating actions, a persistent confirmation (e.g. "Last backup: filename, time") is more trustworthy for an offline-first app whose whole value prop is data ownership. |

---

## PART 6 — Layout & Information-Architecture Redesign (hierarchy/structure, not pixels)

You asked specifically about **hierarchy and page/menu layout**. Concrete restructures:

### 6.1 Settings page — break the 32KB flat scroll
Today it's a single vertical stack of 6 `<section>`s (Appearance+Sound → FSRS Optimizer → Study settings → Notifications → Import/Export → Reset). Problems: no grouping logic, the destructive "Reset All Data" lives at the bottom of the same scroll as a volume slider, and the file is a 704-line monolith.
**Restructure into a categorized settings layout** (left rail or tabs), one component per category:
- **Appearance** — theme, accent color, dyslexia font
- **Study & Scheduling** — daily new limit, daily goal, desired retention, leech threshold, FSRS optimizer
- **Audio & Speech** — sound on/off + volume, TTS enable/auto-read/speed
- **Notifications** — reminders
- **Data & Backup** — import/export, *and a visually isolated* **"Danger Zone"** for delete/reset (relabeled per S1)
- **About** — version, update check, links, "all data stays local" statement

### 6.2 Global navigation — add a layer of hierarchy
Current nav is a flat list: Dashboard / Browser / Tags / Stats / Settings. Study, Focus Timer, and Match Game have **no nav home** (study is contextual; timer is buried in the dashboard; match is an orphan view). Restructure into grouped sections:
- **Study** — Review / Due Today (the missing primary action), Focus Timer, Match Game
- **Library** — Dashboard, Browser, Tags
- **Insights** — Stats
- **Settings** (pinned bottom)
Put the **due-count badge** on the Review item.

### 6.3 Dashboard — lead with intent, not inventory
Right now Focus Timer is embedded in the dashboard body and the deck grid competes with everything. Reframe top-to-bottom by priority:
1. **"Today" band** — due / new / learned counts + one primary **"Start review"** CTA (uses the `dueCount` you already compute).
2. **Deck grid** — with the existing health/leech badges + a small due chip per deck.
3. Move **Focus Timer / Match Game** out into the new "Study" nav group (6.2).

### 6.4 Deck detail — sticky, safe bulk bar
Make the selection/bulk-action bar **sticky** while scrolling a long card list, and route "Delete Selected" through confirm + undo (S2).

---

## PART 7 — Anti "AI-Slop" UI/UX Rules (for the dev agent)

> The app's **current** aesthetic is good and should be protected: restrained neutral zinc palette, real dark mode, tight spacing, tasteful. The risk is a future redesign drifting into generic AI-template look. Give the dev agent these hard rules:

**Forbidden (reject on sight):**
- ❌ Purple/violet or rainbow **gradient** heroes, buttons, or backgrounds. No gradient text.
- ❌ Glassmorphism everywhere (blurred translucent panels as a default surface).
- ❌ Oversized `rounded-3xl` cards with huge padding and giant centered headings stacked in one column.
- ❌ Emoji used **as UI icons/controls** (emoji in user *content* like demo deck names is fine; icons must be the Lucide set already in use).
- ❌ "✨ / 🚀 AI-powered", glow effects, neon shadows, excessive `drop-shadow`/`shadow-2xl`.
- ❌ Decorative stock illustrations or generic 3D blobs.
- ❌ Center-everything single-column layouts where a real information hierarchy is needed.
- ❌ Inconsistent ad-hoc colors — every color must come from the theme tokens.

**Required (the house style):**
- ✅ Keep the **neutral zinc** base + the single configurable accent; semantic colors only for state (due/again/hard/good/easy, success/error).
- ✅ Consistent spacing scale, consistent border/radius (match existing `rounded-md`/`rounded-lg` usage), consistent Lucide icons at consistent sizes.
- ✅ Clear visual hierarchy: one primary action per screen, real headings, scannable density — not a wall of equal-weight cards.
- ✅ Every interactive element has hover/focus/disabled states and an accessible label; respect `prefers-reduced-motion`.
- ✅ Dark mode parity for every new color.
- ✅ Prefer native, calm, "boring-good" desktop-app feel over flashy marketing-page styling.

---

## PART 8 — Multi-Language (i18n) Support — feasibility & plan

**Current state:** **No i18n library** (none in `package.json`) and **all UI strings are hard-coded English literals** across ~47 `.tsx` files (headings, labels, toasts, aria-labels, error messages). `date-fns` is present (locale-capable). User *content* (decks/cards) is already language-agnostic in the DB, so localizing the **UI chrome** is the scope.

**Feasibility:** Medium effort, very doable, and a strong fit — a flashcard app is inherently used for language learning, so UI localization has real audience value, and it's **$0** (no infra).

**Suggested approach:**
1. **Pick a lightweight, offline-friendly i18n lib** — `react-i18next` (industry standard) or the smaller `@lingui/core`/`react-intl`. For an offline desktop app, ship translation JSON in the bundle (no remote fetch — keeps the privacy/offline promise intact).
2. **Externalize strings** into per-locale catalogs (`locales/en.json`, `locales/id.json`, …). This is the bulk of the work; do it incrementally screen-by-screen (start with nav, settings, study mode).
3. **Add a Language selector** in Settings → Appearance/General; persist `language` in the existing settings table (same pattern as `theme`). Default to the OS locale via Tauri, fallback to English.
4. **Localize dates/numbers** with `date-fns` locales and `Intl.NumberFormat` (stats, streaks, XP).
5. **Pluralization & interpolation** — many strings already interpolate (`Deleted ${count} card${count>1?'s':''}`) — replace these ad-hoc plural hacks with the i18n lib's plural rules (important: other languages have different plural forms).
6. **RTL readiness** (if Arabic/Hebrew ever added) — use logical CSS properties (`ms-*/me-*`, `ps-*/pe-*`) and set `dir` on `<html>`. Low cost to adopt now via Tailwind logical utilities.
7. **Keep it on the roadmap honestly** — it pairs naturally with the existing "Languages" demo deck theme and the accessibility work.

**Don't:** add a cloud translation service or auto-translate user card content (cost + privacy + correctness). Localize the **app UI only**; leave user content untouched.

---

## Updated TL;DR additions
- **Most important non-bug fixes:** S1 (don't re-seed demo data on "Reset"; split delete-vs-demo), S2 (confirm bulk delete), S3 (batch bulk ops into one transaction).
- **Structure work:** categorize Settings, group the nav (Study/Library/Insights), make the Dashboard lead with a "Today + Start review" band, surface Focus Timer/Match Game.
- **Guardrail:** enforce the anti-AI-slop rules in PART 7 — protect the existing restrained zinc aesthetic.
- **i18n:** greenfield but very feasible and on-brand; `react-i18next` + bundled offline locale JSON + a Settings language picker; localize UI chrome only.
