# Tasks

## 1. States that pass

- [ ] 1.1 `packages/themes/src/color.ts`: `derived(k)` returning the pressed pair, the placeholder pair and the badge pair as the stylesheet builds them; `base.css:78` pressed label in `--text`, `base.css:99` placeholder without opacity; tests at 4.5:1 for all 18 variants; verify `pnpm test` and `contrast-themes.spec.ts`
- [ ] 1.2 `NoteCounter.vue:22-23` on tokens; `apps/web/test/design-tokens.test.ts`: no hex colour in components outside `Landing*` and `pages/index.vue`; verify the guard fails on a seeded hex
- [ ] 1.3 `base.css`: `@media (forced-colors: active)` for `article.note`, `.icon-btn[aria-pressed="true"]`, `.btn-primary`, `:focus-visible`; verify an e2e with `forcedColors: 'active'` asserting a visible note border and pressed state

## 2. A gate that matches the spec

- [ ] 2.1 `tests/e2e/contrast-themes.spec.ts` and `theme-contrast.spec.ts` take their list from `@retroboard/themes`; extend the first with the chat panel open with an unread count and one toolbar panel open; verify 18 tests each, green
- [ ] 2.2 Make `a11y.spec.ts` green on every project (current nightly failures: team-workspaces axe on tv and firefox); verify three consecutive nightly runs
- [ ] 2.3 Add `a11y`, `theme-contrast` and `keyboard` to `tests/e2e/core.json` for Chromium; record the added minutes in `docs/quality.md`; verify `pnpm e2e:core` locally and the PR workflow time
- [ ] 2.4 Lighthouse (needs the maintainer): add the job to `nightly.yml`, or reword the requirement in `platform-security` to the local gate; verify the spec and the pipeline say the same thing
- [ ] 2.5 `docs/accessibility.md`: derived states, forced colours, what gates a pull request; verify `pnpm verify`
