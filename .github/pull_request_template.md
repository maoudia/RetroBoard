## What and why

## Checklist
- [ ] `Change: <openspec-change>` in this description (required for feat, fix and perf; `no-spec` only for docs, test, build, ci, chore, style, refactor)
- [ ] Verified locally before pushing: `pnpm prepush` (verify, generate, size, commits, core e2e, mutation of the changed files)
- [ ] `npm run lint && npm run typecheck && npm test`
- [ ] New user-facing text exists in `app/i18n/fr.ts` and `app/i18n/en.ts`
- [ ] Domain changes come with a reducer test
- [ ] No board content, names or ids in logs
