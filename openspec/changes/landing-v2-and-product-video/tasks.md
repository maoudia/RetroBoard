# Tasks

## 1. Product video

- [ ] 1.1 Storyboard (7 scenes) reviewed by the owner; verify approval comment
- [x] 1.2 HTML/CSS animated walkthrough with captions, pause and reduced-motion storyboard (fr/en); verify e2e, CSP check and a Lighthouse budget (`tests/e2e/landing-walkthrough.spec.ts`; built on the draft storyboard, the owner's approval of 1.1 is still pending)
- [x] 1.3 Playwright recording script producing WebM for social media (`pnpm video:record`, `scripts/video/record-walkthrough.mjs`); the CI artifact step needs a workflow change, left to a maintainer request

## 2. Content

- [x] 2.1 "Built in public, source available" section with PolyForm Noncommercial license and repository links; verify e2e link targets
- [x] 2.2 Feature sections refresh and pseudo-locale overflow check; verify visual regression
