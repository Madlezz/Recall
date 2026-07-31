# Recall Differentiation Design

**Date**: 2026-07-23
**Status**: Approved (Sections 1-4)
**Author**: Brainstorm session (user + agent)

## Problem

Recall v1.2.0 is feature-complete (FSRS, local-first, Tauri + PWA, XP, focus timer, match game, ambient sound, E2E sync) but lacks acquisition pull. Users comparing Recall to Anki / RemNote / Mochi see factually-correct feature parity without an emotional reason to switch. Current positioning ("FSRS-based flashcard app for focused learning") is technically true but not compelling - it leads with the category where Anki dominates instead of where Recall wins.

## Core Positioning

**One-liner** (README hero, PWA landing, GitHub description, `index.html` description):

> FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours.

**Three-layer narrative:**

| Layer | Message | Proof |
|---|---|---|
| Anchor (engagement) | "Makes you want to come back" | XP, streak, match game, focus ritual, soundscapes, daily goal |
| Hook (simplicity) | "Buka langsung jalan" (no manual) | FSRS default, 6 starter decks, quick-add, keyboard-first, no account |
| Trust (privacy) | "Your data stays yours" | Local-first, E2E sync, `.recall` export, MIT, no telemetry |

**Narrative principles** (apply to all copy and UX decisions):
1. Engagement = first word. Headline leads with "come back", not "FSRS scheduling".
2. "Habit-first SRS" is the category Recall claims. Anki = power user. RemNote = notes. Mochi = minimal. Recall = habit.
3. FSRS is enabler, not star. Mentioned once as technical credential, not headline.
4. Privacy is trust signal, not primary pitch. One line in hero, details below.

## Section 1: Positioning & Core Narrative

**Changes (narrative repositioning, no feature add/remove):**

- README "Why Recall?" table: reorder columns so Recall-unique strengths come first (engagement native, no account, MIT open source) then algorithm, then Anki's ecosystem advantage as honest concession.
- GitHub repo description: change to one-liner above.
- PWA landing / `index.html` description: same tagline.

**Unchanged:** No feature removal. No new features in this section. Pure repositioning.

## Section 2: Product Surface - "Daily Ritual"

**Problem:** Engagement features (XP, streak, daily goal, match game, focus timer, soundscapes, session summary) exist but are scattered across tabs. Dashboard shows numbers, not a loop. No sense of "ritual".

**Concept:** "Daily Ritual" = landing surface that orchestrates engagement into one daily loop, not feature tabs.

**Loop:**

```
[Open Recall] → [Ritual Landing] → [Focus Session] → [Session Summary] → [Streak + XP visible]
     ↑                                                                              ↓
     └────────────── return tomorrow because progress is visible ──────────────────┘
```

**Changes:**

**A. Dashboard → "Today" view** (rename + restructure, not rewrite)

| Area | Now | Becomes |
|---|---|---|
| Hero | Due cards count | Streak flame + daily goal ring + "Ready?" CTA (1 button to start ritual) |
| Mid | Stats tiles | Deck due list (compact), next review forecast |
| Bottom | Recent activity | XP bar to next level, last achievement |

CTA primary: "Start today's session" → auto: focus timer default 25m + ambient (if used) + deck with most due cards first.

**B. Focus Session integrated** (not a separate tab)

Now: user must manually open focus timer + pick deck + start. Friction.

Becomes: "Start ritual" = focus timer + deck queue + ambient (last used) + match-game-available-as-break. One flow, no picking.

**C. Session Summary upgrade** (already exists, reinforced)

Now: small modal at end of review.

Becomes: "Today's win" screen - streak (if increased), XP earned, cards cleared, level progress. If level-up → celebration modal (confetti already exists, just orchestrate).

**D. Streak protection** (new, small)

Does not exist. Add: "streak grace" - miss 1 day = streak retained but flame "dim". Miss 2 days = reset. Prevents guilt-quit.

`ponytail: ceiling = configurable grace days, add when user research confirms default 1 grace day is right.`

**Not built in this section:**
- Social / study buddy - needs infra, YAGNI now.
- Match game as default review mode - stays optional break.
- Achievement overhaul - existing is sufficient, focus on ritual first.

**Testing:**
- 1 unit test: streak grace logic (`src/lib/streak.ts`, `applyStreakGrace` function. Assert: miss 1 → grace retained, miss 2 → reset).
- E2E: dashboard hero shows streak + CTA start ritual → click → enters focus session.

**Files touched:**
- `src/components/dashboard.tsx` - restructure hero
- `src/components/daily-goal.tsx` - integrate into hero
- `src/lib/xp.ts` - level-up celebration already exists, call from session summary
- `src/components/study-mode/session-summary-modal.tsx` - upgrade to "Today's win"
- `src/lib/streak.ts` (new) - grace logic + 1 test
- `src/components/focus-timer.tsx` - integrate into ritual flow, not standalone

## Section 3: First-Run Hook - "First review in 60 seconds"

**Problem:** Onboarding completes → user lands on dashboard (possibly empty or with template decks not yet reviewed). First-review aha moment is delayed. User never feels FSRS work. First drop-off.

**Principle:** Aha moment = user feels "this is what makes Recall different". Happens at reveal + rate → seeing interval preview appear. FSRS feels "smart". Not at reading SRS concept.

**Changes:**

**A. New onboarding step: "Try it now"** (inserted between `system` and `templates`)

New flow: welcome → concept → system → **try** → templates → goal.

Step "try":
- Uses 1 card from user-selected template (or `template_how_it_works` deck as default if skipped)
- UI identical to study mode: front → Space reveal → 4 rating buttons with interval preview
- After rate, small modal: "That's it. You just used FSRS. Recall will reschedule this card based on how you rated."
- Button: "Continue setup" → to templates step

Trial without commitment. User has not committed to goal, not to deck, but has felt the product.

Default try deck: `template_how_it_works` (`How This Works`) - already exists in `src/data/templates.ts:24`, onboarding-context appropriate, not domain-specific (vs Languages / Coding / GRE / Medical / UTBK which assume a niche).

**B. Landing post-onboarding = straight to Ritual** (not empty dashboard)

Now: `completeOnboarding()` → view `dashboard`.

Becomes: `completeOnboarding()` → view `dashboard`, but dashboard hero (from Section 2) shows "Ready for your first session?" with large CTA "Start today's ritual". Because template decks now have cards (from try step + import), due count > 0, ritual can run immediately.

Not an empty dashboard that requires exploration.

**C. Skip path adjusted**

Now: "Skip" button in onboarding header → jumps to templates. Kept, but if user skips templates too, "try" step still runs with default deck. No escape path without aha moment.

**Not built:**
- Tutorial overlay / coachmarks on dashboard - YAGNI, ritual CTA is self-explanatory.
- Onboarding personalization (pick language, pick interest) - not yet needed.
- A/B test onboarding variants - premature.

**Testing:**
- E2E: onboarding flow → step "try" → rate card → modal appears → continue → goal → complete → dashboard hero "Ready?" CTA visible.
- Unit: `onboardingComplete` flag set true only after all steps (including try) - assert flow integrity.

**Files touched:**
- `src/components/onboarding.tsx` - add "try" step + reorder
- `src/components/study-mode.tsx` - extract card review UI into reusable component (`TryCard`) for onboarding use without full study mode state
- `src/data/templates.ts` - mark `template_how_it_works` (id at line 24) as `defaultTryDeck`
- `src/App.tsx` - post-onboarding view stays `dashboard` (unchanged), dashboard hero is different per Section 2
- i18n keys: `onboarding.tryTitle`, `onboarding.tryDesc`, `onboarding.tryAhaMessage`, `onboarding.continueSetup`

**Why this is light:**
- Step "try" reuses `study-mode.tsx` card surface (already exists)
- Template deck already exists, no new content needed
- Dashboard hero from Section 2 handles post-onboarding landing
- i18n: 4 new keys

## Section 4: Outward Surface - Landing + SEO + Shareable

**Problem:** README + GitHub description + `index.html` description are factually correct but have no hook. People landing on GitHub page or searching "Anki alternative" feel no compulsion to try.

**Changes:**

**A. `index.html` meta + title** (zero infra, instant)

Now:
```html
<meta name="description" content="FSRS-based flashcard app for focused learning. Your data stays on your device, always." />
<title>Recall - Spaced Repetition Flashcards</title>
```

Becomes:
```html
<meta name="description" content="FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours. Open source." />
<title>Recall - Spaced Repetition That Makes You Come Back</title>
```

Add OG tags (currently absent):
```html
<meta property="og:title" content="Recall - Spaced Repetition That Makes You Come Back" />
<meta property="og:description" content="FSRS-grade SRS with built-in streaks, XP, and focus rituals. Local-first, no account, your data stays yours." />
<meta property="og:type" content="website" />
<meta property="og:image" content="/icons/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
```

`og-image.png` (new, 1200x630), uses logo + tagline.

`ponytail: ceiling = create generator script `scripts/gen-og-image.js` using logo + tagline text render, add when designer touch needed; for now resize `Lettermark_transparent.png`.`

**B. PWA manifest description** (in `vite-plugin-pwa` config, `vite.config.ts`)

Update manifest `description` + `name` to tagline.

**C. README hero** (reorder, not rewrite)

Current "Why Recall?" table leads with "Algorithm" row. Reorder:

1. Built-in engagement (Recall: XP/streak/focus/match game native vs Anki: add-on only)
2. No account, local-first (Recall: yes vs RemNote: account required)
3. FSRS on by default (algorithm - still mentioned, but position 3 not 1)
4. Open source MIT (vs RemNote proprietary, Mochi partial)
5. Add-on ecosystem (honest concession: Anki wins, Recall "planned")

Lead with Recall's strengths, not the category where Anki wins.

Top README tagline change from "local-first flashcard app built for focused learning" to "FSRS-grade spaced repetition that makes you want to come back".

**D. Shareable content** (low effort, high leverage)

Add "Share Recall" in settings/footer: link to GitHub repo + tagline. Not a social share button (YAGNI), just copy-to-clipboard link + tagline.

Why this is acquisition: every sharing user = free distribution, zero infra.

**Not built:**
- Separate marketing landing page - YAGNI, PWA + GitHub README sufficient. Landing page needs domain + hosting = owner-paid infra.
- Newsletter / email capture - needs infra, out of scope.
- Product Hunt launch - not a code task, ops decision for human.
- Video demo - needs tooling, ops.

**Testing:**
- 1 test: OG image path resolves, `og-image.png` exists in `public/icons/`.
- Manual: `pnpm dev` → view source → meta tags correct.
- E2E: "Share" button → clipboard contains expected URL + tagline.

**Files touched:**
- `index.html` - meta tags + OG
- `vite.config.ts` - PWA manifest description / name
- `README.md` - reorder table + hero tagline
- `public/icons/og-image.png` (new, or resize from Lettermark)
- `src/components/settings.tsx` or footer - "Share Recall" button + clipboard logic (~10 lines)
- i18n: `share.recallTagline`, `share.copyLink`, `share.copied`

## Cross-Section Principles

- **No owner-paid infra.** All changes are code/docs/assets in-repo. Sync stays self-host. No hosted marketing site, no analytics, no email service.
- **Local-first / offline.** Every feature works on-device. Share button uses clipboard API, no server.
- **YAGNI.** Social features, A/B testing, personalization, video demos excluded.
- **Honest concessions.** README still acknowledges Anki's ecosystem lead. Differentiation is engagement + simplicity + privacy, not pretending Recall has Anki's add-on catalog.
- **Prose rule (AGENTS.md):** ASCII hyphens, no em dash (U+2014) or en dash (U+2013) in agent-written docs.
- **Cost ceiling (AGENTS.md):** Maintainer does not pay for hosted infra. All work here stays in free tier (GitHub Pages PWA, GitHub Actions CI).

## Out of Scope (Deferred)

- Study buddy / shared streaks (needs infra or relay)
- Configurable streak grace days (default 1, upgrade when user research confirms)
- Onboarding personalization (language, interest pick)
- Marketing landing page (separate from PWA)
- Email capture / newsletter
- A/B testing framework
- Video demo / tutorial content
- Product Hunt / launch ops

## Dependencies Between Sections

- Section 2 (Ritual) + Section 3 (First-run) are coupled: post-onboarding landing depends on dashboard hero restructure from Section 2.
- Section 1 (Positioning) + Section 4 (Outward) are coupled: tagline defined in Section 1 is applied in Section 4's `index.html`, README, manifest.
- Build order: S1 (narrative) → S4 (outward surface, cheap, instant) → S2 (ritual product surface) → S3 (first-run hook, depends on S2 hero).
