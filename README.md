# RetroBoard

[![CI](https://github.com/maoudia/retroboard/actions/workflows/ci.yml/badge.svg)](https://github.com/maoudia/retroboard/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Durable%20Objects-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/durable-objects/)

Real-time, account-free retrospective boards. One link, and the team is in.
Private drafts, votes, groups, shared timer, action plan, 13 retro formats, 9 themes (professional and seasonal), English and French.

> A static Nuxt site served by a Cloudflare Worker. Each board is one SQLite-backed Durable Object, erased 24 h after its last activity.

## Roadmap and contributing with agents

- Master plan, decisions and business model: [docs/PLAN.md](docs/PLAN.md)
- Specs and planned changes ([OpenSpec](https://www.npmjs.com/package/@fission-ai/openspec)): `openspec/specs`, `openspec/changes`
- Agent instructions: [AGENTS.md](AGENTS.md), skill `.claude/skills/retroboard-stack`
- Claude Code: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`. OpenCode: `/opsx-propose`, `/opsx-apply`, `/opsx-archive`.

## Features

| | |
|---|---|
| Real time | Every note, vote, move and column change reaches everyone over a WebSocket (hibernation API, auto ping/pong). |
| Private drafts | Notes stay in your browser until you publish them, with a "flight" animation. |
| Groups | Drag a note onto another to stack it (folded corner, panel with title, dissolve, ungroup). |
| Votes | Per-person limit, optional secret voting (counters hidden by the server, not just the UI). |
| Columns | Add, rename (title, subtitle, icon), reorder, delete. |
| Formats | 13 templates and a suggestion wizard (goal, team mood, time, season). |
| Themes | 5 pro (Studio, Corporate, Slate, Paper, Minimal) and 4 fun (Halloween, Noel, Cyber, Sakura). Tokens, fonts, motion and ambient effects per theme. |
| Profile | Local only: name, avatar, language, "my theme" override, density, reduced motion, sound, recent boards. |
| Export | Markdown, copy as Markdown, CSV (formula-injection safe), JSON. |
| i18n | English and French, auto-detected, switchable. Formats are created in the language of the person who creates the board. |
| Timer, actions | Shared countdown with celebration, action plan with owners. |

## Architecture

```
Browser (Nuxt SPA, generated)                Cloudflare
+----------------------------+              +--------------------------------+
| pages / components         |  WebSocket   | Worker (worker/index.ts)       |
| Pinia stores               | <==========> |  - serves .output/public       |
| Transport port             |  JSON cmds   |  - CSP + security headers      |
|  - WebSocketTransport      |              |  - origin and room id checks   |
|  - LoopbackTransport (solo)|              +---------------+----------------+
+-------------+--------------+                              |
              |                                  idFromName(room)
              v                                              v
   shared/domain (pure TypeScript)          +--------------------------------+
   schemas (valibot) -> reduce() -> snapshot | Durable Object Room             |
   same code runs in browser and server      |  - reduce(state, command)      |
                                             |  - personalised snapshots      |
                                             |  - SQLite storage, alarm (24 h)|
                                             +--------------------------------+
```

- **Functional core**: `shared/domain` has no I/O. `reduce(state, command, actor, ctx)` returns the next state or an error. The Durable Object and the solo mode (in the browser) run the very same reducer.
- **Ports and adapters**: storage (`BoardRepository`) and client transport are interfaces with swappable adapters.
- **Privacy by construction**: snapshots are built per viewer. Secret votes and voter identities never leave the server.
- Details and decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requirements: Node 22+ (CI and Cloudflare builds use 24).

```bash
pnpm install
pnpm generate     # nuxt generate + CSP hashes
pnpm dev:worker   # http://localhost:8787 (Worker + Durable Object + static site)
```

Front-end only, with hot reload (needs the worker running for real-time boards):

```bash
pnpm dev          # http://localhost:3000
```

## Quality

```bash
pnpm lint
pnpm typecheck    # vue-tsc (app) + tsc (worker)
pnpm test             # Vitest: reducer, snapshots, schemas, templates, themes, i18n, worker
pnpm e2e          # Playwright against `wrangler dev` (multi-user, drag and drop, CSP, i18n)
```

CI (`.github/workflows/ci.yml`) runs all of the above plus a Worker bundle dry run, and deploys `main` when Cloudflare credentials are configured.

## Deploy

**Option A - GitHub Actions.** Add the repository secrets `CLOUDFLARE_API_TOKEN` (permission "Workers Scripts: Edit") and `CLOUDFLARE_ACCOUNT_ID`. Every push to `main` that passes CI is deployed.

**Option B - Workers Builds (Cloudflare dashboard).** Connect the repository, build command `pnpm generate`, deploy command `npx wrangler deploy`.

**Option C - by hand.** `pnpm run deploy`.

The Worker is named `retroboard` (`wrangler.jsonc`). Why a Worker and not Pages: Durable Objects with WebSockets and per-response security headers live in the same deployable unit as the static assets.

### Observability

`observability.enabled` is on in `wrangler.jsonc` (100 % sampling). The Worker and the Durable Object write structured logs with event names and a short non-reversible room hash. They never log note text, names, client ids or raw room ids. Browse them in the Cloudflare dashboard, in the Observability tab of the `retroboard` Worker.

## Security

- Strict CSP, no `unsafe-inline`: inline script hashes are computed after the build (`scripts/csp-hashes.mjs`) and read by the Worker. `default-src 'none'`, `frame-ancestors 'none'`, `connect-src 'self'`.
- WebSocket upgrades only from the site's own origin (plus `ALLOWED_ORIGINS`), room ids validated, message size and rate limits, caps on notes, actions and connections.
- All commands validated with valibot before reaching the reducer. Only the author can edit or delete a note.
- No cookies, no third-party requests, fonts self-hosted.

Board links are capability URLs: anyone who has the link can join. Share them accordingly.

## Add a theme

1. Create `app/themes/<id>.ts` exporting a `ThemeDefinition` (copy `studio.ts`): tokens, 8 note colours, fonts, radius, motion preset (`enter`, `leave`, `ambient`), group `pro` or `fun`.
2. Register it in `app/themes/index.ts`.
3. Add its English texts in `app/i18n/themes.en.ts`.
4. `pnpm test`: the contrast test fails if a palette is not readable (WCAG AA).

## Add a retro format

Add an entry to `shared/domain/templates.ts` (French source, icons must exist in Lucide) and its English text in `shared/domain/templates.en.ts`. Tests check icon names, column counts and translations.

## Add a language

Add `app/i18n/<code>.ts` typed as `Record<keyof typeof fr, string>` (the compiler lists missing keys), register it in `app/i18n/index.ts`, then add template and theme texts.

## Project layout

```
app/        Nuxt app: pages, components, stores, transport, themes, i18n
shared/     Pure domain: types, valibot schemas, reducer, snapshots, templates
worker/     Cloudflare Worker, Room Durable Object, repository, headers, logger
scripts/    Build helpers (CSP hashes)
tests/      unit (Vitest) and e2e (Playwright)
docs/       Architecture notes
```

## License

[GNU AGPL-3.0](LICENSE). Commits up to the `last-mit` tag remain available under MIT. Commercial licensing (without AGPL obligations) is available from MAIDAF EURL. See [NOTICE](NOTICE).
