# Tasks

## 1. A gate that matches the spec

- [x] 1.1 `tests/e2e/contrast-themes.spec.ts` and `theme-contrast.spec.ts` take their list from `@retroboard/themes`; extend the first with the chat panel open with an unread count and one toolbar panel open; verify 18 tests each, green
- [x] 1.2 Make `a11y.spec.ts` green on every project (current nightly failures: team-workspaces axe on tv and firefox); verify three consecutive nightly runs
- [x] 1.3 Add `a11y`, `theme-contrast` and `keyboard` to `tests/e2e/core.json` for Chromium; record the added minutes in `docs/quality.md`; verify `pnpm e2e:core` locally and the PR workflow time
- [ ] 1.4 Lighthouse (needs the maintainer): add the job to `nightly.yml`, or reword the requirement in `platform-security` to the local gate; verify the spec and the pipeline say the same thing
- [x] 1.5 `docs/accessibility.md`: what gates a pull request; verify `pnpm verify`
