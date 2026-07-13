## Stitch UI/UX Overhaul — Remaining Screens

### 1. Achievement Detail (NEW — `src/components/achievement-detail.tsx`)
Full-screen modal triggered when achievement unlocks. Matches Stitch `recall_achievement_detail`:
- Blurred background with decorative circles
- Confetti canvas (reuse existing `triggerAchievementConfetti`)
- Gradient amber title, description, unlock date
- Next-level progress bar ("Next Badge: X")
- Share button + Continue button
- Tip card with contextual advice
- Card glow + float animations
- Close button (top-right)
- Trigger from `session-summary-modal.tsx` when `newAchievements.length > 0`

### 2. Session Summary Polish (`session-summary-modal.tsx`)
Enhance existing modal to match Stitch `recall_session_summary`:
- Celebration icon with ping animation ring
- 3 stat cards: Cards Reviewed, Study Time, Accuracy %
- Animated rating distribution bars (4 rows with bar-grow)
- XP earned card with daily goal progress
- Dual buttons: "Continue Studying" + "Back to Dashboard"
- Staggered fade-in animations
- Background decorative blur circles

### 3. Onboarding "How to Rate" Step (`onboarding.tsx`)
Add "system" step between Concept and Templates:
- "It's simple to rate" headline + body
- 4 rating button previews (Again/Hard/Good/Easy) with time labels
- 3 explanation cards (Optimal timing, FSRS Algorithm, Trust yourself)
- No SVG — CSS-only layout
- Step order: Welcome → Concept → System → Templates → Goal (5 steps)

### Files
- NEW: `src/components/achievement-detail.tsx`
- MODIFY: `src/components/study-mode/session-summary-modal.tsx`
- MODIFY: `src/components/onboarding.tsx`
- MODIFY: `src/locales/en.json`, `id.json`
- MODIFY: e2e tests (5-step flow)

### Priority order
1. Achievement detail (most impactful new feature)
2. Session summary polish (enhancement)
3. Onboarding system step (5th step, nice-to-have)