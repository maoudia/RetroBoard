# Architecture notes

## Goals
Maintainable and easy to evolve: new theme, new format, new command or new language should each touch a small, predictable set of files.

## Decisions

### 1. Functional core, thin adapters
`packages/domain` is pure TypeScript, organised by bounded context. A command goes through `parseCommand` (valibot, `packages/protocol`) then `reduce`:

```ts
reduce(state, command, actor, { now, newId }) -> { ok: true, state, dirty } | { ok: false, error }
```

`dirty` tells the storage adapter exactly which entities changed (meta, notes, groups, actions, or a full wipe), so a vote rewrites one key, not the board.

Why: the same reducer runs in the Durable Object and in the browser (solo mode), tests need no mocks, and invariants (limits, groups dissolving below 2 notes, last column) live in one place.

Handlers are a map `type -> handler`, so adding a command is: a schema entry, a handler, a test.

### 2. One Durable Object per board
`idFromName(roomId)` gives strong single-writer consistency per board without a database. Storage is SQLite-backed. WebSocket hibernation keeps idle boards free. An alarm erases the board 24 h after the last activity.

Alternatives considered: a shared D1 database (needs cross-request ordering and fan-out machinery), or Pages Functions (no Durable Object WebSocket hibernation in the same unit).

### 3. Personalised snapshots
`buildSnapshot(state, viewer)` is the only way data leaves the server. It hides client ids and voter lists, applies secret voting (`votes: null`), reports an expired timer as stopped. Privacy is enforced where the data is, not in the UI.

### 4. Static front end, no SSR
Nuxt generates a SPA. Boards are real-time and per-link, there is nothing to render on the server. This keeps the CSP strict: after `nuxt generate`, `scripts/csp-hashes.mjs` hashes inline scripts into `_csp.json`, which the Worker turns into the CSP header. `vue.compilerOptions.hoistStatic` is off because static hoisting serialises constant `:style` bindings into `style="..."` attributes, which `style-src` blocks.

### 5. Theme system
A theme is data: tokens, note colours, fonts, radius, motion preset, ambient effect, copy. `applyTheme` writes CSS variables and `data-theme`, `data-enter`, `data-leave` on `<html>`. Animations are CSS keyframes selected by those attributes, so a theme never contains animation code. Each person can override the board theme locally ("my theme").

### 6. Animations
- Enter and leave: `TransitionGroup` with presets (`pop`, `drop`, `float`, `glitch`, `bloom` / `poof`, `melt`, `fade`), FLIP reordering through `.note-move`.
- Publish: a note flies from the draft to its column (Web Animations API, `useFlights`).
- Votes, confetti, ambient canvas layer.
- `prefers-reduced-motion` and the profile "reduced" setting disable decorative motion.

### 7. i18n
A small typed layer (`packages/i18n`, reactive wrapper in `apps/web/app/i18n`): French is the source dictionary, English is `Record<keyof typeof fr, string>` so a missing key fails the build. Plurals use `key.one` / `key.other` with `Intl.PluralRules`. No runtime message compiler, so no `unsafe-eval`. Content that is stored on the board (column titles from a template) is created in the language of the creator through the `locale` field of `board.init` and `template.apply`.

### 8. Observability and privacy
Structured logs with an event name and a short sha256-based room hash. Never text, names, client ids or raw room ids.

## Testing strategy
- Unit (Vitest): reducer invariants, snapshot privacy, schemas, templates and suggestions, theme contrast, i18n parity, Worker helpers and storage adapter.
- E2E (Playwright): runs against `wrangler dev` (real Worker and Durable Object): multi-user sync, drag and drop, groups, columns, secret voting, export, profile, i18n, and "no console or CSP error".
