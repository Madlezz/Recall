# Accessibility Guide

Recall is designed to be accessible to all users. This guide covers keyboard navigation, screen reader support, and accessibility features.

## Keyboard Shortcuts

### Global Shortcuts

| Keys | Action |
|------|--------|
| `Ctrl+Shift+N` | Quick-add card (works even when app is minimized) |
| `?` | Show keyboard shortcuts help |

### Study Mode

| Keys | Action |
|------|--------|
| `Space` | Reveal answer |
| `1` | Rate: Again |
| `2` | Rate: Hard |
| `3` | Rate: Good |
| `4` | Rate: Easy |
| `B` | Bury card (skip for today) |
| `S` | Snooze card (review in 2 hours) |
| `Ctrl+Z` | Undo last review |
| `R` | Start review |

### Card Browser

| Keys | Action |
|------|--------|
| `Tab` | Navigate between elements |
| `Enter` | Open card for editing |
| `Space` | Select/deselect card |
| `Ctrl+A` | Select all visible cards |

### General Navigation

| Keys | Action |
|------|--------|
| `Tab` | Move focus to next element |
| `Shift+Tab` | Move focus to previous element |
| `Enter` or `Space` | Activate focused element |
| `Escape` | Close dialog or cancel action |

## Screen Reader Support

Recall includes comprehensive ARIA labels and roles for screen reader compatibility:

- **Study mode**: Card content, rating buttons, and progress are announced
- **Dashboard**: Deck names, due counts, and statistics are properly labeled
- **Card browser**: Table headers are sortable and announce sort direction
- **Dialogs**: Modal dialogs trap focus and announce titles
- **Notifications**: Toast messages are announced via live regions

## Visual Accessibility

### High Contrast

Recall supports both light and dark themes with high contrast ratios:

- Light mode: WCAG AA compliant (4.5:1 for text)
- Dark mode: Optimized for reduced eye strain

### Color Independence

- Card states use both color and text labels (New, Learning, Review, Relearning)
- Buttons include icons alongside text for clarity
- Progress bars use both color and percentage text

### Reduced Motion

Respects the `prefers-reduced-motion` system setting. Animations are minimized when this preference is enabled.

## Focus Management

- **Tab order**: Logical flow through interactive elements
- **Focus visible**: Clear focus indicators on all interactive elements
- **Modal dialogs**: Focus is trapped within dialogs and restored on close
- **Skip links**: Not applicable (single-page app with clear navigation)

## Accessibility Testing

Recall follows WCAG 2.1 Level AA guidelines. Key areas tested:

1. **Keyboard navigation**: All features accessible without mouse
2. **Screen reader**: Tested with NVDA and VoiceOver
3. **Color contrast**: Meets WCAG AA standards
4. **Focus management**: Clear focus indicators and logical tab order
5. **ARIA attributes**: Proper roles and labels for assistive technology

## Reporting Accessibility Issues

If you encounter an accessibility barrier, please open an issue on GitHub with the "accessibility" label. We take accessibility seriously and will prioritize fixes.

## Future Improvements

Planned accessibility enhancements:

- Customizable keyboard shortcuts
- Dyslexia-friendly font option
- Voice input for card creation
- Haptic feedback on mobile
- Enhanced screen reader announcements for study progress
