# Tasks

## 1. Landing speed and accessibility (R2 gate: Lighthouse mobile above 95)

- [x] 1.1 Prerender the landing at build time (hybrid rendering: `/` server-rendered, every other route a client shell, ADR-0038); no inline style attribute in the prerendered markup, no store snapshot in the payload, the visitor's language applied after hydration; verify `pnpm generate` fails on an inline style and e2e `landing-basics` checks the served HTML
- [x] 1.2 Accessibility 100 on the landing: a target for the skip link, full contrast of the animated hero mock at every frame; verify Lighthouse accessibility 100 and the axe landing spec
- [x] 1.3 Landing budgets: per-page minimums in `quality/lighthouse-budgets.json` (performance 0.95, accessibility 1); verify the evaluator's unit test and `pnpm lighthouse` before and after, numbers in the pull request
