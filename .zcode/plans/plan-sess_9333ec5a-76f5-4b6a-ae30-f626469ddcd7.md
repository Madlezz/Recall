## Onboarding "How It Works" Step — Plan

### Architecture
Add a "concept" step to the existing multi-step onboarding. Order: Welcome → **How It Works** → Templates → Goal (4 steps).

### Files to modify
1. **`src/components/onboarding.tsx`** — add `"concept"` to Step type, add concept step UI (simplified timeline illustration + FSRS badge), update step array
2. **`src/locales/en.json` + `id.json`** — add `onboarding.concept*` keys

### Concept step design (from Stitch reference)
- **Visual**: simplified CSS timeline — horizontal line with 3 dots (Day 0, Day 3, Day 10), dashed forgetting curve above, floating card with clock icon
- **Headline**: "Learn at the right time"
- **Body**: "Recall brings cards back just before you forget them, so you can remember more with less effort."
- **Badge**: "Based on Spaced Repetition (FSRS)" with verified/brain icon
- **Buttons**: Back + Next (to templates)

### Skipped
- Full SVG animation (draw-on-scroll, float animation) — ponytail: add when onboarding gets micro-interaction polish
- Second concept screen ("It's simple to rate") — ponytail: add as step 3 if user research shows rating confusion
- 3D perspective card flip — YAGNI for concept intro