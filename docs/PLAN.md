# RetroBoard - Master plan

Status: v1 of the plan, 2026-10-24. Owner: Moncef Aoudia (MAIDAF EURL).
This document is the entry point for humans and agents. Executable work lives in `openspec/changes/` (one change per epic) and is mirrored as GitHub issues on the project board.

Contents
1. Product vision and non-negotiables
2. Decisions taken (ADR log)
3. Target architecture
4. Bounded contexts and domain model
5. Sync, encryption and "zero storage" design
6. Retro flow (facilitation, agenda, voting, actions)
7. UX, responsive, themes, i18n
8. Exports and integrations
9. Agents, MCP and local AI
10. Delivery harness (CI/CD, agentic workflows, quality gates)
11. Edge security on the Cloudflare free plan
12. Roadmap, epics and parallelisation for agents
13. Business plan (en francais)
14. Extra ideas
15. Risks and open points
16. Traceability: request -> change

---

## 1. Product vision and non-negotiables

RetroBoard runs a complete team retrospective in one hour, from reviewing last sprint's actions to agreeing on new ones, on any screen from a phone to a meeting-room TV. It costs nothing to run and keeps nothing about the team.

Non-negotiables (also in `openspec/config.yaml`, so every agent sees them):

| # | Constraint | Consequence |
|---|---|---|
| N1 | 0 EUR infrastructure | Cloudflare Workers Free: static assets + one Durable Object class. No paid add-on is required for the product to work. |
| N2 | No storage on our side | The relay holds state in memory only and never calls Durable Object storage. Durable state lives in browsers (encrypted replicas) and in files people export. |
| N3 | End-to-end encryption | Content is encrypted in the browser. The key travels in the URL fragment (`#...`), which browsers never send to servers. |
| N4 | The board theme is respected | Facilitator picks the theme; participants can only switch its light or dark variant. |
| N5 | Maintainable by humans and agents | DDD + clean architecture, enforced by tests; OpenSpec for every behaviour change; small tasks with explicit verification. |
| N6 | Ethical business | Core retro features free forever. Paid tiers unlock scale and premium content, never basic needs. No ads, no tracking, no data resale. |

## 2. Decisions taken (ADR log)

| ID | Decision | Alternatives rejected | Why |
|---|---|---|---|
| ADR-01 | Host on **Cloudflare Workers with static assets** at `retroboard.maoudia.com` | Cloudflare Pages + separate Worker | Pages cannot host the Durable Object; one deployable instead of two. |
| ADR-02 | **Hybrid sync**: Durable Object in-memory relay for events and signalling + **WebRTC P2P** for cursors and presence, relay fallback at 4 Hz | DO only (cursors burn the free quota); pure P2P (fails behind strict NAT without paid TURN) | Keeps a real-time feel inside the free quota. |
| ADR-03 | **Event-sourced board** replicated in every browser (encrypted, IndexedDB), deterministic replay through the domain | Yjs/Automerge CRDT; server-authoritative state | Reuses our tested reducer, keeps DDD invariants in the domain, and lets any peer resurrect the board. Yjs remains the fallback if convergence work grows (see section 5.6). |
| ADR-04 | **E2E encryption** (AES-GCM 256, key in fragment) + optional passcode + facilitator capability key + Turnstile at board creation | Server-checked passcode; secret link only | Only option that is both free and storage-free with real confidentiality. |
| ADR-05 | **Facilitator role** with delegation to co-facilitators | Everyone equal | Phases, timers, talk time and vote reveal need one owner. |
| ADR-06 | **Theme imposed**, light/dark variant per participant | Personal theme override (current behaviour, removed) | Requested by product owner; variants keep accessibility. |
| ADR-07 | **Integrations in the browser**: structured files, rich clipboard, deep links, user-provided webhooks | OAuth apps through the Worker | No secrets, no tokens, no storage, no app reviews. |
| ADR-08 | **Monorepo** (pnpm workspaces + Turborepo), packages per layer | Single Nuxt app with folders | Layer boundaries become package boundaries that tools enforce. |
| ADR-09 | **OpenSpec** spec-driven workflow for Claude Code and OpenCode | Free-form issues | Specs are the contract agents implement and reviewers check. |
| ADR-10 | **License AGPL-3.0-only** + commercial license on request (dual licensing), contributions under a CLA | MIT (allows closed resale); FSL-1.1-ALv2 (not OSI open source); BSL 1.1 and Elastic 2.0 (disliked by the community) | Real open source (OSI) that discourages closed resale: anyone running a modified version as a service must publish its source (AGPL section 13). Commits up to tag `last-mit` stay MIT. |
| ADR-11 | **Payments through a Merchant of Record (Polar)** + stateless signed entitlement tokens | Own Stripe integration with a customer database | No customer database; the MoR is the system of record and handles sales tax. |
| ADR-12 | **Local AI only** (Chrome Prompt API, Ollama/LM Studio on localhost, WebLLM) | Hosted LLM | No cost, no data leaves the participant's machine. |
| ADR-13 | **MCP server as a local npm package** joining a board like a participant | Remote MCP on the Worker | A remote MCP would need the plaintext; a local one holds the room key like any participant. |
| ADR-14 | Interface languages **FR + EN**, typed dictionaries, community-extensible | Five machine-translated languages | Quality first; a pseudo-locale in CI catches overflow. |
| ADR-15 | **Team profile kept locally** by the facilitator (team name, sprint counter, action history), exportable | Server-side team space | N2. |

Sources for the cost and platform facts used above:
- Durable Objects pricing and free limits: <https://developers.cloudflare.com/durable-objects/platform/pricing/> (100,000 requests/day, incoming WebSocket messages billed 20:1, 13,000 GB-s/day on Free).
- Workers limits: <https://developers.cloudflare.com/workers/platform/limits/> (100,000 requests/day, 10 ms CPU per request on Free).
- Cloudflare STUN is free (`stun.cloudflare.com`), TURN has 1,000 GB free then $0.05/GB: <https://developers.cloudflare.com/realtime/turn/faq/>.
- AGPL-3.0: <https://www.gnu.org/licenses/agpl-3.0.html>, SPDX `AGPL-3.0-only`.
- Polar license keys and fees: <https://polar.sh/docs/features/benefits/license-keys>, <https://polar.sh/docs/fees>.

## 3. Target architecture

```
                         retroboard.maoudia.com (Cloudflare edge, Free plan)
+-------------------------------------------------------------------------------------------+
| Worker "retroboard"                                                                       |
|  - static assets (Nuxt generate)        - security headers, CSP with build hashes         |
|  - /relay  WebSocket -> Durable Object  - /license  stateless entitlement minting         |
|  - Turnstile verification on create     - rate limiting, admission, quotas                |
|                                                                                           |
|  Durable Object "Room" (memory only, hibernation)                                         |
|   - forwards opaque encrypted events, WebRTC signalling                                   |
|   - keeps a bounded in-memory ring of recent ciphertext for fast catch-up                 |
|   - on wake with empty memory: asks connected peers to re-seed (resurrection)             |
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
- Optional passcode: `contentKey = HKDF(roomKey, salt=roomId, info=PBKDF2(passcode, 600k iterations))`. Participants need both the link and the passcode; the passcode is shared through another channel.
- Facilitator capability: an Ed25519 key pair created with the board. The public key is in the genesis event; the private key is only in the facilitator link (`#k=...&f=...`) and the facilitator's browser. Phase changes, vote reveal, role delegation and settings are signed with it; every peer rejects unsigned privileged events.
- Every participant has a session Ed25519 key; their events are signed so authorship ("only the author edits") holds without a server.

### 5.2 Event log

```
Envelope (visible to relay) = { v, roomId, eventId (ULID), hlc, size, ciphertext }
Plaintext (encrypted)       = { type, actor (pubkey hash), payload, signature }
```

- AES-GCM with AAD = `roomId|eventId|hlc` so the relay cannot replay events into another room or reorder them undetected.
- Total order = (hlc, eventId). Each peer folds events through `packages/domain` in that order. A late event triggers a re-fold from the last checkpoint (checkpoints every 200 events).
- Invalid events (bad signature, broken invariant) are ignored deterministically by every peer, so all replicas converge.
- Snapshots: the facilitator can emit a signed `SnapshotTaken` that lets new peers skip the history.

### 5.3 Relay behaviour (Durable Object, memory only)

- Admission: origin, room id format, Turnstile token on room creation, entitlement token (optional), max participants, message size (64 KB), message rate (per connection), room lifetime cap.
- Fan-out of envelopes to the other sockets of the room.
- Bounded ring buffer of the last N envelopes in memory (e.g. 2,000 or 4 MB) for fast catch-up.
- WebRTC signalling: forwards SDP offers/answers and ICE candidates between peers (encrypted too).
- **Never** calls `ctx.storage`. A test in CI fails if the relay code references the storage API.

### 5.4 Resurrection (replication)

- Every browser keeps its encrypted replica in IndexedDB and calls `navigator.storage.persist()` to reduce eviction.
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
- Hidden counts = UI hides totals until reveal. Secret ballot = votes are sealed to the facilitator's X25519 key and revealed as a tally, so even a curious participant cannot read them from the log.
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

- **Breakpoints**: phone (360-599), tablet (600-1023), laptop (1024-1599), wide (1600-2399), TV/projector (2400+). Container queries for columns; fluid type with `clamp()`. **Presenter mode** for TV/projector: larger type, high contrast variant, QR code to join, cursors hidden.
- **Readable at scale**: masonry layout per column, auto font fitting per note (min size, then truncate with "read more"), density levels, zoom (Ctrl/Cmd +/-, pinch), cluster collapse, search and filter, "focus mode" on one column.
- **Post-it colours**: a canonical palette close to classic sticky notes (canary yellow, neon pink, aqua blue, lime green, orange, lilac, mint, white). Exact hex values are defined in `packages/themes` and validated for AA contrast in light and dark variants.
- **Animations**: peel on hover, stick on publish (with a small paper flutter), magnetic snap when clustering, podium rise, ring tick. All honour `prefers-reduced-motion` and the profile setting.
- **Publishing UI rethink**: a single composer per column with "Publish" and "Publish all", a visible draft counter, "auto-publish at the end of the Write phase" (facilitator setting), undo for 10 s, keyboard (`Enter` save, `Cmd+Enter` publish), mobile bottom sheet composer.
- **Themes**: each theme ships light and dark variants. The board theme is imposed; participants switch variant only. The landing, /new and the profile use the landing theme, never a board theme.
- **Profile**: friendly default avatar (initials on a soft gradient, never "?"); persona avatar sets bundled and self-hosted; Gravatar as an explicit opt-in (it sends an email hash to Gravatar; CSP allows `img-src` for Gravatar only when enabled).
- **Smart title**: `<Team> - Sprint <N> - <date>` from the local team profile, sprint counter incremented on each retro.
- **i18n**: fix truncated labels (toolbar, segmented controls) with `min-width: 0`, wrapping and icon-only fallbacks; add a pseudo-locale (+40% length, accented) that CI renders on every page to catch overflow.

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
| Supply chain | SBOM (CycloneDX), license allow-list, pinned actions by SHA, npm provenance for `@retroboard/mcp` |
| Preview | `wrangler versions upload` per PR, preview URL commented on the PR (to verify on the current Wrangler) |

### 10.2 Release and deploy

- Conventional Commits + release-please for versions and changelog.
- Main is deployed by Workers Builds (already connected) with build `npm run generate` (becomes `pnpm turbo run build --filter=web`), then smoke tests against production, then `wrangler rollback` if smoke fails.
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
- Turnstile on board creation and license redemption (free).
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
| P4 Outputs | `export-hub` | actions-v2 | B |
| P4 | `retro-report` | voting-v2, talk-time | C |
| P5 Agents | `retro-mcp-and-agent-sessions` | stateless-relay, facilitation-roles | A |
| P5 | `local-ai-companion` | retro-report | B |
| P6 Growth | `landing-v2-and-product-video` | postit-visual-system | C |
| P6 | `licensing-and-monetization` | stateless-relay | A |

Definition of done for every change: specs updated, tasks checked, `npm run verify` green, e2e for user flows, i18n keys fr+en, docs updated, change archived after merge.

## 13. Business plan (en francais)

### 13.1 Positionnement

Retro gratuite, belle et sans compte, chiffree de bout en bout, qui ne garde rien. Cible : equipes agiles de 3 a 50 personnes, Scrum Masters freelances, ESN et equipes produit sensibles a la confidentialite (banque, sante, secteur public).

### 13.2 Offre (principe : le gratuit suffit pour faire une vraie retro)

| Offre | Prix indicatif | Contenu |
|---|---|---|
| **Free** | 0 EUR | Toutes les fonctions de base : agenda, votes, groupes, actions, export fichiers, 2 themes pro + 2 themes fun, jusqu'a 15 participants, retro jusqu'a 2 h |
| **Pro (facilitateur)** | 24 EUR/an (ou 2,99 EUR/mois) | Jusqu'a 50 participants, tous les themes et formats avances, agenda personnalisable illimite, rapport avance et marque, compagnon IA (presets), relais TURN pour les reseaux d'entreprise, sessions jusqu'a 4 h |
| **Team** | 79 EUR/an | 5 facilitateurs, 100 participants, packs exclusifs, branding (logo, couleurs) sur board et rapport |
| **Packs** | 3 a 5 EUR, achat unique | Themes saisonniers premium, formats de retro thematiques |
| **Self-host** | Gratuit (AGPL-3.0) | Libre, y compris en service, a condition de publier ses modifications ; licence commerciale (sans obligations AGPL), support et installation privee sur devis MAIDAF |

Pourquoi l'annuel en priorite : sur 2,99 EUR, les frais Polar (5 % + 0,50 USD, +1,5 % carte hors US sur le plan Starter) prennent environ 20 % ; sur 24 EUR, environ 9 %. Source : <https://polar.sh/docs/fees>.

### 13.3 Abonnements sans serveur ni base

1. Achat sur Polar (Merchant of Record) : Polar encaisse, gere la facturation client, les remboursements et le portail client.
2. Polar envoie une **cle de licence** liee a l'abonnement (revoquee automatiquement a la fin de l'abonnement). Source : <https://polar.sh/docs/features/benefits/license-keys>.
3. Le facilitateur colle la cle dans RetroBoard. Le Worker appelle l'API de validation Polar et renvoie un **jeton d'entitlement signe** (Ed25519, valable 7 jours, plan + limites). Rien n'est stocke chez nous ; la cle privee de signature est un secret du Worker (configuration, pas une donnee client).
4. Le jeton est garde dans le navigateur du facilitateur et presente a la creation d'une room. Le Durable Object verifie la signature et applique les quotas (participants, duree, TURN). Les participants profitent du plan du facilitateur.
5. Les fonctions purement client (themes premium, formats) sont livrees par le Worker seulement sur jeton valide. Le code est source-available : quelqu'un de determine peut les reconstruire pour son usage interne, ce que la licence autorise. La valeur vendue est le service heberge, la commodite et le soutien.

### 13.4 Cadre juridique et fiscal (a valider avec ton expert-comptable)

- **Licence** : GNU AGPL-3.0-only (licence open source approuvee OSI). Quiconque fait tourner une version modifiee en service doit en publier le code source (art. 13 AGPL). Double licence : une licence commerciale peut etre vendue par MAIDAF a ceux qui ne veulent pas de ces obligations ; cela suppose de detenir les droits sur tout le code, donc un CLA (Contributor License Agreement) pour les contributions externes (CLA Assistant, gratuit). Les commits jusqu'au tag `last-mit` restent sous MIT.
- **TVA** : en passant par un Merchant of Record, c'est lui qui vend au client final et gere la TVA de chaque pays (Directive 2006/112/CE, art. 58 pour le lieu de taxation des services electroniques B2C). Toi, tu factures une prestation au MoR. La qualification exacte (autoliquidation, lieu de la prestation B2B, CGI art. 259-1) est **a verifier** avec ton expert-comptable.
- **Mentions legales** obligatoires sur le site : loi n. 2004-575 du 21 juin 2004 (LCEN), art. 6-III.
- **RGPD** : meme sans stockage, Cloudflare traite des adresses IP et Polar des donnees de facturation. Il faut une politique de confidentialite (RGPD art. 13) qui liste ces traitements et sous-traitants.
- **CGV / CGU** : generees par le MoR pour la vente ; CGU du service a rediger (limites, absence de garantie de conservation des boards, puisque rien n'est stocke).

### 13.5 Projections prudentes (hypotheses, pas des promesses)

| Hypothese | Valeur |
|---|---|
| Equipes actives par mois apres 12 mois | 1 000 |
| Conversion Pro/Team | 2 a 3 % |
| Panier moyen annuel | 30 EUR |
| Revenu annuel brut | 600 a 900 EUR, avant frais (environ 10 %) |

Conclusion honnete : c'est un produit vitrine et un levier de missions (facilitation, self-host entreprise) plus qu'une source de revenus principale la premiere annee. Le cout d'infrastructure restant a 0 EUR, chaque vente est de la marge.

### 13.6 Acquisition sans tracking

Landing SEO (pages "format de retro X"), modeles de retro partageables, badge "Made with RetroBoard" sur les rapports exportes, GitHub (stars, contributions), posts LinkedIn de cas concrets, partenariats avec des coachs agiles.

## 14. Extra ideas

- **Presenter mode** for TV/projector with QR code to join and huge type.
- **ROTI** (return on time invested) vote at the end, trend kept in the local team profile.
- **Team health radar** (optional check-in format), trends over retros, local only.
- **Icebreaker deck** for the check-in phase, themed with the board theme.
- **Keyboard-first facilitation**: command palette (`Cmd+K`) for phases, timer, reveal.
- **Offline-first PWA**: write drafts on a plane, publish when back.
- **Anonymity guard**: hide authors until the end of the Write phase, then reveal if wanted.
- **Duplicate detection** while writing ("3 similar ideas already published").
- **Reactions** (emoji) on ideas, cheap P2P, no vote weight.
- **Retro of retros**: local trends of themes and recurring blockers across sprints.
- **Calendar file** (`.ics`) for action due dates.
- **Kudos wall** export as an image for Slack.
- **Facilitator coaching tips** per phase (local, no AI needed).
- **Community format gallery** through pull requests to `packages/domain` templates.

## 15. Risks and open points

| Risk | Mitigation |
|---|---|
| Board lost when every participant leaves | Clear UI promise, board file export, reminder before closing tab, team space keeps actions |
| Browser storage eviction | `navigator.storage.persist()`, board file, short retention by design |
| WebRTC mesh does not scale past about 15 peers | Partial mesh, relay fallback at 4 Hz, cursor display cap |
| Free quota exhausted by abuse | Turnstile, per-IP caps, room lifetime caps, cursors P2P |
| E2E hides abuse content from us | Report flow sends the offending content (decrypted by the reporter) to the facilitator only; we cannot moderate what we cannot read, stated in CGU |
| AGPL does not forbid resale | Network copyleft makes closed resale impractical; trademark "RetroBoard" and the hosted service remain ours; commercial license for those who need closed use |
| Polar dependency | License token format is ours; switching MoR changes only the redemption adapter |
| Local AI quality and hardware | Opt-in, graceful degradation, no feature depends on it |

Points still to verify during implementation (not blocking the plan): free-plan availability of the Workers rate limiting binding; Slack webhook CORS from browsers; Workers preview URLs per PR with current Wrangler; number of free WAF custom rules.

## 16. Traceability: request -> change

| Request (2026-10-24) | Change |
|---|---|
| Responsive i18n issues | `responsive-and-i18n-hardening` |
| Theme respected, not overridable; dark/white variants | `theme-policy-and-variants` |
| Global expandable countdown with cut rings | `timeboxed-agenda` |
| Predefined time-based retro (1 h, previous objectives, write, vote, actions) | `timeboxed-agenda`, `actions-v2-and-carry-over` |
| See each user's cursor | `p2p-presence-and-cursors` |
| Less nerdy export with file icons | `export-hub` |
| Straightforward sharing | `frictionless-sharing` |
| Protect each board (JAMstack) | `e2e-encrypted-rooms` |
| Export actions only | `export-hub` |
| Action owner suggestions + free text | `actions-v2-and-carry-over` |
| Import previous actions, Jira-like or checkbox status | `actions-v2-and-carry-over`, `board-creation-v2` |
| Previous actions popup at start | `actions-v2-and-carry-over`, `timeboxed-agenda` |
| Talk time with popup or ring, in settings | `talk-time` |
| Readable and groupable post-its at scale, real colours, animations | `postit-visual-system` |
| Mobile to TV and projector | `responsive-and-i18n-hardening` |
| No storage on our side, replication to resuscitate | `stateless-relay-and-replication` |
| Time-box agent, finish and report | `local-ai-companion`, `retro-report` |
| Intuitive publishing, rethink publishing UI | `publishing-ux-redesign` |
| MCP for agents, help agents add feedback, time-boxed agent sessions | `retro-mcp-and-agent-sessions` |
| Ethical business plan | Section 13, `licensing-and-monetization` |
| Expand all groups in a column | `clusters-as-merged-ideas` |
| HTML generated video on the home page | `landing-v2-and-product-video` |
| Open source mention on landing | `landing-v2-and-product-video` (AGPL-3.0) |
| Profile uses landing theme; friendly avatar, personas, Gravatar | `theme-policy-and-variants`, `profile-avatars-and-team-space` |
| Smarter retro name (team, sprint, date) | `profile-avatars-and-team-space`, `board-creation-v2` |
| Accurate visible voting, votes on groups, hide counts | `voting-v2-and-ranking`, `clusters-as-merged-ideas` |
| Votes and max people options at creation | `board-creation-v2` |
| Podium after voting | `voting-v2-and-ranking` |
| Group name, merged idea, votable, renamable | `clusters-as-merged-ideas` |
| Export to Atlassian, Google, Slack, structured files, agents | `export-hub` |
| Agentic GitHub Actions workflows, top CI/CD | `agentic-delivery-harness` |
| Cloudflare (Workers), no cost, free plan security | `edge-security-and-domain` |
| Funny companion with local LLMs | `local-ai-companion` |
| Auto-generated report page with metrics | `retro-report` |
| DDD, clean architecture, maintainable by agents | `restructure-ddd-monorepo`, `AGENTS.md`, skill `retroboard-stack` |
| OpenSpec with Claude Code and OpenCode | `openspec/`, `.claude/`, `.opencode/` |
