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

Commits and releases:
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): subject` with `feat fix perf refactor docs test build ci chore revert style`. A hook (installed by `pnpm install`) and CI refuse anything else; pull request titles follow the same format. Check by hand with `pnpm commits:check`.
- Versions are SemVer and automatic: `feat` bumps the minor number, `fix` and `perf` the patch number, `!` after the type or a `BREAKING CHANGE:` footer the major number. Never edit the version, `CHANGELOG.md` or the manifest by hand.
- When `Checks` and `Quality` are green on main, the Release workflow merges the release PR, tags `vX.Y.Z`, publishes the GitHub Release with the changelog and pushes `ghcr.io/maoudia/retroboard` (see `docs/self-hosting.md`).

Conventions:
- Domain logic goes in `packages/domain` (pure, tested); use cases in `packages/application`; never in components or the Durable Object.
- Every user-facing string goes through `t()`; add the key to `packages/i18n/src/fr.ts` and `en.ts`.
- Never log note text, names, client ids or raw room ids.
- Keep the CSP strict: no inline scripts or styles, no `unsafe-*`.

## License and CLA

RetroBoard is licensed under the GNU AGPL-3.0 (see LICENSE and NOTICE). MAIDAF EURL also offers a commercial license, so a pull request from outside the project needs a signed Contributor License Agreement ([docs/CLA.md](docs/CLA.md), currently a draft awaiting the owner's review).

- The `CLA` check comments on your first pull request. Reply with the sentence it asks for, once: the signature (your GitHub login, the date and the pull request) is stored in `signatures/cla.json` on the `cla-signatures` branch, and covers your later pull requests. Comment `recheck` to run the check again.
- You keep your copyright. The agreement lets MAIDAF EURL ship your contribution under the AGPL and under the commercial license.
- Members of the project, Dependabot, release-please and Claude commits do not sign: the check only runs on pull requests from a fork.
- RetroBoard links to its source code from the footer and from the profile menu (AGPL section 13); keep that link when you change them.
