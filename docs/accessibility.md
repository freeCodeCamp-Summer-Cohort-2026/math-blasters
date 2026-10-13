# Accessibility

The baseline the next pass starts from. Tested by @imsomilg in October 2026
for [#128](https://github.com/freeCodeCamp-Summer-Cohort-2026/math-blasters/issues/128).

## Colour contrast

Measured against WCAG 2.1 AA for every `tokens.css` surface, in both themes:
4.5:1 for text (1.4.3) and 3:1 for focus rings, input outlines and state
borders (1.4.11).

- All text passed in both themes, including the mango "not yet" card.
- Three non-text failures, each fixed by a token rather than in a component:

| What failed | Before | Token now | After (light / dark) |
| --- | --- | --- | --- |
| Focus ring | 1.75 to 2.14 in light | `--focus-ring` | 4.86 to 5.93 / 5.68 to 8.52 |
| "Not yet" card and chip border | 1.93 on `--warning-soft` in light | `--warning` | 4.51 / 6.37 |
| Answer input border | 1.53 to 1.72 light, 1.69 to 1.80 dark | `--input-border` | 3.79 to 4.25 / 3.80 to 4.05 |

The hero highlight's hard-coded colour also moved to `--on-highlight-fill`.

`web/tests/contrast.test.ts` measures these pairs from `tokens.css` in both
themes on every test run. A token change that drops below the threshold fails
CI. Add a pair there when a component puts a new token on a new surface.

## Motion

Every animation and transition respects `prefers-reduced-motion: reduce`:

- `global.css` cuts all animations and transitions to 0.01ms, and stops the
  spinner and skeleton shimmer.
- The feedback card's enter, pop, burst, spin and rewind animations are off;
  the check mark is shown already drawn.
- The lesson progress bar fills without a transition.
- The 400ms minimum on the `checking` state (#95) is skipped, so the result
  shows at once (`useFeedbackState.ts`, covered by `useFeedbackState.test.ts`).

## Tools

- `web/tests/contrast.test.ts`: WCAG contrast ratios computed from the tokens.
- `web/tests/a11y.test.tsx`: `vitest-axe` on every route. jsdom applies no
  stylesheets, so axe can't check contrast there, which is why the token test
  exists.
- A manual read of every stylesheet and component for animation, transition
  and reduced-motion rules.

## Still open

- The keyboard pass,
  [#126](https://github.com/freeCodeCamp-Summer-Cohort-2026/math-blasters/issues/126).
  Link its findings here once they exist.
- The screen-reader pass,
  [#127](https://github.com/freeCodeCamp-Summer-Cohort-2026/math-blasters/issues/127).
  Link its findings here once they exist.
- No axe run in a real browser. Contrast is checked per token pair, not per
  rendered page, so text over an image or a gradient isn't covered.
- Disabled buttons (muted text on `--border-strong`, 3.65 light, 4.06 dark) are
  below 4.5:1. WCAG exempts inactive controls.
