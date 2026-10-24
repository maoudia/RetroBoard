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
`idFromName(roomId)` routes every participant of a board to one object.

- **Peer to peer first (2026-10-24)**: board events, cursors and focus travel on a WebRTC mesh
  between the participants (`apps/web/app/transport/mesh.ts`, topology in `packages/sync/src/mesh.ts`).
  The relay below only introduces peers (participant list, encrypted offer/answer, presence) and
  carries the board for participants who cannot open any direct link (bridge peer). STUN only,
  no TURN, no paid service. See `openspec/changes/p2p-presence-and-cursors/design.md`.
- **Protocol v2 (`/ws2`, `RelayRoom`, default for new boards)**: a memory-only forwarder of encrypted
  envelopes. It never calls `ctx.storage` (a unit test fails if the code references it). A bounded
  ring buffer (2,000 envelopes or 4 MB) serves late joiners; after an eviction the relay asks the
  connected peers to re-seed it (`need`). When everyone has left and the object is evicted, the
  board is gone. See section 9.
- **Protocol v1 (`/ws`, `Room`) was removed** by `stateless-relay-and-replication`: it reduced
  plaintext commands on the server and stored boards in SQLite. Wrangler migration `v3`
  (`deleted_classes: ["Room"]`) deletes the class and every stored board. Old bare `#<roomId>`
  links show a "this link no longer works" page.

Alternatives considered: a shared D1 database (needs cross-request ordering and fan-out machinery), or Pages Functions (no Durable Object WebSocket hibernation in the same unit).

### 3. Personalised snapshots
`buildSnapshot(state, viewer)` is the only way the board state reaches the UI (it runs in each browser). It hides client ids and voter lists, applies secret voting (`votes: null`), reports an expired timer as stopped. Privacy is enforced where the data is, not in the UI.

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

### 9. End-to-end encrypted boards (change `e2e-encrypted-rooms`)

Links (`packages/domain/src/access/keyring.ts`), everything after `#` stays in the browser:

| Link | Fragment | Who gets it |
|---|---|---|
| Participant | `#r=<roomId>&k=<roomKey>` | everyone invited (share dialog) |
| Facilitator | `#r=<roomId>&k=<roomKey>&f=<facilitatorSeed>` | the creator; a co-facilitator on purpose |
| Passcode flag | `&p=1` appended | the passcode itself is never in a link |

Keys (`packages/crypto`, WebCrypto, `@noble/curves` only when the browser lacks Ed25519/X25519):

- `contentKey = HKDF-SHA-256(ikm = roomKey, salt = roomId, info = "rb/content/v1" || PBKDF2(passcode, roomId, 600k))`.
- Facilitator key: Ed25519 from the 32-byte seed in `f`. Session key: Ed25519 per browser tab.

Events (`packages/protocol/src/envelope.ts`):

```
Envelope (relay sees)  { v: 2, room, id (ULID), hlc, ct }
ct                     AES-256-GCM(contentKey, JSON(SignedEvent), aad = "2|room|id|hlc")
SignedEvent            { id, at, author (Ed25519 public key), body, sig }
body                   genesis | cmd | role.delegate | role.revoke
```

Every browser verifies, then folds events in `(at, id)` order through the domain
(`access/ledger.ts`, `application/sync/event-log.ts`): the first event must be a genesis signed by
the facilitator key it announces; settings, set-up, reset and timer commands and role changes count
only from the facilitator or a co-facilitator; the actor of a command is its signing key, so only
the author edits or deletes a note. Invalid events are ignored identically by every peer, so all
replicas converge. Presence (names) travels in encrypted ephemeral envelopes that are not buffered.

What the relay still sees: room ids, connection ids, IP addresses, timing, envelope count and sizes.
What it never sees: note text, names, votes, the room key, the passcode, the facilitator key.

## Testing strategy
- Unit (Vitest): reducer invariants, snapshot privacy, schemas, templates and suggestions, theme contrast, i18n parity, Worker helpers and storage adapter.
- E2E (Playwright): runs against `wrangler dev` (real Worker and Durable Object): multi-user sync, drag and drop, groups, columns, secret voting, export, profile, i18n, and "no console or CSP error". `encryption.spec.ts` inspects every WebSocket frame and HTTP request: no note text in any encoding, no key, no secret.
- Mutation (Stryker) on the pure packages, with a ratchet on every commit to main; reports on GitHub Pages ([docs/quality.md](quality.md)).
