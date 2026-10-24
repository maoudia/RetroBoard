---
name: retroboard-stack
description: Add or change a feature in RetroBoard (Nuxt 4 static SPA, Cloudflare Worker + memory-only Durable Object relay, DDD/clean architecture, OpenSpec, E2E encryption, i18n fr/en, themes). Use for any feature, fix or refactor in this repository.
---

# RetroBoard stack skill

Use this to put code in the right place, respect the hard constraints and prove the work. Read `AGENTS.md` and `docs/PLAN.md` once per session.

## 0. Start from a spec

1. Find the change: `npx openspec list`, `npx openspec show <change>`. No change? Propose one first (`/opsx:propose` or `/opsx-propose`). Bug fixes that do not change specified behaviour may skip specs (`no-spec` label).
2. Work one task group at a time from `openspec/changes/<change>/tasks.md`. Tick tasks when verified.
3. If reality contradicts the spec, update the spec delta in the same PR and explain why.

## 1. Hard constraints (reject any design that breaks one)

- 0 EUR infrastructure: Workers Free (static assets + one Durable Object class).
- No server-side storage: the relay never calls `ctx.storage`, KV, D1, R2 for board data.
- E2E encryption: plaintext board content never leaves the browser (or the local MCP process).
- Pure domain, layered architecture, enforced by tests.
- i18n for every string (fr source, en required).
- Strict CSP: no inline script/style, no eval, no third-party origins.
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

Current layout (before the restructure lands): domain in `shared/domain`, web app in `app/`, worker in `worker/`, tests in `tests/unit` and `tests/e2e`. Put new pure logic in `shared/domain` and keep components thin.

Bounded contexts: facilitation, ideation, voting, action-tracking, talk-time, presence (ephemeral), access, team-space (local), reporting (read side), companion. Use their ubiquitous language (idea, cluster, phase, agenda, facilitator, carried-over action).

## 3. Recipe: add a behaviour

1. **Domain**: add the event and the invariant to the aggregate; fold must be deterministic and reject invalid events silently (every peer must reach the same state). Unit test first, including "invalid event is ignored".
2. **Privileges**: if only facilitators may do it, check the facilitator/co-facilitator signature policy.
3. **Application**: add a use case `(deps) => (input) => Result`; depend on ports only. Unit test with `testkit` fakes.
4. **Protocol**: if a new event type travels, add it to the envelope payload union with a version bump rule.
5. **Read model**: extend the view used by the UI; memoise per log version.
6. **UI**: Pinia store calls the use case; component renders the read model. Strings via `t('...')`; add keys to `fr` and `en`. Use theme tokens (`var(--...)`), never hard-coded colours. Check phone (360 px) and TV (2560+) layouts.
7. **E2E**: Playwright test of the user flow, multi-context if collaborative. Use `data-testid`. Keep the no-console-error guard green.
8. **Docs**: update the spec delta, README or docs when commands or behaviour change.

## 4. Recipes for common extensions

- **Theme**: add `packages/themes/<id>.ts` (or `app/themes/` today) with light and dark variants, 8 sticky-note colours, fonts (self-hosted @fontsource), motion preset, ambient; register it; add en texts; run the contrast tests.
- **Retro format**: add to the template catalogue (French source) with Lucide icon names that exist; add English texts; tests check icons, column counts and translations.
- **Export destination**: pure exporter in `exporters` returning `{ mime, filename, content }`, snapshot test, panel entry with icon and description, actions-only variant.
- **Language**: new dictionary typed `Record<keyof typeof fr, string>`; register; add template and theme texts.
- **MCP tool**: input schema, untrusted-content wrapping of board text, scope/quota check, integration test against `wrangler dev`.

## 5. Verify before saying done

```bash
npm run verify          # or pnpm verify after the restructure
npm run generate && npm run e2e   # for UI or relay changes
```

Also check:
- No `ctx.storage` or persistent API in the relay (CI guard).
- No new CSP violation (e2e guard) and no new external origin.
- fr and en keys present; long strings do not overflow at 360 px.
- Reduced motion respected for any animation.
- Free-plan budget note in the proposal if relay traffic changes.

## 6. Pitfalls already met in this repo

- Vue static hoisting turned constant `:style` into `style="..."` attributes blocked by CSP: keep `vue.compilerOptions.hoistStatic: false`.
- Nitro auto-detects Workers Builds and writes `.wrangler/deploy/config.json`; keep `nitro.preset: 'static'`.
- Restart `wrangler dev` after `generate`, otherwise it serves stale assets.
- Popovers and dialogs need settle time in e2e; use `expect(...).toPass()` around open-then-act sequences.
- Do not name a template loop variable `t` in components that use `t()` for i18n.
