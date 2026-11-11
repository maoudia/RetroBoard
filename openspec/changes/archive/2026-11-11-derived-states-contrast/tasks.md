# Tasks

## 1. States that pass

- [x] 1.1 `packages/themes/src/color.ts` `derivedPairs(k)` for the pressed, placeholder and ink-on-danger pairs; `base.css` pressed label in `--text` with an accent underline, placeholder at full opacity; verify tests at 4.5:1 for all 18 variants (`pnpm exec vitest run packages/themes`) and `contrast-themes.spec.ts`
- [x] 1.2 `NoteCounter.vue` on tokens; `apps/web/test/design-tokens.test.ts` ratchet: no component outside the marketing pages gets a new hex colour; verify the guard fails on a seeded hex
- [x] 1.3 `base.css` `@media (forced-colors: active)` for `article.note`, pressed `.icon-btn` and `.btn-primary`; verify `tests/e2e/forced-colors.spec.ts` (it fails without the layer)
