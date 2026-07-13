---

version: "alpha"
name: "Recall Design System"
description: "A calm, beginner-friendly, local-first design system for Recall, a flashcard app that makes spaced repetition approachable for first-time learners."

brand:
productName: "Recall"
tagline: "Focused learning, without the setup friction."
personality:
- "calm"
- "clear"
- "trustworthy"
- "beginner-friendly"
- "motivating without pressure"
- "privacy-conscious"

colors:
mode:
light:
background: "#F8FAFC"
surface: "#FFFFFF"
surface-raised: "#F1F5F9"
surface-muted: "#E2E8F0"
border: "#E2E8F0"
border-strong: "#CBD5E1"

```
  text-primary: "#0F172A"
  text-secondary: "#334155"
  text-muted: "#64748B"
  text-disabled: "#94A3B8"

  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  primary-active: "#1E40AF"
  primary-soft: "#DBEAFE"
  primary-subtle: "#EFF6FF"
  on-primary: "#FFFFFF"

  motivation: "#F59E0B"
  motivation-hover: "#D97706"
  motivation-soft: "#FEF3C7"
  on-motivation: "#451A03"

  success: "#059669"
  success-soft: "#D1FAE5"
  on-success: "#FFFFFF"

  warning: "#D97706"
  warning-soft: "#FEF3C7"
  on-warning: "#FFFFFF"

  danger: "#DC2626"
  danger-soft: "#FEE2E2"
  on-danger: "#FFFFFF"

  info: "#2563EB"
  info-soft: "#DBEAFE"
  on-info: "#FFFFFF"

  review-again: "#DC2626"
  review-hard: "#D97706"
  review-good: "#2563EB"
  review-easy: "#059669"

  focus-ring: "#93C5FD"

dark:
  background: "#0B1120"
  surface: "#111827"
  surface-raised: "#1F2937"
  surface-muted: "#334155"
  border: "#334155"
  border-strong: "#475569"

  text-primary: "#F8FAFC"
  text-secondary: "#E5E7EB"
  text-muted: "#94A3B8"
  text-disabled: "#64748B"

  primary: "#60A5FA"
  primary-hover: "#93C5FD"
  primary-active: "#BFDBFE"
  primary-soft: "#1E3A8A"
  primary-subtle: "#172554"
  on-primary: "#06111F"

  motivation: "#FBBF24"
  motivation-hover: "#FCD34D"
  motivation-soft: "#78350F"
  on-motivation: "#111827"

  success: "#34D399"
  success-soft: "#064E3B"
  on-success: "#052E16"

  warning: "#FBBF24"
  warning-soft: "#78350F"
  on-warning: "#111827"

  danger: "#F87171"
  danger-soft: "#7F1D1D"
  on-danger: "#111827"

  info: "#60A5FA"
  info-soft: "#1E3A8A"
  on-info: "#06111F"

  review-again: "#F87171"
  review-hard: "#FBBF24"
  review-good: "#60A5FA"
  review-easy: "#34D399"

  focus-ring: "#60A5FA"

high-contrast:
  background: "#000000"
  surface: "#0A0A0A"
  surface-raised: "#141414"
  border: "#FFFFFF"

  text-primary: "#FFFFFF"
  text-secondary: "#F5F5F5"
  text-muted: "#D4D4D4"

  primary: "#7DD3FC"
  on-primary: "#000000"

  review-again: "#FCA5A5"
  review-hard: "#FDE68A"
  review-good: "#7DD3FC"
  review-easy: "#86EFAC"
```

accent-presets:
zinc:
primary: "#52525B"
primary-dark: "#A1A1AA"
blue:
primary: "#2563EB"
primary-dark: "#60A5FA"
green:
primary: "#059669"
primary-dark: "#34D399"
rose:
primary: "#E11D48"
primary-dark: "#FB7185"
amber:
primary: "#D97706"
primary-dark: "#FBBF24"
violet:
primary: "#7C3AED"
primary-dark: "#A78BFA"

typography:
defaultFont:
fontFamily: "Inter"
fallback: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"

friendlyFont:
fontFamily: "Plus Jakarta Sans"
fallback: "Inter, ui-sans-serif, system-ui, sans-serif"

dyslexiaFont:
fontFamily: "OpenDyslexic"
fallback: "Comic Sans MS, Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"

scale:
display:
fontFamily: "Inter"
fontSize: "2.25rem"
lineHeight: "2.75rem"
fontWeight: 750
letterSpacing: "-0.04em"

```
headline:
  fontFamily: "Inter"
  fontSize: "1.875rem"
  lineHeight: "2.375rem"
  fontWeight: 750
  letterSpacing: "-0.035em"

title-lg:
  fontFamily: "Inter"
  fontSize: "1.5rem"
  lineHeight: "2rem"
  fontWeight: 700
  letterSpacing: "-0.025em"

title-md:
  fontFamily: "Inter"
  fontSize: "1.125rem"
  lineHeight: "1.625rem"
  fontWeight: 650
  letterSpacing: "-0.015em"

title-sm:
  fontFamily: "Inter"
  fontSize: "1rem"
  lineHeight: "1.5rem"
  fontWeight: 650
  letterSpacing: "-0.01em"

body-lg:
  fontFamily: "Inter"
  fontSize: "1rem"
  lineHeight: "1.65rem"
  fontWeight: 400
  letterSpacing: "0em"

body-md:
  fontFamily: "Inter"
  fontSize: "0.9375rem"
  lineHeight: "1.5rem"
  fontWeight: 400
  letterSpacing: "0em"

body-sm:
  fontFamily: "Inter"
  fontSize: "0.875rem"
  lineHeight: "1.375rem"
  fontWeight: 400
  letterSpacing: "0em"

label-lg:
  fontFamily: "Inter"
  fontSize: "0.9375rem"
  lineHeight: "1.25rem"
  fontWeight: 650
  letterSpacing: "-0.005em"

label-md:
  fontFamily: "Inter"
  fontSize: "0.875rem"
  lineHeight: "1.125rem"
  fontWeight: 650
  letterSpacing: "0em"

caption:
  fontFamily: "Inter"
  fontSize: "0.75rem"
  lineHeight: "1rem"
  fontWeight: 500
  letterSpacing: "0.01em"
```

spacing:
"0": "0px"
"1": "4px"
"2": "8px"
"3": "12px"
"4": "16px"
"5": "20px"
"6": "24px"
"8": "32px"
"10": "40px"
"12": "48px"
"16": "64px"

radius:
xs: "6px"
sm: "10px"
md: "14px"
lg: "18px"
xl: "24px"
"2xl": "28px"
full: "999px"

elevation:
light:
card: "0 1px 2px rgba(15, 23, 42, 0.06)"
card-hover: "0 8px 24px rgba(15, 23, 42, 0.10)"
modal: "0 24px 64px rgba(15, 23, 42, 0.20)"
dark:
card: "none"
card-hover: "none"
modal: "0 24px 64px rgba(0, 0, 0, 0.45)"

motion:
duration:
fast: "120ms"
normal: "180ms"
slow: "260ms"
easing:
standard: "cubic-bezier(0.2, 0, 0, 1)"
emphasized: "cubic-bezier(0.2, 0, 0, 1)"
reducedMotion:
disableConfetti: true
disableCardFlip: true
disableParallax: true
keepEssentialFeedback: true

layout:
mobile:
screenPadding: "20px"
maxContentWidth: "100%"
reviewCardMinHeight: "360px"
reviewButtonLayout: "2x2 grid"
tablet:
screenPadding: "32px"
maxContentWidth: "720px"
reviewCardMinHeight: "420px"
reviewButtonLayout: "horizontal row"
desktop:
screenPadding: "32px"
maxContentWidth: "960px"
reviewMaxWidth: "760px"
reviewCardMinHeight: "460px"
reviewButtonLayout: "horizontal row"

components:
app-shell:
backgroundColor: "{colors.mode.light.background}"
textColor: "{colors.mode.light.text-primary}"
typography: "{typography.scale.body-md}"

card:
backgroundColor: "{colors.mode.light.surface}"
textColor: "{colors.mode.light.text-primary}"
borderColor: "{colors.mode.light.border}"
borderWidth: "1px"
borderStyle: "solid"
radius: "{radius.xl}"
padding: "{spacing.6}"
shadow: "{elevation.light.card}"

flashcard:
backgroundColor: "{colors.mode.light.surface}"
textColor: "{colors.mode.light.text-primary}"
borderColor: "{colors.mode.light.border}"
radius: "{radius.2xl}"
padding: "{spacing.8}"
minHeight: "{layout.mobile.reviewCardMinHeight}"
questionTypography: "{typography.scale.title-lg}"
answerTypography: "{typography.scale.body-lg}"

button-primary:
backgroundColor: "{colors.mode.light.primary}"
textColor: "{colors.mode.light.on-primary}"
hoverBackgroundColor: "{colors.mode.light.primary-hover}"
activeBackgroundColor: "{colors.mode.light.primary-active}"
typography: "{typography.scale.label-lg}"
radius: "{radius.md}"
height: "52px"
padding: "0 18px"

button-secondary:
backgroundColor: "{colors.mode.light.surface-raised}"
textColor: "{colors.mode.light.text-primary}"
borderColor: "{colors.mode.light.border}"
typography: "{typography.scale.label-md}"
radius: "{radius.md}"
height: "44px"
padding: "0 16px"

button-ghost:
backgroundColor: "transparent"
textColor: "{colors.mode.light.text-secondary}"
hoverBackgroundColor: "{colors.mode.light.surface-raised}"
typography: "{typography.scale.label-md}"
radius: "{radius.md}"
height: "40px"
padding: "0 12px"

review-button-again:
backgroundColor: "{colors.mode.light.review-again}"
textColor: "{colors.mode.light.on-danger}"
typography: "{typography.scale.label-lg}"
radius: "{radius.md}"
height: "52px"

review-button-hard:
backgroundColor: "{colors.mode.light.review-hard}"
textColor: "{colors.mode.light.on-warning}"
typography: "{typography.scale.label-lg}"
radius: "{radius.md}"
height: "52px"

review-button-good:
backgroundColor: "{colors.mode.light.review-good}"
textColor: "{colors.mode.light.on-info}"
typography: "{typography.scale.label-lg}"
radius: "{radius.md}"
height: "52px"

review-button-easy:
backgroundColor: "{colors.mode.light.review-easy}"
textColor: "{colors.mode.light.on-success}"
typography: "{typography.scale.label-lg}"
radius: "{radius.md}"
height: "52px"

input:
backgroundColor: "{colors.mode.light.surface}"
textColor: "{colors.mode.light.text-primary}"
placeholderColor: "{colors.mode.light.text-muted}"
borderColor: "{colors.mode.light.border}"
focusBorderColor: "{colors.mode.light.primary}"
focusRingColor: "{colors.mode.light.focus-ring}"
typography: "{typography.scale.body-md}"
radius: "{radius.md}"
height: "44px"
padding: "0 14px"

badge:
backgroundColor: "{colors.mode.light.primary-soft}"
textColor: "{colors.mode.light.primary-active}"
typography: "{typography.scale.caption}"
radius: "{radius.full}"
padding: "4px 8px"

progress:
trackColor: "{colors.mode.light.surface-muted}"
indicatorColor: "{colors.mode.light.primary}"
radius: "{radius.full}"
height: "8px"
---

---

## Overview

Recall is a local-first flashcard app for people who have a real reason to memorize something but may have never used a spaced-repetition tool before.

The product should make spaced repetition feel obvious, calm, and useful without requiring users to understand FSRS, intervals, lapses, stability, difficulty, or other technical scheduling concepts.

Recall should not feel like a power-user tool that expects users to configure a learning system before they can start. It should feel like a friendly study companion: open the app, see what needs review, review it, and feel steady progress.

The interface should communicate three promises:

1. **You can start without knowing the system.**
2. **Your reviews are timed for you.**
3. **Your data stays under your control.**

The visual language is calm, focused, modern, and trustworthy. It should support long study sessions, mobile-first reviewing, keyboard-first desktop usage, and beginner-friendly onboarding.

## Design Principles

### Beginner-first

Assume new users do not know what spaced repetition is.

Avoid leading with technical terms like FSRS, retention, stability, difficulty, interval, lapse, or scheduler. These concepts can exist in advanced settings and documentation, but the main product surface should explain them in plain language.

Prefer:

> Recall brings cards back before you forget them.

Avoid:

> Recall uses FSRS to optimize your long-term retention curve.

### Calm by default

Study mode should reduce visual noise. Users should see one main task at a time.

The review screen should feel quiet and stable. Avoid busy dashboards, excessive stats, or decorative elements while the user is actively reviewing.

### Motivation without pressure

Recall has XP, levels, achievements, streaks, daily goals, session summaries, confetti, sound effects, and study games. These should encourage consistency without making users feel guilty.

The product should celebrate effort, not punish absence.

Prefer:

> Nice work — you reviewed 24 cards today.

Avoid:

> You lost your streak. Start over.

### Local-first trust

Recall is local-first and privacy-conscious. The design should make this feel reassuring, not technical.

Use plain language around data ownership.

Prefer:

> Your cards are stored on this device.

Avoid:

> SQLite persistence with optional encrypted relay sync.

### Progressive complexity

Advanced features should be available without dominating the default experience.

FSRS optimizer, Anki import, custom study, tags, advanced analytics, keyboard shortcuts, and sync settings should be easy to discover but not required for first-time success.

### Mobile-accessible

Recall is available as desktop and PWA. The mobile experience should be treated as a primary path, not a companion mode.

Touch targets, swipe gestures, review buttons, onboarding, and card creation should work well on small screens.

## Colors

Recall uses a cool neutral foundation with a blue primary accent.

Blue is used for learning, review flow, primary actions, progress, and calm focus. Amber is used for motivation moments such as XP, streaks, level-ups, achievements, and daily goal completion.

The palette should not feel neon, childish, or overly game-like. It should feel clear, friendly, and durable for daily study.

### Primary color

The default primary color is blue.

Use primary blue for:

- Start review
- Show answer
- Good rating
- Selected navigation
- Progress bars
- Active filters
- Primary empty-state action
- Focus rings

Do not overuse primary blue as a background color. It should guide attention, not flood the interface.

### Motivation color

Amber is the motivation accent.

Use amber for:

- XP gained
- Level progress
- Daily goal completion
- Achievement unlocks
- Positive celebratory highlights

Do not use amber for warning states when it appears near gamification. If warning and motivation appear together, prioritize semantic clarity with iconography and text.

### Review action colors

Review buttons use semantic colors:

- **Again:** red
- **Hard:** amber
- **Good:** blue
- **Easy:** green

Do not rely on color alone. Always show text labels. When possible, include simple icons or interval previews.

Recommended review button labels:

- Again
- Hard
- Good
- Easy

Recommended Indonesian labels:

- Ulangi
- Sulit
- Bisa
- Mudah

For Indonesian, prefer “Bisa” over a literal “Bagus” if the product wants a more natural beginner tone. “Bagus” is acceptable if consistency with Anki terminology matters more.

### Dark mode

Dark mode should be calm and study-friendly.

Use deep navy-black backgrounds rather than pure black for the default dark theme. Use surface layering and borders instead of heavy shadows.

In dark mode, accent colors should be lighter than their light-mode equivalents but not neon.

### High-contrast mode

High-contrast mode should prioritize clarity over brand expression.

Use stronger borders, higher text contrast, reduced subtlety, and clear focus indicators. High-contrast mode should not depend on shadows.

### Accent customization

Recall supports multiple accent colors: zinc, blue, green, rose, amber, and violet.

Blue should remain the default because it best matches the product’s calm learning identity. Other accent colors should affect primary UI accents, but review action colors should remain semantic.

Do not recolor Again / Hard / Good / Easy based on the user accent preset unless the user explicitly enables a custom semantic theme.

## Typography

Use Inter as the default font.

Inter is clean, modern, readable, and suitable for a productivity-learning interface. It works well across desktop, mobile, dense settings pages, and long-form card content.

Plus Jakarta Sans may be used for marketing surfaces or a warmer Indonesian-first feel, but the app UI should remain consistent unless there is a strong brand reason to switch.

### Type hierarchy

Use a small, consistent typography scale.

- **Display:** dashboard numbers, daily due count, major empty-state headline.
- **Headline:** onboarding slides, first-run education, major page headings.
- **Title Large:** deck names, review headers, modal titles.
- **Title Medium:** section headings, settings groups, card browser groups.
- **Body Large:** flashcard question and answer text.
- **Body Medium:** general interface text.
- **Body Small:** helper copy, descriptions, secondary metadata.
- **Label:** buttons, tabs, chips, keyboard shortcut labels.
- **Caption:** timestamps, due counts, low-emphasis metadata.

### Flashcard typography

Flashcard content should be highly readable.

Question text should usually be larger than normal body text. Answer text can be similar or slightly smaller depending on content length.

Recommended defaults:

- Short question: 24–28px
- Long question: 18–22px
- Answer: 18–24px
- Explanation: 15–17px
- Metadata: 12–14px

Long cards should not become visually cramped. Use comfortable line-height and allow scrolling inside the card content area when needed.

### Rich content

Recall supports Markdown, LaTeX, code blocks, and cloze deletion.

Markdown content should inherit the flashcard reading style. Code blocks should use a monospace font and a clearly separated surface.

Recommended monospace stack:

```css
font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
```

LaTeX should be visually centered when used as the main card content.

Cloze deletion should be visually distinct but not distracting. Use primary-soft background and primary text for hidden/revealed cloze spans.

### Dyslexia-friendly mode

Recall supports a dyslexia-friendly font option.

When enabled, prioritize readability over visual polish. Increase line-height slightly and avoid dense text blocks.

Recommended changes:

- Increase body line-height by 5–10%.
- Increase paragraph spacing.
- Avoid narrow text columns.
- Keep button labels short and clear.

## Layout

Recall should use a card-centric layout.

The flashcard is the main stage. Everything else should support the review flow.

### App shell

The app shell should have:

- A calm background.
- A clear content column.
- Predictable navigation.
- Minimal visual noise.
- Strong keyboard and touch affordances.

Desktop layout may use a sidebar. Mobile layout should use bottom navigation or a compact top-level menu.

Primary navigation should include:

- Dashboard
- Study / Review
- Decks
- Stats
- Settings

Advanced tools such as card browser, tags, import, custom study, and FSRS optimizer can live under Decks, Tools, or command palette.

### Dashboard layout

The dashboard should answer:

1. What should I study today?
2. How much is due?
3. How am I doing?
4. What can I do next?

Recommended dashboard sections:

- Today’s review card
- Daily goal progress
- Deck list
- Recent activity
- Gentle motivation panel
- Optional study tools

The dashboard should not overwhelm first-time users with advanced analytics.

Good first-run dashboard state:

> You’re ready to start. Try the “How Recall Works” deck to see how review timing helps you remember.

### Review layout

The review screen should be low-distraction.

Recommended order:

1. Top progress indicator.
2. Deck name and remaining count.
3. Main flashcard.
4. Show Answer button.
5. Review buttons after answer reveal.
6. Optional secondary actions: bury, snooze, edit, undo.

Secondary actions should not compete with review actions.

During review, avoid persistent charts, large sidebars, achievement panels, or dense metadata.

### Review button layout

On mobile, use a 2x2 grid:

```text
Again   Hard
Good    Easy
```

On desktop and tablet, use a horizontal row:

```text
Again   Hard   Good   Easy
```

All review buttons should have equal height and clear labels. “Good” may be subtly emphasized as the default, but not so much that users choose it accidentally.

### Card creation layout

Card creation is a major barrier for new users. The editor should feel simple first, powerful later.

Default editor fields:

- Front
- Back
- Deck
- Tags, collapsed or secondary

Advanced fields:

- Markdown preview
- LaTeX helper
- Cloze deletion tools
- TTS options
- Voice input
- Card templates

Voice input should be visually discoverable but not intrusive. Use friendly copy:

> Speak your card instead of typing.

### Onboarding layout

Onboarding should teach the concept before showing features.

Recommended onboarding sequence:

1. What Recall helps with.
2. Why cards come back later.
3. How review buttons work.
4. Pick a starter deck.
5. Set a small daily goal.

Avoid making FSRS the first concept users see.

Recommended first-run copy:

> Recall helps you remember things by showing each card again at the right time.

Then:

> If something feels easy, it comes back later. If it feels hard, it comes back sooner.

Then:

> You do not need to plan the schedule. Just review honestly.

### Starter deck layout

Starter decks should support the vision of first-time adoption.

Recommended starter decks:

- How Recall Works
- UTBK / SNBT Indonesia
- CPNS
- Languages
- Coding
- Medical / Pharmacy

The “How Recall Works” deck should be the default recommendation for brand-new users.

### Stats layout

Stats should be useful but not intimidating.

Beginner stats:

- Cards reviewed today
- Daily goal progress
- Current streak
- Accuracy / remembered rate
- Time spent studying
- XP earned

Advanced stats:

- Retention curve
- Workload forecast
- Rating distribution
- Deck health
- Leeches
- Time-of-day pattern
- FSRS optimizer results

Keep advanced analytics behind progressive disclosure.

## Elevation & Depth

Use elevation sparingly.

Recall should feel calm and tactile, not floaty or glossy.

### Light mode

In light mode, use:

- Soft shadows for important cards.
- Borders for structure.
- Subtle background contrast for sections.
- Slight hover lift for interactive cards.

Avoid heavy shadows, strong gradients, or glassmorphism.

### Dark mode

In dark mode, use:

- Surface layering.
- Borders.
- Slightly brighter raised surfaces.
- Minimal or no shadows.

Do not rely on shadows to separate dark surfaces. Shadows are often invisible or muddy in dark UI.

### Modal depth

Dialogs, sheets, and command palette should feel clearly above the app.

Use a scrim overlay, raised surface, and strong focus state.

Modals should be reserved for focused tasks:

- Import deck
- Confirm destructive action
- Edit settings group
- Achievement details
- Sync setup

Avoid using modals for routine review actions.

## Shapes

Recall should feel rounded, friendly, and modern.

Use roundness to soften the study experience, but avoid making the app feel childish.

Recommended radii:

- Flashcard: 24–28px
- Deck card: 20–24px
- Modal: 24–28px
- Button: 14–16px
- Input: 12–14px
- Badge: full radius
- Progress bar: full radius

Use consistent shape language across desktop and mobile.

Do not mix sharp enterprise-style tables with very soft gamified cards unless the hierarchy is intentional.

## Components

### Flashcard

The flashcard is the most important component in Recall.

It should support:

- Plain text
- Markdown
- LaTeX
- Code blocks
- Cloze deletion
- Images or media in the future
- Long explanations
- Keyboard and touch interaction

Default flashcard structure:

- Optional deck label
- Question
- Optional hint
- Divider after answer reveal
- Answer
- Optional explanation
- Optional metadata

The card should feel spacious. Short cards should be vertically centered. Long cards should remain readable.

### Show Answer button

The Show Answer button is the primary action before answer reveal.

It should be large, centered, and easy to trigger via keyboard or touch.

Recommended labels:

- English: “Show answer”
- Indonesian: “Lihat jawaban”

Keyboard hint can appear subtly:

> Space

Do not make the keyboard hint more prominent than the action label.

### Review buttons

Review buttons appear after the answer is revealed.

Each button should show:

- Rating label
- Optional keyboard shortcut
- Optional next interval preview

Example:

```text
Again
1 · 10m
```

```text
Good
3 · 2d
```

Interval previews should be helpful but visually secondary.

For beginners, consider hiding exact intervals by default and showing plain-language hints:

- Again: “Soon”
- Hard: “Later today”
- Good: “In a few days”
- Easy: “Later”

Advanced users can enable exact interval previews.

### Deck card

Deck cards should be scannable.

A deck card should show:

- Deck name
- Due count
- New count
- Review count
- Daily progress
- Optional last studied date

The most important number is due count.

Avoid showing too many scheduling details on deck cards.

### Daily goal card

Daily goal should motivate without pressure.

Use amber for completion and celebration.

Recommended states:

- Not started: “Start small today.”
- In progress: “12 of 30 cards reviewed.”
- Completed: “Daily goal complete.”
- Missed yesterday: “Ready for a fresh session?”

Avoid guilt-based language.

### XP and level component

XP should feel rewarding but secondary to learning.

Use XP in:

- Session summary
- Achievement unlocks
- Level progress
- Dashboard motivation panel

Avoid placing XP directly beside every review action if it distracts from honest rating.

### Achievement component

Achievements should celebrate meaningful milestones.

Good achievement categories:

- First review
- First deck created
- Daily goal completed
- 3-day streak
- 7-day streak
- 100 cards reviewed
- High consistency
- First import
- First custom card

Achievement popups should be brief and dismissible. Respect reduced-motion settings.

### Session summary

After a review session, show:

- Cards reviewed
- Rating breakdown
- XP earned
- Daily goal progress
- Time spent
- New achievements
- Next suggested action

The summary should feel satisfying but not overwhelming.

Recommended primary action:

> Continue studying

Recommended secondary action:

> Back to dashboard

### Empty states

Empty states should teach and encourage.

Examples:

No decks:

> Create your first deck or try a starter deck.

No cards due:

> You’re all caught up. Recall will bring cards back when it is time to review them.

No stats yet:

> Review a few cards and your progress will appear here.

No search results:

> No cards matched that search.

Avoid empty states that feel like errors.

### Import flow

Anki and CSV import should feel safe and understandable.

Communicate:

- What will be imported.
- Whether review history is preserved.
- Where the data will be stored.
- What the user can change before confirming.

For first-time users, avoid making import the dominant onboarding path unless they already have decks.

### Sync setup

Sync is optional.

The UI should clearly communicate:

- Recall works without an account.
- Data stays local by default.
- Sync is opt-in.
- Sync is encrypted.

Recommended copy:

> Sync is optional. Recall works fully offline, and your cards stay on this device unless you choose to sync.

Avoid leading with encryption jargon before explaining the user benefit.

### Command palette

The command palette is a power-user feature but should remain polished.

It should support:

- Start review
- Add card
- Search cards
- Open deck
- Open settings
- Import deck
- Toggle theme
- Show shortcuts

The command palette should not be required for core usage.

### Focus timer

The focus timer should feel calm and optional.

Use minimal UI:

- Time remaining
- Start / pause
- Presets: 15, 25, 45 minutes
- Ambient sound selector
- End session action

Avoid making the focus timer feel like a separate productivity app.

### Match game

The match game should feel like a light study variation, not the main product.

Use it as a secondary mode for motivation and variety.

Do not let game visuals overpower the calm Recall identity.

## Iconography

Use Lucide-style line icons.

Icons should be:

- Simple
- Rounded
- Consistent stroke width
- Paired with labels for important actions
- Decorative only when meaning is obvious

Recommended icon usage:

- Brain or cards for study
- Calendar for review schedule
- Flame or spark for streak
- Trophy for achievement
- Shield or lock for privacy
- Upload for import
- Volume for TTS
- Mic for voice input
- Keyboard for shortcuts

Avoid overly playful icons in core review flows.

## Motion

Motion should be quick, subtle, and purposeful.

Use motion for:

- Card reveal
- Button feedback
- Session completion
- Achievement unlock
- Progress changes
- Small state transitions

Avoid excessive animation during review.

### Card reveal

Card reveal may use a subtle fade or vertical expansion. A literal 3D flip can be used only if it remains fast and does not reduce readability.

### Confetti

Confetti should be reserved for meaningful moments:

- Daily goal completed
- Level up
- Major achievement
- First completed session

Confetti should respect reduced-motion settings.

### Sound effects

Sound effects should be optional and easy to disable.

Use gentle audio cues:

- Card flip
- Correct / success
- Level up
- Session complete

Avoid harsh negative sounds for Again or missed goals.

## Accessibility

Recall should be accessible by default.

### Contrast

Text and controls must meet WCAG AA contrast expectations.

Review buttons must remain readable in both light and dark mode. Do not rely on color alone to communicate rating meaning.

### Keyboard support

Keyboard support is a core part of Recall.

Important shortcuts:

- Space: reveal answer
- 1–4: rate Again / Hard / Good / Easy
- R: start review
- B: bury card
- S: snooze card
- Ctrl+N: quick-add card
- Ctrl+K: command palette
- T: toggle text-to-speech
- ?: show shortcuts

Keyboard focus must always be visible.

### Screen reader support

Interactive controls should have clear accessible names.

Avoid icon-only buttons without labels.

Review buttons should expose both rating and meaning.

Example:

```text
Good, review this card again in 2 days
```

### Touch targets

Minimum touch target size should be 44px.

Primary review actions should be 48–56px tall.

Swipe gestures should supplement buttons, not replace them.

### Reduced motion

Respect reduced-motion preferences.

When reduced motion is enabled:

- Disable confetti.
- Replace card flips with fades.
- Remove decorative motion.
- Keep essential feedback visible.

### High-contrast mode

High-contrast mode should be a first-class theme.

Use:

- Strong borders
- Clear text
- Visible focus rings
- Reduced reliance on subtle surfaces
- Clear selected states

## Localization

Recall supports English and Bahasa Indonesia.

Indonesian localization should not feel like a direct mechanical translation. Use natural learning-oriented language.

### Tone

Use clear, friendly, everyday language.

Prefer:

> Kartu ini akan muncul lagi nanti.

Avoid:

> Interval kartu telah dijadwalkan ulang berdasarkan retensi.

### Important term guidance

Recommended Indonesian terms:

- Review: “Review” or “Latihan”
- Deck: “Deck” or “Paket kartu”
- Card: “Kartu”
- Due: “Perlu direview”
- Again: “Ulangi”
- Hard: “Sulit”
- Good: “Bisa”
- Easy: “Mudah”
- Streak: “Runtutan”
- Daily goal: “Target harian”
- Achievement: “Pencapaian”

For technical users, English terms can appear in advanced settings. For beginners, use plain Indonesian explanations.

### Onboarding copy

Recommended English onboarding copy:

> Recall helps you remember things by showing each card again at the right time.

> If a card feels easy, it comes back later. If it feels hard, it comes back sooner.

> You do not need to plan your review schedule. Just answer honestly.

Recommended Indonesian onboarding copy:

> Recall membantumu mengingat dengan menampilkan kartu lagi di waktu yang tepat.

> Kalau sebuah kartu terasa mudah, kartu itu akan muncul lebih lama lagi. Kalau terasa sulit, kartu itu akan muncul lebih cepat.

> Kamu tidak perlu mengatur jadwal review sendiri. Cukup jawab dengan jujur.

## Content Strategy

Recall should explain concepts only when users need them.

### First-run education

Teach:

- What a flashcard is.
- Why cards come back.
- How to answer review buttons.
- How to start with a small daily goal.

Do not teach:

- FSRS internals.
- Retention curves.
- Stability and difficulty.
- Scheduling parameters.

### Settings copy

Settings can be more technical, but should still explain impact.

Example:

> FSRS optimizer adjusts scheduling based on your review history. Most users can leave this off until they have reviewed cards for a while.

### Privacy copy

Use trust-building plain language.

Examples:

> Your cards are stored on this device.

> Recall works without an account.

> Sync is optional and encrypted.

Avoid vague claims like:

> Military-grade privacy.

## Do's and Don'ts

### Do

- Make the first session easy to start.
- Explain spaced repetition in plain language.
- Keep review mode visually quiet.
- Use blue for primary learning actions.
- Use amber for positive motivation.
- Use semantic colors for review ratings.
- Pair colors with text labels.
- Make mobile review feel first-class.
- Keep advanced features discoverable but secondary.
- Use encouraging copy.
- Respect reduced motion and accessibility settings.
- Make local-first privacy understandable.

### Don't

- Do not lead onboarding with “FSRS” as the main value proposition.
- Do not assume users know Anki terminology.
- Do not make the dashboard feel like an analytics cockpit.
- Do not overuse gamification visuals.
- Do not punish users for missing a day.
- Do not rely on color alone for Again / Hard / Good / Easy.
- Do not hide core actions inside the command palette.
- Do not make import/setup mandatory before studying.
- Do not use heavy shadows in dark mode.
- Do not make high-contrast mode an afterthought.

## Implementation Notes

Recall uses React, TypeScript, Tailwind CSS, and shadcn/ui.

Design tokens should map cleanly into Tailwind theme variables and CSS custom properties.

Recommended CSS variable naming:

```css
--background
--surface
--surface-raised
--border
--border-strong

--text-primary
--text-secondary
--text-muted

--primary
--primary-hover
--primary-active
--primary-soft
--on-primary

--motivation
--motivation-soft
--on-motivation

--success
--warning
--danger
--info

--review-again
--review-hard
--review-good
--review-easy

--radius-card
--radius-button
--radius-input
--focus-ring
```

Use semantic tokens in components rather than hard-coded colors.

Prefer:

```tsx
<Button variant="primary">Start review</Button>
```

Avoid:

```tsx
<button className="bg-blue-600 text-white">Start review</button>
```

Theme switching should affect semantic tokens, not component logic.

Accent color customization should update primary tokens while preserving semantic review colors.

## Product Surface Priorities

The visual design should support the project’s current strategic priority:

1. Fix the core review promise.
2. Make onboarding beginner-friendly.
3. Make Indonesian-first use cases feel native.
4. Improve mobile access.
5. Keep advanced power-user features available but secondary.

## Anti-Slop Guidelines

When generating or reviewing UI — whether hand-written or produced by an AI design tool (Open Design, v0, screenshots-to-code, etc.) — these AI-generic tells are prohibited even when they feel "safe" or "modern." They read as unoriginal and erode product trust. Reference: impeccable.style/slop.

These rules are compatible with the brand above. Inter, the 24px card radius, and the violet accent preset are intentional Recall choices and are NOT slop. The patterns below are the generic ones to reject.

### Color & decoration

- **No purple/violet gradients.** A violet *accent preset* (user choice) is allowed; a purple-to-blue gradient smeared across buttons, text, orbs, or backgrounds is not.
- **No glassmorphism, neon glow, or blurred orbs.** Frosted/blur cards and glow borders are decoration, not layering solutions. Use surface + border instead.
- **No decorative gradient text or floating badges.** Motion and gradient belong to meaning, not decoration.
- **No "cyberpunk-by-default" neon-on-dark.** Dark mode uses deep navy-black + surface layering (see Dark mode above), never cyan/neon glow.

### Typography

- **Pair a distinctive display face with a refined body face.** Inter is the body/default face; for display headings use a face with personality (Bricolage Grotesque, Sora, or Plus Jakarta Sans) rather than Inter at every size. One font for the entire UI reads as flat and generic.
- **Keep a strong type hierarchy.** Steps must contrast (aim for >= 1.25 ratio between sizes). Flat hierarchy — heading, subheading, and body all near the same size — is a slop tell. Use the scale in Typography above.
- **No crushed letter-spacing.** Tighten display type optically, not destructively. Do not pull tracking so tight that glyphs lose their shapes.
- **No oversized italic serif hero.** Roman display is preferred for product UI. Italic serif headlines are the universal AI-startup hero cliche.
- **No all-caps body text.** Uppercase is for short labels and kickers only.

### Layout & components

- **No side-tab accent border.** A thick colored border on one side of a rounded card is the single most recognizable AI-UI tell. Use a subtle accent or remove it.
- **No icon tile stacked above a heading.** The rounded-square icon container centered above a title is the universal AI feature-card template. Use side-by-side icon + text, or let the icon sit inline without its own container.
- **No giant icons larger than their label.** When the decoration outweighs the message, priorities are backwards.
- **No card-ocalypse.** Avoid cards inside cards inside cards. Cap nesting at two levels.
- **No repeated section-kicker scaffolding.** Repeating tiny uppercase tracked labels above every section heading ("FEATURES", "WHAT YOU GET") turns a real page into AI editorial scaffolding. Use stronger structure or real content instead.
- **No hero eyebrow pill.** A tiny uppercase letter-spaced label or pill chip sitting above an oversized headline is the default AI SaaS hero. Drop the eyebrow or fold it into the headline.
- **No extreme radius on small elements.** Cards top out around 12-16px; reserve full-pill (999px) for tags, chips, and buttons. Over-rounding small cards into blobs is slop. (Note: the 24px `radius-xl` token is for large surface cards, not small controls — this is intentional, not slop.)

### Motion

- **No motion without meaning.** Avoid bouncing buttons, wiggling icons, gradient-text shimmer, and floating badges. Subtle hover elevation is acceptable; decorative animation is not.

### Contrast

- **Never gray text on a colored background.** Looking good and being readable must not conflict. Enforce the semantic tokens in Colors above.

### Review checklist

Before shipping or approving any generated UI, confirm:

1. Display font differs from body font.
2. No purple/violet gradient, glass, or neon.
3. No side-tab border, no icon-tile-above-heading, no giant icons.
4. Type scale has clear contrast (>= 1.25 step ratio).
5. Card nesting <= 2 levels.
6. Motion is purposeful only.
7. Contrast passes on every surface.

Recall is not trying to beat Anki at being infinitely configurable. Recall should win by being easier to start, calmer to use, and more approachable for learners who would otherwise never try spaced repetition.
