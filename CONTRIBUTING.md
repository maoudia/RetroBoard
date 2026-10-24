# Contributing

```bash
pnpm install
pnpm generate && pnpm dev:worker
```

Before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm generate && pnpm e2e
```

Conventions:
- Domain logic goes in `packages/domain` (pure, tested); use cases in `packages/application`; never in components or the Durable Object.
- Every user-facing string goes through `t()`; add the key to `packages/i18n/src/fr.ts` and `en.ts`.
- Never log note text, names, client ids or raw room ids.
- Keep the CSP strict: no inline scripts or styles, no `unsafe-*`.

## License

RetroBoard is licensed under the GNU AGPL-3.0 (see LICENSE and NOTICE). External contributions will require signing the CLA once it is set up, so that MAIDAF EURL can also offer a commercial license.
