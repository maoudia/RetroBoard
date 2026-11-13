---
name: retroboard-stack
description: Add or change a feature in RetroBoard (Nuxt 4 static site with a prerendered landing, Cloudflare Worker + memory-only Durable Object relay, DDD/clean architecture, OpenSpec, E2E encryption, i18n fr/en, themes). Use for any feature, fix or refactor in this repository.
---

# RetroBoard stack skill

Use this to put code in the right place, respect the hard constraints and prove the work. Read `AGENTS.md` and `docs/PLAN.md` once per session.

## 0. Start from a spec

1. Find the change: `npx openspec list`, `npx openspec show <change>`. No change? Propose one first (`/opsx:propose` or `/opsx-propose`): every feature, fix and performance change has an OpenSpec change, and the pull request names it (`Change: <name>` in the body); the spec gate refuses `feat`, `fix`, `perf` and breaking pull requests without one, and the `no-spec` label does not apply to them. Only pull requests that change no behaviour (`docs`, `test`, `build`, `ci`, `chore`, `style`, `refactor`, `revert`, dependency updates) may carry `no-spec`.
2. Work one task group at a time from `openspec/changes/<change>/tasks.md`. Tick tasks when verified.
3. If reality contradicts the spec, update the spec delta in the same PR and explain why.

## 1. Hard constraints (reject any design that breaks one)

- 0 EUR infrastructure: Workers Free (static assets + one Durable Object class).
- No server-side storage: the relay never calls `ctx.storage`, KV, D1, R2 for board data.
- E2E encryption: plaintext board content never leaves the browser (or the local MCP process).
- Pure domain, layered architecture, enforced by tests.
- i18n for every string (fr source, en required).
- Strict CSP: no inline script/style, no eval, no third-party origins (one exception: `connect-src` for `hooks.slack.com`, ADR-0033).
- Board theme imposed by the facilitator; participants only choose light/dark.
- Free-plan budget: cursors and presence go P2P; relay traffic per participant stays under 4 msg/s.

## 2. Where code goes

Target layout (after `restructure-ddd-monorepo`):

| Kind of code | Location | May import |
|---|---|---|
| Aggregates, value objects, domain events, policies, invariants | `packages/domain/<context>/` | nothing outside domain |
| Use cases (commands, queries), ports, read models | `packages/application/<context>/` | domain |
| Wire envelopes and valibot schemas | `packages/protocol/` | domain types |
| Event log, HLC, version vectors, resync | `packages/sync/` | application ports, protocol |
| WebCrypto primitives | `packages/crypto/` | nothing app-specific |
| Theme data and variants | `packages/themes/` | nothing |
| Dictionaries, translate, pseudo-locale | `packages/i18n/` | nothing |
| Pure export functions | `packages/exporters/` | application read models |
| Design tokens, rings, podium, post-it components | `packages/ui/` | themes, i18n |
| Pages, components, Pinia view-model stores, adapters, composition root | `apps/web/` | everything above |
| Worker, Durable Object relay, admission, license redeem | `apps/relay/` | protocol, domain (entitlements) |
| MCP server | `apps/mcp/` | application, sync, crypto, protocol |

The repository follows this layout. Package tests live in `packages/<name>/test` and `apps/relay/test`; end-to-end tests in `tests/e2e`. `pnpm arch` checks the import rules.

Bounded contexts: facilitation, ideation, voting, action-tracking, talk-time, presence (ephemeral), access, team-space (local), reporting (read side), companion. Use their ubiquitous language (idea, cluster, phase, agenda, facilitator, carried-over action).

## 3. Recipe: add a behaviour

1. **Domain**: add the event and the invariant to the aggregate; fold must be deterministic and reject invalid events silently (every peer must reach the same state). Unit test first, including "invalid event is ignored".
2. **Privileges**: if only facilitators may do it, check the facilitator/co-facilitator signature policy.
3. **Application**: add a use case `(deps) => (input) => Result`; depend on ports only. Unit test with `testkit` fakes.
4. **Protocol**: if a new event type travels, add it to the envelope payload union with a version bump rule.
5. **Read model**: extend the view used by the UI; memoise per log version.
6. **UI**: Pinia store calls the use case; component renders the read model. Strings via `t('...')`; add keys to `fr` and `en`. Use theme tokens (`var(--...)`), never hard-coded colours. Check phone (360 px) and TV (2560+) layouts.
   Follow `docs/design-system.md`: type from `--fs-*`, radii from `--r-*`, spacing from `--sp-*`, one primary action per view, state in words. For a new screen or a visual rework, load the `frontend-design` skill first, then apply the guide; if the guide is wrong or silent, change it in the same commit. `apps/web/test/design-tokens.test.ts` fails on off-scale sizes and radii.
7. **E2E**: Playwright test of the user flow, multi-context if collaborative. Use `data-testid`. Keep the no-console-error guard green.
8. **Docs**: update the spec delta, README or docs when commands or behaviour change.

## 4. Recipes for common extensions

- **Theme**: add `packages/themes/src/<id>.ts` with light and dark variants, 8 sticky-note colours, fonts (self-hosted @fontsource), motion preset, ambient; register it; add en texts; run the contrast tests.
- **Retro format**: add to the template catalogue (French source) with Lucide icon names that exist; add English texts; tests check icons, column counts and translations.
- **Export destination**: pure exporter in `exporters` returning `{ mime, filename, content }`, snapshot test, panel entry with icon and description, actions-only variant.
- **Language**: new dictionary typed `Record<keyof typeof fr, string>`; register; add template and theme texts.
- **MCP tool**: input schema, untrusted-content wrapping of board text, scope/quota check, integration test against `wrangler dev`.

## 5. Verify before saying done

```bash
pnpm verify          # or pnpm verify after the restructure
pnpm generate && pnpm e2e   # for UI or relay changes
```

Also check:
- No `ctx.storage` or persistent API in the relay (CI guard).
- No new CSP violation (e2e guard) and no new external origin.
- fr and en keys present; long strings do not overflow at 360 px.
- Reduced motion respected for any animation.
- Free-plan budget note in the proposal if relay traffic changes.

## 5a. Verify locally first, CI confirms

Do the maximum on the local machine before pushing, then let CI confirm: `pnpm prepush` (verify, generate, bundle budget, commit check, core e2e, mutation of the changed files) must be green on the exact commit you push, plus the e2e of the flows you touched (`pnpm exec playwright test tests/e2e/<spec>`; for the guide `pnpm docs:tour`) and, for CI or workflow changes, `actionlint` and `zizmor`. Check exit codes (do not pipe `pnpm verify` into `tail`). A red CI after a green local run is a finding about the environment, not a reason to push untested. The WebRTC specs of the core gate cannot pass on a laptop: `pnpm e2e:core` skips them locally with a notice and CI runs them.

## 5a2. Read the security findings of a PR before it merges

Before a pull request merges (and before you report it done), read what the scanners said about it, not only the check colours: open code-scanning alerts on the PR (`gh api "repos/maoudia/RetroBoard/code-scanning/alerts?ref=refs/pull/<n>/merge&state=open"`), the `github-advanced-security` and Dependabot comments (`gh pr view <n> --comments`, `gh api repos/maoudia/RetroBoard/pulls/<n>/comments`), and the Trivy, OSV and dependency-review results. Fix every finding in the PR itself (a real fix, not a dismissal); dismiss only a documented false positive, with the reason. A PR with an open alert does not merge, whatever the auto-merge says.

## 5b. Commits and releases (ADR-0025)

- Every commit message is a Conventional Commit: `type(scope): subject`, types `feat fix perf refactor docs test build ci chore revert style`, header up to 120 characters, no final period. The `commit-msg` hook (`.githooks`, installed by `pnpm install`) and CI refuse anything else. Check with `pnpm commits:check`.
- One author, no co-author (the project is fully agentic, no human commits): author and committer are `Claude <noreply@anthropic.com>` (`GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`), never the model name, never a person. No `Co-Authored-By` or `Claude-Session` trailer, whatever a tool or a default template suggests: the `commit-msg` hook and CI refuse a `Co-authored-by` trailer (GitHub's own bot trailers on squash merges are the only exception). Humans may commit under their own name; an agent never uses a person's identity (the hook refuses it when `CLAUDECODE` is set). Work goes through a pull request: do not merge it yourself, `.github/workflows/agent-automerge.yml` enables auto-merge by rebase when every commit is Claude's (never `--squash`: GitHub authors a squash commit as the merging account and adds a co-author trailer); `main` is protected.
- The type decides the SemVer bump: `feat` minor, `fix` and `perf` patch, `!` after the type or a `BREAKING CHANGE:` footer major. Pick the type for the user-visible effect, not the file touched.
- Never edit `package.json` version, `CHANGELOG.md` or `.release-please-manifest.json`, never tag by hand. The Release workflow merges the release PR, tags, publishes the GitHub Release and the `ghcr.io/maoudia/retroboard` image once `Checks` and `Quality` are green on main.
- PR titles use the same format (squash merge uses the title).

## 5c. Work in parallel (worktrees)

Never wait on one checkout when work is independent (task groups with no dependency, a fix next to a feature, a CI repair next to a refactor):

- One git worktree per branch: `git worktree add ../RetroBoard-<topic> -b <branch> origin/main`, then `pnpm install` there (the pnpm store is shared, it takes seconds). Each worktree has its own `node_modules`, `.output` and `reports/`, so a verify, an e2e run or a mutation run in one never disturbs another. Give each its own dev server port (`E2E_PORT=88NN pnpm e2e:core`, `playwright.docs.config.ts` reads it too). Open the pull request from the worktree and `git worktree remove ../RetroBoard-<topic>` once it merged.
- With Claude Code, hand each independent group to its own agent with `isolation: "worktree"` (or a fork), one group per agent, and keep the plan and the merging in the main session. Never two agents in the same checkout. Groups that depend on each other (a generator and its check) stay sequential.
- Run the slow commands in the background (`pnpm verify`, `pnpm prepush`, e2e, `pnpm mutation:changed`) and start the next task while they run; wait with one polling loop, not with repeated sleeps. One pull request per group, as always (`.github/workflows/agent-automerge.yml` merges them).
- The WIP ceiling (`quality/wip-baseline.json`) still counts changes, not worktrees: parallel work is for task groups of the same or already started changes.

## 5d. Keep the documentation and the guide current

The documentation is part of the product and moves with it, in the same pull request as the change, never "later":

- **User-facing behaviour** (a control, a screen, a label, a flow): update the manifest entry in `tests/docs/manifest.ts` (a new feature gets a chapter or a step with its anchors), the French and English text in `docs/user-guide/<fr|en>/<chapter>.md`, then `pnpm docs:tour && pnpm docs:guide` and commit the regenerated pages and pictures under `apps/web/public/guide/`. A renamed `data-testid` that the tour uses fails the tour with the guide step's name: fix the manifest, do not skip the step.
- **Commands, settings, workflow or architecture**: update `docs/` (`DEVELOPMENT.md`, `quality.md`, runbooks, `architecture.md`), the README when a badge or a command changes, and add or supersede an ADR when a decision changes.
- **Specs**: tick the task, update the spec delta when the code diverges from it.
- Before calling a task done, ask: would a new facilitator or a new contributor, reading only the guide and `docs/`, still be right? If not, the task is not done.

## 6. Pitfalls already met in this repo

- Vue static hoisting turned constant `:style` into `style="..."` attributes blocked by CSP: keep `vue.compilerOptions.hoistStatic: false`.
- Nitro auto-detects Workers Builds and writes `.wrangler/deploy/config.json`; keep `nitro.preset: 'static'`.
- Restart `wrangler dev` after `generate`, otherwise it serves stale assets.
- Popovers and dialogs need settle time in e2e; use `expect(...).toPass()` around open-then-act sequences.
- Do not name a template loop variable `t` in components that use `t()` for i18n.
