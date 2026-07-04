# Recall — Vision & Roadmap Realignment

*Prepared from a deep-dive review of the codebase, the competitor landscape, and the project's original intent. This sits above ROADMAP.md as a filter — it is meant to revise it, not to be appended to it as one more item.*

## 1. Vision statement

Recall exists for people who have a real, external reason to memorize things — an exam, a language, a licensing test — but who have never used a spaced-repetition tool and find Anki/Mochi/RemNote intimidating to even start. It exists to give them an on-ramp that just works, with zero paradigm literacy required.

Recall is *not* trying to out-feature Anki for its existing power users. That's a 20-year ecosystem battle a solo developer cannot win, and it isn't the point.

## 2. How we got here (evidence trail)

- **Origin insight (from the founder):** Anki-like apps are unfriendly to first-timers — "makenya gimana sih ini." Meanwhile Anki's existing users are heavily self-selected (med students, hardcore language learners, people who already researched "the best way to memorize things") — the population that's never touched an SRS tool at all is far larger, and invisible from inside Anki's own userbase.
- **Market research independently points at the same weak point.** The most common reasons people cite for avoiding or abandoning Anki: the manual effort of card creation, review-backlog burnout after missing a day or two, and a lack of Duolingo-style motivation mechanics. Anki's own contributors have said the project deliberately favors power-user control over new-user friendliness.
- **Current onboarding copy contradicts the vision.** The actual shipped text (`src/locales/en.json`, `onboarding.*` keys) reads: "Uses the best spaced repetition algorithm (FSRS). You just review, it handles the rest." This assumes the reader already knows what spaced repetition and FSRS are. Nothing on the first-run screen explains the concept from scratch.
- **The onboarding template decks reinforce the same mismatch.** The four starter decks are Languages, Coding, GRE, Med — all topics strongly associated with people already inside Anki's existing culture, not with a true first-timer.
- **A large, concrete, underserved segment exists.** No competitor checked (Anki, Mochi, RemNote, Deckbase, Hashcards, Markji) offers real Bahasa Indonesia localization, and Indonesia has large populations with strong built-in memorization motivation — UTBK/SNBT, CPNS, medical/pharmacy board exams — who are unlikely to have been exposed to spaced repetition at all. This is the vision's target audience, concretely.

## 3. Two kinds of "non-user" — worth keeping distinct

- **Access-gap non-users**: have a real reason to memorize things, would benefit and stick with it, but never got a friendly enough introduction. **This is who Recall should be built for** — fixable with onboarding, localization, and UX.
- **Need-gap non-users**: no sustained external motivation to review daily. Not fixable by UX alone — every SRS tool faces this. Don't design for this group.

## 4. Fix before anything else

These aren't vision-dependent design choices — they break the core promise no matter who the target user ends up being.

### 4a. FSRS scheduling never graduates cards to long intervals (critical)
- **Where:** `src/services/fsrs-engine.ts` (`previewIntervals`, `applyReview`)
- **Bug:** `learning_steps` (the per-card step-progress counter ts-fsrs needs) is hardcoded to `0` on every call instead of being persisted per card. Compounding issue: the internal `"relearning"` state is mapped to FSRS `State.Learning` instead of the library's distinct `State.Relearning`.
- **Verified impact:** simulating the app's actual review loop shows a new card rated "Good" repeatedly gets stuck at ~10-minute intervals in "learning" state indefinitely — it never reaches "review" state or real day/week/month intervals. Same for any card that lapses once and re-enters relearning. `applyReview` is the only code path that schedules reviews anywhere in the app (single call site, no alternate graduation path), so this affects effectively all real usage past a card's first review.
- **Why the test suite didn't catch it:** the FSRS tests (part of the 731 total) only check single-call state *transitions* (new→learning, review→relearning). None simulate a card being reviewed more than once, or one that starts already in "learning"/"relearning." All 10 tests in `fsrs-engine.test.ts` currently pass (`vitest run`, confirmed) despite the bug.
- **Fix shape:** add real per-card step-tracking (a schema field), pass the actual current step into `ts-fsrs` instead of a hardcoded `0`, and correct the `Relearning` mapping. Add regression tests that simulate several sequential reviews of the same card, not just single-call transitions.

### 4b. Anki import discards all scheduling history
- **Where:** `src-tauri/src/anki_import.rs`, `src/components/anki-import-dialog.tsx`
- **Gap:** the import only reads `flds`, `tags`, `did` from the source `.apkg`. No scheduling columns (`ivl`, `factor`, `due`, `reps`, `lapses`, `type`) are touched, and every imported card is created via the normal "new card" path (state: new, stability: 0, difficulty: 0). A card reviewed correctly for three years in Anki imports identically to a card made five minutes ago.
- **Priority note:** secondary, not urgent — this mainly blocks *veteran* Anki users with large mature decks from migrating, and veterans aren't the primary target (see section 5). Still worth fixing eventually, since right now it makes migration a non-starter for anyone with a non-trivial deck.
- **Fix shape:** modern Anki stores exact FSRS memory state (stability/difficulty) per card in a `memory_state` field once a deck has FSRS enabled — read that directly when present (increasingly common since FSRS became Anki's default in v23.10). Fall back to an approximate stability/difficulty estimate derived from `ivl`/`factor` for legacy SM-2-only cards. This is exactly the approach Anki's own codebase uses internally when full review-log history isn't available — a precedented, bounded technique, not an open research problem.

## 5. Reprioritizing ROADMAP.md

### Promote / add — aligned with the vision
- **Onboarding rewrite** — not currently on the roadmap at all. Explain what spaced repetition is and why review timing matters, in plain language, before or alongside naming the algorithm. Consider supplementing the GRE/Med/Coding/Languages template decks with something aimed at a true first-timer (a short "how this works" demo deck, and/or Indonesian exam-relevant content).
- **Both fixes in section 4** — currently invisible to a feature-list-style roadmap; they aren't tracked as items anywhere.
- **Mobile app** (already "In Progress") — worth moving up, and worth reframing its justification from "feature parity" to "access": desktop-only is a real barrier for a smartphone-primary target population.
- **Voice input for card creation** — currently filed as a generic "someday" item, but reconsider its priority: it could genuinely lower the barrier for someone uncomfortable typing/using markdown, which lines up with the vision better than most items in that section.

### Deprioritize or cut — aimed at veteran Anki/power users, not this vision's target
- **Plugin system / Local API / Webhook "like AnkiConnect"** — directly chases Anki's 20-year add-on ecosystem, already agreed to be unwinnable for a solo dev, and only power users would want it.
- **Custom scheduling algorithms (user-defined intervals)** — a newcomer wouldn't know what to do with this.
- **Advanced statistics: FSRS S/D visualization, forgetting-curve prediction** — legible only to someone who already knows what "stability" and "difficulty" mean as FSRS terms. (Also somewhat ironic to build on top of a scheduler that currently can't graduate cards at all — see 4a.)
- **Deck sharing / marketplace, collaborative real-time editing** — network-effect features that add surface complexity; more useful once there's an existing user base than as a way to win newcomers.
- **Spaced repetition algorithm options (switch between FSRS variants)** — only legible to someone who already knows FSRS has variants.

### Neutral — keep, not vision-dependent either way
Performance & Scale items, most Accessibility items, and general sync/backup work are good regardless of which audience Recall ultimately serves — no need to reprioritize these based on this exercise.

## 6. Suggested instruction for your agent

Use this document to *revise* ROADMAP.md, not append to it: add a condensed version of section 1 near the top, then re-sort "Planned" using section 5 — move the promoted items up (including the two currently-untracked fixes from section 4), and move the deprioritized items to a "Someday / not a current priority" section rather than deleting them outright.
