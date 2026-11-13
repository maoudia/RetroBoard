# RetroBoard - Architecture and design notes

Split out of the former master plan on 2026-11-05 (change stabilise-main, docs truth pass). Decisions are recorded in [docs/adr](adr/README.md); this file explains the target design they lead to. When this file and an ADR disagree, the ADR wins. Section numbers are kept (3 to 12) so older references still resolve.

## 3. Target architecture

```
                         retroboard.maoudia.com (Cloudflare edge, Free plan)
+-------------------------------------------------------------------------------------------+
| Worker "retroboard"                                                                       |
|  - static assets (Nuxt generate)        - security headers, CSP with build hashes         |
|  - /ws2  WebSocket -> Durable Object  - rate limiting (per isolate), admission            |
|  - /healthz, maintenance and busy pages   - planned: /license (licensing-and-monetization)|
|                                                                                           |
|  Durable Object "RelayRoom" (memory only, hibernation)                                    |
|   - forwards opaque encrypted events, WebRTC signalling                                   |
|   - keeps a bounded in-memory ring of recent ciphertext for fast catch-up                 |
|   - participants who connect upload what the relay lacks (re-seed)                        |
+-------------------------------------------------------------------------------------------+
        ^  encrypted events (wss)                      ^ signalling only
        |                                              |
+-------+----------------------------+   WebRTC   +----+-------------------------------+
| Browser A (facilitator)            |<---------->| Browser B (participant)            |
|  apps/web (Nuxt SPA, PWA)          |  cursors,  |  same code                         |
|  application (use cases)           |  presence  |                                    |
|  domain (pure)                     |            |                                    |
|  sync: event log + HLC + replica   |            |  replica in IndexedDB (encrypted)  |
|  crypto: WebCrypto                 |            |                                    |
+------------------------------------+            +------------------------------------+
        ^ local MCP (stdio)                           ^ local LLM (localhost / in-browser)
        |                                             |
  apps/mcp (npm @retroboard/mcp)                Ollama / LM Studio / Chrome Prompt API / WebLLM
```

### 3.1 Repository layout (target)

```
apps/
  web/            Nuxt 4 SPA (presentation + composition root). No domain logic.
  relay/          Cloudflare Worker + Durable Object (adapter of RelayPort, server side).
  mcp/            @retroboard/mcp, Node stdio MCP server (adapter of RelayPort + tools).
packages/
  domain/         Pure TypeScript. Aggregates, value objects, domain events, policies. No I/O.
  application/    Use cases (commands, queries), ports (interfaces), read models.
  protocol/       Versioned wire envelopes and valibot schemas shared by web, relay and mcp.
  sync/           Event log, hybrid logical clock, version vectors, resync, snapshots.
  crypto/         WebCrypto adapter: AES-GCM, HKDF, PBKDF2, Ed25519 signatures, X25519 sealing.
  themes/         Theme definitions with light/dark variants, contrast tests.
  i18n/           Typed dictionaries (fr source, en), pseudo-locale, ICU-lite helpers.
  exporters/      Pure functions: Markdown, HTML report, CSV, JSON, Jira CSV, Slack blocks, Confluence.
  ui/             Design tokens and headless components (post-it, rings, podium), Storybook-free docs page.
  testkit/        Builders, fake ports, deterministic clock and ids, protocol fixtures.
tooling/
  eslint-config/  Shared lint rules, dependency rules.
openspec/         Specs (source of truth) and changes (planned work).
docs/             This plan, architecture notes, runbooks.
```

Dependency rule (enforced by `dependency-cruiser` in CI):

```
domain        <- nothing
application   <- domain
protocol      <- domain (types only)
sync, crypto  <- application ports, protocol
exporters     <- application read models
themes, i18n  <- nothing (data)
ui            <- themes, i18n
apps/*        <- anything above, never the other way round
```

### 3.2 Clean architecture inside the web app

- **Composition root**: one Nuxt plugin wires adapters to ports (`RelayPort`, `ReplicaStorePort`, `CryptoPort`, `ClockPort`, `IdPort`, `EntitlementPort`, `LlmPort`, `ClipboardPort`, `FilePort`, `NotifierPort`).
- **Pinia stores are view models only**: they call application use cases and subscribe to read models. They never mutate domain state directly.
- **Use cases** (examples): `CreateBoard`, `JoinBoard`, `WriteDraft`, `PublishDrafts`, `GroupNotes`, `RenameGroup`, `CastVote`, `RevealVotes`, `StartPhase`, `ExtendPhase`, `StartTalkTurn`, `AddAction`, `CarryOverActions`, `ExportBoard`, `GenerateReport`, `ApplyEntitlement`.
- **Read models**: `BoardView`, `ColumnView`, `RankingView`, `AgendaView`, `ReportView`. Built from the event log, memoised per version.

## 4. Bounded contexts and domain model

| Context | Aggregates and entities | Key invariants | Events (examples) |
|---|---|---|---|
| **Facilitation** | `Retro` (root: id, title, theme, settings, facilitator key), `Agenda` with `Phase`s, `Role`s | One facilitator at a time; phase order; only facilitator or co-facilitators drive phases | `RetroCreated`, `PhaseStarted`, `PhaseExtended`, `FacilitatorDelegated` |
| **Ideation** | `Board` (columns), `Note`, `Draft` (local only), `Cluster` (group = merged idea) | Max columns 8; cluster has 2+ notes; author-only edits | `NotePublished`, `NoteMoved`, `NotesClustered`, `ClusterRenamed` |
| **Voting** | `Ballot` (policy: votes per person, max per item, secrecy, scope notes/clusters), `Vote` | Never exceed the policy; votable items are loose notes and clusters (a clustered note is voted through its cluster) | `VoteCast`, `VoteWithdrawn`, `VotingClosed`, `TallyRevealed` |
| **Action tracking** | `Action` (title, owner, status, due date, origin), `StatusWorkflow` (checkbox or Jira-like) | Status transitions follow the workflow; carried-over actions keep their history | `ActionAdded`, `ActionStatusChanged`, `ActionsCarriedOver` |
| **Talk time** | `TalkSession`, `Turn` | One active turn; budget per speaker | `TurnStarted`, `TurnEnded` |
| **Presence** (ephemeral) | `Participant`, `Cursor`, `Avatar` | Not stored, not in the event log | (P2P messages only) |
| **Access** | `RoomKey`, `Passcode`, `FacilitatorCapability`, `Entitlement` | Keys never leave the browser except in links the user shares | `PasscodeSet`, `EntitlementApplied` |
| **Team space** (local) | `TeamProfile` (name, sprint counter, default agenda, history of actions) | Lives in the facilitator's browser | (local only) |
| **Reporting** (read side) | `RetroReport`, `Metrics` | Derived, never edited | - |
| **Companion** | `AgentParticipant`, `AgentSession` (timebox, quota, scopes) | An agent can never exceed its timebox or quota; its notes are labelled | `AgentJoined`, `AgentSessionExpired` |

Ubiquitous language (FR/EN): retro/retro, idee/idea (published note), brouillon/draft, groupe/cluster (merged idea), phase/phase, ordre du jour/agenda, facilitateur/facilitator, action/action, tour de parole/talk turn, podium/podium.

## 5. Sync, encryption and "zero storage" design

### 5.1 Keys and links

- `roomId`: 128-bit random, base64url, in the path: `/r/<roomId>`.
- `roomKey`: 256-bit random, in the fragment: `/r/<roomId>#k=<key>`. Never sent to the server.
- Passcode by default (change `password-by-default`, 2026-11-02): the creation form proposes a generated, readable passcode (about 64 bits); the facilitator may replace it, use the advanced generator (random, passphrase) or clear it after a confirmation that states the risks. Content is end-to-end encrypted with or without it; the passcode is the second factor against a leaked link. The device remembers it sealed with a non-extractable AES-GCM key (IndexedDB) or in the tab only (retention "while the tab is open").
- Passcode derivation: `contentKey = HKDF(roomKey, salt=roomId, info=PBKDF2(passcode, 600k iterations))`. Participants need both the link and the passcode; the passcode is shared through another channel.
- Facilitator capability: an Ed25519 key pair created with the board. The public key is in the genesis event; the private key is only in the facilitator link (`#k=...&f=...`) and the facilitator's browser. Phase changes, vote reveal, role delegation and settings are signed with it; every peer rejects unsigned privileged events.
- Every participant has a session Ed25519 key; their events are signed so authorship ("only the author edits") holds without a server.
- Move to a fresh link (change `facilitator-moderation`, ADR-0035): the facilitator can move a board to a new room and room key so a removed participant cannot read what comes next. A signature is bound to the room id (`signedMessage`), so the new ring keeps the signing room of the first one (`signRoomId`, written `&d=<room id>` in the long link); events are never re-signed. Each client seals its own log under the new room and key in its local copy. Each remaining participant is sent one `room.moved` frame in the old room: the new link, sealed to the X25519 key announced in presence (`sealTo`) and signed by the lead facilitator; a removed participant holds the old room key but gets no frame, and cannot forge one. The old room is then closed with `board.destroy`.

### 5.2 Event log

```
Envelope (visible to relay) = { v, roomId, eventId (ULID), hlc, size, ciphertext }
Plaintext (encrypted)       = { type, actor (pubkey hash), payload, signature }
```

- AES-GCM with AAD = `roomId|eventId|hlc` so the relay cannot replay events into another room or reorder them undetected.
- Total order = (hlc, eventId). Each peer folds events through `packages/domain` in that order. A late event triggers a re-fold from the last checkpoint (checkpoints every 200 events).
- Invalid events (bad signature, broken invariant) are ignored deterministically by every peer, so all replicas converge.
- Snapshots (ADR-0037): the browser holding the facilitator link signs the ledger folded up to a cut (ids of the covered events, signed genesis) and sends it to its direct links; a participant with no board yet asks a peer for it (`snapreq`), verifies it (signer = genesis key, signature, fold version, ids) and starts from it, then verifies the events after the cut one by one. Any failure, and any event before the cut that it does not cover, ends with the full event log. Peer to peer only; the relay history stays at most 2,000 envelopes.

### 5.3 Relay behaviour (Durable Object, memory only)

- Admission: origin (`apps/relay/src/core/origin.ts`), room id format, at most 30 connections per room, frame size (256 KB, ciphertext of one message 16 KB), frame rate per connection (`packages/protocol/src/budgets.ts`). Planned and not built: entitlement token (change `licensing-and-monetization`) and a room lifetime cap. No Turnstile: ADR-0019 chose edge protection instead.
- The client stays under those budgets by itself (change `deploy-safe-sessions`): an upload is cut by bytes under the frame size (`chunk`) and paced at half the frame budget (`FramePacer`, 40 `pub` frames per 10 s window); the reconnect backoff starts over only once a connection held 30 s past the relay history, and a close for size or rate (1008, 1009) is followed by at least 30 s of quiet before the next socket.
- Fan-out of envelopes to the other sockets of the room.
- Bounded ring buffer of the last N envelopes in memory (e.g. 2,000 or 4 MB) for fast catch-up.
- WebRTC signalling: forwards SDP offers/answers and ICE candidates between peers (encrypted too).
- **Never** calls `ctx.storage`. A test in CI fails if the relay code references the storage API.

### 5.4 Resurrection (replication)

- Every browser keeps its encrypted replica in IndexedDB and calls `navigator.storage.persist()` to reduce eviction.
- An IndexedDB commit is asynchronous and a tab left mid-commit drops it, so an event authored here is sealed and staged in a synchronous write-ahead journal (localStorage, same ciphertext, `withJournal`) before the board shows it; the next page start commits what a closed tab left (change `replica-write-ahead`).
- When the Durable Object is evicted or hibernates and loses its memory, the next connection gets `need-state`. Any peer answers with its version vector; peers then exchange the missing events directly (P2P) or through the relay.
- If no peer still has the board, it is gone. That is the privacy promise. The UI says it clearly and offers a **board file** (`.retro`, encrypted, contains the log and the key derivation salt) to restore a board later or carry it to the next retro.
- Local retention: replicas expire after 30 days by default (configurable in the profile, including "delete when I leave").

### 5.5 P2P presence and cursors

- WebRTC data channels in a mesh, signalled through the relay, STUN `stun.cloudflare.com` (free). TURN is optional and only used if the facilitator plan includes it.
- Cursors at up to 30 Hz P2P, interpolated; fallback through the relay at 4 Hz with only the last position kept.
- Above 12 peers, each peer connects to 6 relays-in-mesh (partial mesh, gossip) and cursor display is capped to the 10 most active.
- Budget (relay path, worst case): 10 people x 4 Hz x 3,600 s = 144,000 incoming messages per hour = 7,200 billed requests. P2P removes most of it.

### 5.6 Why not a CRDT library (and when to switch)

Our model is a small set of aggregates with invariants (vote limits, author-only edits, cluster size). An event log replayed through the domain enforces them on every peer. A CRDT would merge but not enforce. If concurrent text editing on the same note becomes a requirement, the `sync` package can embed Yjs for note text only, behind the same port.

### 5.7 What the relay can observe

Room ids, IP addresses (Cloudflare), connection times, envelope sizes and counts. It cannot read titles, notes, names, votes, actions or settings. The privacy page states this list.

## 6. Retro flow

### 6.1 Agenda (time-boxed retro)

Default "1 hour" agenda, editable at creation and saved in the team profile:

| Phase | Default | What happens |
|---|---|---|
| Check-in | 5 min | Mood or one word (optional) |
| Previous actions | 10 min | Popup and section with carried-over actions; update statuses |
| Write | 12 min | Private drafts, publish at the end of the phase (or at any time) |
| Group | 8 min | Cluster ideas, name clusters |
| Vote | 7 min | Voting with optional hidden counts; facilitator closes |
| Ranking | 3 min | Podium and full ranking |
| Actions | 12 min | Actions from top ideas, owners from connected people |
| Close | 3 min | ROTI, report, board file, export |

UI: a **global retro ring** split into cut segments (one per phase) with progression, expandable into a panel showing each phase, its remaining time and overtime. The facilitator can extend, skip, or borrow time from later phases; the ring shows borrowed time.

### 6.2 Talk time

Optional, chosen in retro settings: off, ring (discreet), popup (start/end). The facilitator or the speaker starts a turn; a ring around the speaker's avatar shows the budget; the end is announced visually (and with the chime if enabled). The report shows the talk time distribution (as shares, names only if people showed their name).

### 6.3 Voting

- Settings at creation and in options: votes per person, max votes per item, hide counts during voting, secret ballot, what is votable (notes, clusters).
- Hidden counts = UI hides totals until reveal. Sealed ballot (`settings.sealedBallot`, change `voting-v2-and-ranking`) = each vote is a `vote.seal` event sealed to the round's public ballot key (X25519, `HKDF(signing seed, "rb/ballot/v1")`, so the facilitator link re-derives it on any device), so even a curious participant cannot read the choice from the log. The facilitator device opens the ballots (`sealedReveal`) and publishes a signed `vote.reveal` of counts only; replicas check it against public data (ballots cast, per-voter caps) before applying it. The relay sees nothing new. The full threat summary is in the archived design (`openspec/changes/archive/2026-11-11-voting-v2-and-ranking/design.md`).
- Accurate visible UI: remaining votes as dots in the toolbar, per-item dot stack for my votes, haptic/visual feedback, undo.
- After voting closes: **ranking page** with a podium (top 3) and the full ordered list, ties handled, "create action" on each item.

### 6.4 Clusters (groups as merged ideas)

A cluster is an idea in its own right: title (defaults to the first idea's text, suggestions from member texts or the local AI), votable, renameable. Column header has **Expand all / Collapse all** to switch stacks to an inline expanded layout.

### 6.5 Actions

- Owner field suggests currently connected participants first, then names already used in the team history, then "Use '<typed text>'" as the last item.
- Status mode chosen at creation: checkbox, or workflow `To do -> In progress -> Done`, plus `Blocked` and `Dropped`.
- Carry-over: at creation, import previous actions from the team profile (local), a board file, a JSON/CSV export, or a still-alive previous board link. They appear first in the "Previous actions" phase.
- Export "actions only" in every format (Markdown checklist, CSV for Jira, Slack message, JSON).

## 7. UX, responsive, themes, i18n

- **Breakpoints**: phone (360-599), tablet (600-1023), laptop (1024-1599), wide (1600-2399), TV/projector (2400+). Container queries for columns; fluid type with `clamp()`. The classes, breakpoints and the fluid scale live in `packages/themes/src/screens.ts`; the web app writes them as `--bp-*`, `--type-scale` and `--fluid-xs` to `--fluid-3xl` on `<html>` and sets `data-screen` (`phone`, `tablet`, `laptop`, `wide`, `tv`). **Presenter mode** for TV/projector: larger type, high contrast variant, QR code to join, cursors hidden.
- **Readable at scale**: masonry layout per column (CSS multi-column, no script), auto font fitting per note (min size, then truncate with "read more"), three density levels (comfortable, compact, dense; key `d`) and a personal note zoom of 80 to 150% (keys `+`, `-`, `0`; Ctrl/Cmd +/- and pinch keep zooming the whole page, which the browser owns), both kept per screen class on the device (`stores/layout.ts`); text never under 14 px; cluster collapse, search and filter, "focus mode" on one column.
- **Post-it colours**: a canonical palette close to classic sticky notes (canary yellow, neon pink, aqua blue, lime green, orange, lilac, mint, white). Exact hex values are defined in `packages/themes` and validated for AA contrast in light and dark variants.
- **Animations**: peel on hover, stick on publish (with a small paper flutter), magnetic snap when clustering, podium rise, ring tick. All honour `prefers-reduced-motion` and the profile setting.
- **Publishing UI rethink**: a single composer per column with "Publish" and "Publish all", a visible draft counter, "auto-publish at the end of the Write phase" (facilitator setting), undo for 10 s, keyboard (`Enter` save, `Cmd+Enter` publish), mobile bottom sheet composer.
- **Themes**: each theme ships light and dark variants. The board theme is imposed; participants switch variant only. The landing, /new and the profile use the landing theme, never a board theme.
- **Profile**: friendly default avatar (initials on a soft gradient, never "?"); persona avatar sets bundled and self-hosted; Gravatar as an explicit opt-in (it sends an email hash to Gravatar; CSP allows `img-src` for Gravatar only when enabled).
- **Smart title**: `<Team> - Sprint <N> - <date>` from the local team profile, sprint counter incremented on each retro.
- **i18n**: fix truncated labels (toolbar, segmented controls) with `min-width: 0`, wrapping and icon-only fallbacks; add a pseudo-locale (French +40% length, accented, in brackets; `packages/i18n/src/pseudo.ts`) that CI renders on every page to catch overflow. It is reached only with `?lang=pseudo` (one page load, never stored, absent from every language picker); a key missing from the dictionaries shows bare, without brackets.

## 8. Exports and integrations (browser only)

The export menu is a friendly panel with file-type icons, grouped by destination:

| Destination | How (no server, no token stored) |
|---|---|
| Files | Markdown, HTML report (self-contained), PDF (print stylesheet), CSV, JSON, board file `.retro` (encrypted) |
| Jira | CSV in Jira's import format for actions; copy-paste issue list |
| Confluence | Rich HTML on the clipboard (tables, status lozenges as text), Markdown fallback |
| Google | Rich HTML on the clipboard for Docs; TSV for Sheets; "open docs.new / sheets.new" deep link |
| Slack | Formatted message on the clipboard (mrkdwn); optional incoming-webhook URL provided by the team and sent from the browser |
| Agents | JSON + Markdown bundle with a prompt header; MCP access (section 9) |
| Actions only | Same destinations, filtered to actions |

Note: whether Slack incoming webhooks accept a browser `fetch` (CORS) must be verified during the change; the fallback is the clipboard.

## 9. Agents, MCP and local AI

- **@retroboard/mcp** (npm, stdio): `npx @retroboard/mcp --board "<link>"`. Tools: `get_board`, `list_ideas`, `add_idea` (published as an agent participant, labelled), `add_feedback` (agent feedback column), `vote` (if the facilitator allows agents to vote), `list_actions`, `propose_action`, `summarise`. Resources: board snapshot, agenda, report.
- **Agent sessions are time-boxed**: the facilitator creates an agent invitation (scopes, max ideas, expiry, e.g. 15 min). The token is signed by the facilitator key and checked by every peer.
- **Agent feedback**: a dedicated "Agents" lane or badge, rate-limited, collapsible, excluded from voting unless allowed.
- **WebMCP (browser agents)**: the board, landing and creation pages register tools (`retro_get_board`, `retro_list_ideas`, `retro_write_draft`, `retro_publish_drafts`, `retro_vote`, `retro_propose_action`, `retro_suggest_format`, `retro_prepare_board`...) for agents built into the browser. Off by default because the browser's agent may send content to its model; writes to the shared board always need a human confirmation. Change: `webmcp-browser-agents`.
- **Local AI companion** (opt-in, per participant): providers behind `LlmPort` in this order: Chrome Prompt API (`LanguageModel`, desktop Chrome 148+ per Chrome docs <https://developer.chrome.com/docs/ai/prompt-api>), Ollama or LM Studio on `localhost` (OpenAI-compatible endpoint, user configures CORS), WebLLM in the browser. Features: a playful retro companion persona, cluster title suggestions, duplicate detection, SMART action phrasing, end-of-retro summary draft. The facilitator bot (time-box nudges, phase auto-advance, wrap-up report) works without any LLM.

## 10. Delivery harness (CI/CD, agentic workflows, quality gates)

### 10.1 Pull request pipeline (all free on a public repository)

| Gate | Tooling |
|---|---|
| Spec gate | `openspec validate --all --strict`; PR touching `apps/` or `packages/` must link a change or carry `no-spec` |
| Static | ESLint (flat config), Stylelint, `vue-tsc`, `tsc -b` for packages, `dependency-cruiser` layer rules, `knip` dead code |
| Unit | Vitest per package with coverage thresholds: domain 95%, application 90%, others 80% |
| Mutation | Stryker on `packages/domain` (changed files on PR, full nightly) |
| Protocol | Snapshot of wire schemas; backward-compatibility check for protocol versions |
| E2E | Playwright sharded: Chromium, Firefox, WebKit; viewports phone, tablet, laptop, TV; multi-user scenarios against `wrangler dev` |
| Visual | Playwright screenshots per theme x variant x locale (fr, en, pseudo) on key screens |
| Accessibility | `@axe-core/playwright` on every page, zero serious violations |
| Performance | Lighthouse CI budgets, `size-limit` on JS chunks |
| Security | CodeQL, dependency review, OSV scanner, gitleaks, CSP violation e2e, relay "no storage API" test |
| Supply chain | SBOM (SPDX), license allow-list, pinned actions by SHA, npm provenance for `@retroboard/mcp` |
| Preview | `wrangler versions upload` per PR, preview URL commented on the PR (to verify on the current Wrangler) |

### 10.2 Release and deploy

- Conventional Commits (enforced by hook and CI) + release-please for the SemVer version and `CHANGELOG.md`. The release is automatic: when `Checks` and `Quality` are green on main, the workflow merges the release PR, tags `vX.Y.Z`, publishes the GitHub Release and pushes the image `ghcr.io/maoudia/retroboard` (ADR-0025, `docs/self-hosting.md`).
- Main is deployed by Workers Builds (already connected) with build `npm run generate` (or `pnpm generate`; was going to be `pnpm turbo run build --filter=web`), then smoke tests against production, then `wrangler rollback` if smoke fails.
- `@retroboard/mcp` is published on npm with provenance on release tags.

### 10.3 Agentic workflows

| Workflow | Trigger | Does |
|---|---|---|
| `agent-implement` | Issue labelled `agent:claude` or `agent:opencode` | Runs `anthropics/claude-code-action@v1` or `anomalyco/opencode/github@latest` with `/opsx:apply <change>` scoped to the task group in the issue, opens a PR |
| `agent-review` | PR opened/updated | Claude code-review plugin posts inline comments; checks spec conformance |
| `agent-mention` | `@claude`, `/opencode` in comments | Interactive help |
| `agent-triage` | Nightly | Summarises failing nightly e2e, flaky tests, outdated deps; opens issues |
| `agent-docs` | Weekly | Checks docs and specs drift against code, opens a PR |

Guardrails: `--max-turns`, job timeouts, concurrency 1 per issue, only maintainers can trigger, agents cannot change `.github/workflows` or secrets, required human review, merge queue. Credentials: `CLAUDE_CODE_OAUTH_TOKEN` (subscription) or `ANTHROPIC_API_KEY`. Sources: <https://code.claude.com/docs/en/github-actions>, <https://opencode.ai/docs/github/>.

### 10.4 Issue and branch conventions

- One GitHub issue per OpenSpec task group, title `[<change>] <group>`, body links the change and lists tasks and verification.
- Labels: `epic:<name>`, `layer:domain|application|adapter|app`, `agent:ready`, `agent:claude`, `agent:opencode`, `needs:human`, `size:S|M|L`.
- Branch `change/<change-name>/<group>`; one PR per task group.

## 11. Edge security on the Cloudflare free plan

For `retroboard.maoudia.com`:

- DNS: proxied record or Workers custom domain; DNSSEC on; CAA limiting issuers.
- TLS: Always Use HTTPS, minimum TLS 1.2, TLS 1.3 on, HSTS (start at 6 months, preload later).
- WAF: Cloudflare Free managed ruleset, Bot Fight Mode, a few custom rules (block non-GET/HEAD on static paths, challenge suspicious countries only if abuse appears). The number of free custom and rate-limiting rules must be checked in the dashboard.
- No Turnstile (ADR-0019): one rate-limiting rule on `/ws2`, Bot Fight Mode and relay budgets instead (`docs/runbooks/edge.md`).
- Worker: existing strict CSP, COOP/CORP, Permissions-Policy, origin checks, per-IP connection caps (in the Durable Object), Workers rate limiting binding if available on Free (to verify: <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>).
- `/.well-known/security.txt`, privacy page, legal notice (mentions legales).
- Observability: Workers Logs (already on), traces on, no content in logs.

## 12. Roadmap, epics and parallelisation for agents

Each line is an OpenSpec change in `openspec/changes/<name>/`. Phases are milestones on the GitHub project. Inside a phase, changes marked with the same lane can run in parallel.

| Phase | Change | Depends on | Lane |
|---|---|---|---|
| P0 Foundations | `restructure-ddd-monorepo` | - | A |
| P0 | `agentic-delivery-harness` | restructure | B |
| P0 | `edge-security-and-domain` | - | C |
| P1 Zero-storage core | `e2e-encrypted-rooms` | restructure | A |
| P1 | `stateless-relay-and-replication` | e2e-encrypted-rooms | A |
| P1 | `p2p-presence-and-cursors` | stateless-relay | B |
| P1 | `theme-policy-and-variants` | restructure | C |
| P1 | `responsive-and-i18n-hardening` | restructure | C |
| P2 Retro flow | `facilitation-roles` | stateless-relay | A |
| P2 | `timeboxed-agenda` | facilitation-roles | A |
| P2 | `talk-time` | timeboxed-agenda | A |
| P2 | `voting-v2-and-ranking` | stateless-relay | B |
| P2 | `clusters-as-merged-ideas` | stateless-relay | B |
| P2 | `actions-v2-and-carry-over` | stateless-relay | C |
| P2 | `board-creation-v2` | agenda, voting-v2, actions-v2 | A |
| P3 UX | `publishing-ux-redesign` | restructure | B |
| P3 | `postit-visual-system` | theme-policy | C |
| P3 | `profile-avatars-and-team-space` | restructure | B |
| P3 | `frictionless-sharing` | e2e-encrypted-rooms | A |
| P3 | `webmcp-browser-agents` | restructure | C |
| P4 Outputs | `export-hub` | actions-v2 | B |
| P4 | `retro-report` | voting-v2, talk-time | C |
| P5 Agents | `retro-mcp-and-agent-sessions` | stateless-relay, facilitation-roles | A |
| P5 | `local-ai-companion` | retro-report | B |
| P6 Growth | `landing-v2-and-product-video` | postit-visual-system | C |
| P6 | `licensing-and-monetization` | stateless-relay | A |

Definition of done for every change: specs updated, tasks checked, `npm run verify` green, e2e for user flows, i18n keys fr+en, docs updated, change archived after merge.
