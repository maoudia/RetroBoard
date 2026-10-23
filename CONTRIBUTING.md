# Contributing

```bash
npm install
npm run generate && npm run dev:worker
```

Before opening a PR:

```bash
npm run lint && npm run typecheck && npm test
npm run generate && npm run e2e
```

Conventions:
- Domain logic goes in `shared/domain` (pure, tested), not in components or the Durable Object.
- Every user-facing string goes through `t()`; add the key to `app/i18n/fr.ts` and `en.ts`.
- Never log note text, names, client ids or raw room ids.
- Keep the CSP strict: no inline scripts or styles, no `unsafe-*`.
