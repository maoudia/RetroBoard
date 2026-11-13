# Tasks

## 1. Product video

- [ ] 1.1 Storyboard (7 scenes) reviewed by the owner; verify approval comment
- [ ] 1.2 HTML/CSS animated walkthrough with captions, pause and reduced-motion storyboard (fr/en); verify e2e, CSP check and a Lighthouse budget
- [ ] 1.3 Playwright recording script producing WebM for social media; verify the CI artifact

## 2. Content

- [ ] 2.1 "Open code, fair business" section with license and repository links; verify e2e link targets
- [ ] 2.2 Pricing section bound to the plan definitions from `licensing-and-monetization`; verify unit test that landing prices match plan config
- [ ] 2.3 Feature sections refresh and pseudo-locale overflow check; verify visual regression

## 3. Landing speed and accessibility (R2 gate: Lighthouse mobile above 95)

- [ ] 3.1 Prerender the landing at build time (hybrid rendering: `/` server-rendered, every other route a client shell, ADR-0038); no inline style attribute in the prerendered markup, no store snapshot in the payload, the visitor's language applied after hydration; verify `pnpm generate` fails on an inline style and e2e `landing-basics` checks the served HTML
- [ ] 3.2 Accessibility 100 on the landing: a target for the skip link, full contrast of the animated hero mock at every frame; verify Lighthouse accessibility 100 and the axe landing spec
- [ ] 3.3 Landing budgets: per-page minimums in `quality/lighthouse-budgets.json` (performance 0.95, accessibility 1); verify the evaluator's unit test and `pnpm lighthouse` before and after, numbers in the pull request
