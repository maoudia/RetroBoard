---
status: accepted
date: 2026-11-21
decision-makers: Moncef Aoudia
---

# A poker room is a second room kind on the same transport

## Context and Problem Statement

The owner wants a Scrum Poker feature in the spirit of scrumpoker-online.org: rooms by link, hidden cards, a simultaneous reveal, results, a story list. RetroBoard's rooms, encryption, relay and replica were built for retro boards. The question is where poker lives. See the change `scrum-poker`, whose task 1.1 is the spike this ADR records: does a poker room fit the existing transport with no relay-visible kind marker, does the sealed-ballot mechanism carry a key per round, and what voter cap do the relay budgets allow.

## Decision Drivers

* Zero infrastructure cost and no server-side storage; end-to-end encryption with the key in the link fragment
* No duplicate platform to run and secure
* The relay must stay memory-only and unable to tell what a room is used for
* Votes must stay hidden from the other participants until the reveal, even from a modified client

## Considered Options

* A poker room modelled as a retro board with a special format
* a new domain and room kind on the same transport (envelopes, encryption and replica reused)
* A separate poker application and relay

## Decision Outcome

Chosen option: "a new domain and room kind on the same transport", because the board model (columns, notes, clusters, actions) is wrong for estimation, while the transport, encryption, join code, passcode, mesh, relay fallback, replica and vault library are exactly what a poker room needs. The spike confirmed it with one correction to the sealed-ballot plan (a key per round, published at the reveal) and one constraint on the code (the ledger fold is typed on boards).

Rules:

* The estimation domain is its own pure bounded context (`packages/domain/src/estimation/`); it imports nothing from the board contexts.
* **The kind is inside the encrypted payload.** The signed genesis event carries `kind: "poker"` (absent means a board). It is written once, by the facilitator key, so no later event can change it (`duplicate-genesis`). The relay, the link fragment, the join code and the passcode do not change and do not name the kind. The relay is kind-agnostic: it forwards opaque envelopes of five fields and learns nothing about the kind.
* **Same link, one new page.** A poker link is `/poker/room#c=<room id><room key>[<moderator secret>][&p=1]`: the compact fragment of ADR-0029, unchanged. The room id stays in the fragment, never in the path, so the page request names no room. The path says "poker" to the host that serves the page, as `/boards` says "a board" today; correlating it with a socket takes timing and address, as for boards.
* **Votes are sealed ballots with a key per round.** The moderator's device derives a fresh X25519 pair for each round from its own secret and puts the public key in `round.start`. Each voter seals its card to that key. The reveal event carries the private half; every replica opens every ballot itself. The existing sealed-ballot code is not reused as is (see finding 2): its primitives are, its key schedule and payload are not.
* **The voter cap is 20 per room**, enforced by the fold, inside the relay's 30 connections per room (observers and second tabs use the other 10). The derivation is in finding 3.
* **The ledger fold becomes kind-aware, boards untouched.** The access rules (genesis, roles, hide and remove, names, rate window) stay shared; the content rules are selected by the kind. Poker rooms do not use signed snapshots in the first release.

### Consequences

* Good, because poker is free, private and account-free by construction and costs no new infrastructure
* Good, because rooms sync and export through the paths boards already use, and the relay, the mesh, the replica and the anti-entropy need no change
* Good, because the reveal is one event and every replica reaches the same cards without trusting a tally
* Bad, because shared transport code must now serve two kinds, which needs contract tests on both
* Bad, because the moderator's device holds the round key and could read cards early with a modified client; the other participants cannot (finding 2)
* Bad, because the largest item of the backlog depends on a refactor of the ledger fold before the estimation domain can land (task 1.2)

## More Information

### Finding 1: the transport carries a second kind

Read in the code and proved on the real relay (the test below).

What is already kind-agnostic:

* The envelope is `{v, room, id, hlc, ct}` and a strict schema (`EnvelopeSchema`); the relay's frame parser refuses any other field with `err invalid`, so a visible kind marker cannot even be sent. `RoomCore` reads only the `room` and `id` of an envelope, never `ct`.
* Key fragment, passcode (it stretches into the content key), signing and sealing (`sealEventFor`), the mesh and its relay fallback, anti-entropy, the replica and the join code move envelopes and signed events without looking at the body. The joiner of a code follows the link the holder seals to it, so the code names no kind either.
* An event body a client does not know is kept, passed on and not folded, and the page is told "newer version" (`parseEventOrUnknown`, `keepNewer`). The test confirmed `poker` bodies parse as `unknown`. A genesis with `kind` parses as invalid in a client of today and is dropped, which is acceptable: a client of today never receives a poker link. The board fold is unchanged, so `LEDGER_VERSION` stays at 1.

What the relay sees in a poker room (measured): the room id of the socket URL (22 random characters, made as a board's), envelopes of five fields, and sizes and timing. Whole `pub` frames were 612 bytes (genesis), 581 (round start), 704 (one vote) and 582 (reveal). Sizes and timing are the same class of leak as for boards (a burst of equal frames is a vote); it is accepted, not hidden. Never visible: the kind, the deck, names, stories, cards, keys.

What is not yet kind-agnostic, and is the work this decision hands to the next groups:

* `Ledger` (`board: BoardState`), `foldEvent`, `EventBody`, `SignedEventSchema`, the snapshot `LedgerShape` and `BoardChannel.send(command)` are typed on boards. `publishLocal(body)` and `EventLog` already work on any `EventBody`, so the seam is small: a body `t: "poker"` that `foldEvent` hands to the estimation reducer, and a send that takes it.
* `isPrivileged` treats every body other than `cmd` and `participant.self` as privileged, so a poker vote would be refused; the poker rules need their own set (moderator: round, story, decision, settings; anyone: vote).
* The joiner of a code follows only `/boards?#` links (`join-flow.ts`); `/poker/room#` must be allowed. `APP_ROUTES` (relay `errors.ts`) must list `/poker` and `/poker/room`, and `PRIVATE_PREFIXES` the room page, so it is never indexed.

### Finding 2: the sealed-ballot mechanism does not carry a key per round as is

| Aspect | Board sealed ballot today | What a poker round needs | Verified |
| --- | --- | --- | --- |
| Key | One X25519 pair per facilitator link: `HKDF(seed, "rb/ballot/v1")`, the same for every round | A pair per round | Two derivations give one key; a per-round derivation gives different keys |
| Payload | `{kind: note or cluster, id}`, id of 4 to 32 characters | A card of a deck (an index) | A card such as `13` is refused (`invalid ballot id`) |
| Reveal | Counts only, anonymous, trusted to the tallier; replicas check bounds | Each seat's card, the same on every replica | One event with the round key; both replicas opened the same two cards |
| Publishing the key | Would open every round of the link | Opens one round | A published board key opens any ballot sealed to it; a round key does not open the next round |

Decision: **a key per round, published at the reveal.** `round key = X25519(HKDF(opener secret, salt = room id, info = "rb/poker/round/v1|<round>"))`, where the opener is the device that signs `round.start`; the facilitator link re-derives it on any device, so a reload or a takeover with `role.claim` keeps it. A card is sealed with `sealTo`, a 40 byte record (`c<deck index>`, space padded) and the AAD `rb/poker/v1|<room>|<voter key>|<round key>`: 100 bytes, 134 characters, inside the existing `SEALED_RE`. HKDF, X25519, AES-GCM and Ed25519 are the primitives already in `packages/crypto`; a new file there holds the round key, the seal and the open (task 1.2). The board's `ballot.ts` and its voting do not change.

Alternatives: the moderator opens the ballots and signs a list of cards (board style) needs no new key but nobody can check the list and a lead who is not the link holder cannot reveal; a commit-and-reveal by each voter makes the reveal depend on every voter's tab and lets a voter who has seen the others stay silent. Both lose to one atomic event that every replica verifies by itself.

Verified: before the reveal a voter cannot open its own ballot and no replica shows a card; after the reveal both replicas open the same two cards; a ballot copied under another voter, or into the next round, does not open (the AAD binds voter and round key).

Limits, to say in the spec, the interface and the help:

* **The moderator's device can read cards before the reveal** with a modified client (the test shows it: it opened a ballot), as a facilitator can on a board. "Hidden from everyone, including modified clients" is true of every other participant. The interface never shows early cards.
* **The reveal is signed by the opener**, so an automatic reveal (all voters in, or a countdown) happens on the opener's device and needs it online. A moderator transfer between rounds is free; a transfer in the middle of a round starts a new round.
* The pure fold cannot check that the published key matches the round key (no crypto in the domain). A wrong key freezes the round with unreadable cards; the read model flags it and a re-vote repairs it. A moderator can already withhold a reveal, so this adds no power.
* A voter's own card after a reload is kept on its device (sealed local storage), since it cannot open its own ballot. One card per voter per round: the last `vote.seal` replaces the earlier one, so no `vote.unseal` is needed. The deck is frozen for a round.

### Finding 3: the voter cap and the free-plan budget

Inputs, read from the code: `LIMITS.maxConnections` 30 per room (a 31st socket gets `err full`, close 4008); per socket 80 board frames and 120 signalling frames and 60 live frames per 10 seconds (`FRAME_MAX`, `SIG_MAX`, `EPH_MAX`), a client paces itself at 40 (`PUB_PACE_MAX`); an author's events beyond 60 per 10 seconds are ignored by every replica (`foldRateMax`); one event up to 16 KiB (`maxMessageBytes`); the relay keeps 2,000 envelopes or 4 MiB (`RELAY_BUFFER`); the mesh is complete up to 12 people (11 links each) and above it each peer keeps 7 or 8 links (7 at 20 people, 70 links in all). Free plan (`docs/capacity.md`): 100,000 requests a day, incoming WebSocket messages billed 20 to 1, outgoing free, 13,000 GB-s a day (28 hours of an awake 128 MB object).

Model of one hour with 20 voters, written down so it can be redone: 20 stories, 2 rounds each, 30 per cent of voters change a card once.

| Quantity | Arithmetic | Result |
| --- | --- | --- |
| Events per round | 1 start + 26 votes + 1 reveal | 28 |
| Events per hour | 20 stories x (2 rounds x 28 + select and decide) + backlog and settings | 1,171 (0.33 a second for the room, 0.016 a second per person) |
| Join traffic through the relay | presence: 20 x 19 / 2 + 20 = 210; signalling: 20 x 7 links = 140; re-seed: about 2 frames a join = 40 | 390 incoming messages |
| Billed requests, events over the mesh (normal) | (390 / 20) + 20 socket upgrades + 40 to 80 page requests | 80 to 120 |
| Billed requests, every event relayed (worst case) | ((1,171 + 390) / 20) + 20 + 40 to 80 | 138 to 178 |
| Sessions a day at the limit | 100,000 / the figures above | 836 to 1,257 normal, 561 to 724 worst case |
| Same worst case for a retro of 20 people | 6 events a person a minute (the load test of `docs/capacity.md`) | 7,200 events an hour, six times a poker hour |
| Relay buffer at the end of the hour | 1,171 x about 704 bytes | 0.8 MB of 4 MB, 1,171 of 2,000 envelopes |

Duration is bounded as in ADR-0024: at most 28 hours of awake object a day, so 28 sessions if the relay were awake the whole hour, which poker is not (votes come in bursts of seconds, then the object can hibernate). The hibernation delay is Cloudflare's and unmeasured here, as in `docs/capacity.md`.

Join presence is the term that grows with the square of the room (465 messages at 30 people). The relay is not the limit: the connection cap is.

Decision: **20 voters, the default and the ceiling of the first release**, lower by setting. Observers take the remaining connections (30 minus the voters; a person with two tabs counts twice). The fold enforces it, since only the fold knows who is a voter: the first 20 seats in log order are voters, later claims are observers, and the 31st connection is refused by the relay as for a board. Twenty, not thirty, because the budget would allow more but the connections are shared with observers and a second tab, and `docs/capacity.md` recommends laptops above 20.

### The test and the demo

The spike ran as two Chromium contexts against `wrangler dev` (the Worker and the Durable Object as in production), with a spike client bundled from the real crypto, protocol, signing and invite code and a few lines of poker fold. It opened a room with a passcode and a facilitator link, published a genesis with `kind: "poker"` and round `r1`, joined from the participant link and read the history, sealed two votes, checked that no card was readable, revealed with the round key, and checked that both replicas open the same two cards. It then started round `r2`, checked the replay cases, sent an envelope with a `kind` field (the relay answers `invalid`), and checked that every relay frame has the five fields, one room id and no word of the poker vocabulary, and that no HTTP request carried the room id or the fragment. It passed (2.5 seconds).

At the owner's request the proof became a runnable demo behind a flag that is off by default (`NUXT_PUBLIC_POKER_DEMO=1` at build time; `docs/DEVELOPMENT.md` has the commands and what to click). It is the same protocol as the spike client, one card per voter per round, in `apps/web/app/poker/`, with its own unit tests (`apps/web/test/poker-demo.test.ts`: sealing, the fold, two clients through a relay stand-in, the cap of 20) and a two-tab e2e spec (`tests/e2e/poker-demo.spec.ts`, skipped on a normal build). Without the flag the routes, the code and the strings are not in the build.

Update, release 1.63 (ADR-0044): the flag was removed; the pages are in every build as lazy routes, marked beta, and the spec runs on every build.

Not verified, to be covered by the next groups: the WebRTC mesh path (the specs that need it run only in CI), the real transport class with a poker fold (the seam above is read, not built; the demo has its own relay-only client), 20 real browsers, the hibernation delay in production, and the figures of the budget model that are assumptions (stories an hour, vote changes, 2 re-seed frames a join, 2 to 4 page requests a person).

### Constraints handed to the next groups

* 1.2: the kind-aware fold and the poker privilege set; the round key, seal and open in `packages/crypto`; no snapshot for a poker room (about 1,200 events an hour replay in well under a second).
* 2.1: `/poker` and `/poker/room` in `APP_ROUTES`, the room page in `PRIVATE_PREFIXES`, `/poker/room#` allowed for the joiner of a code, a poker link opened as a board shows a hint, the kind in the library entry.
* 3.3: automatic reveal is the opener's device. 4.1: a pasted backlog goes in batch events (at most 50 stories and 16 KiB each), because the fold ignores an author's events beyond 60 per 10 seconds. 5.2: emoji throws are live frames, never in the log, within 60 per 10 seconds per socket.

Related: ADR-0017 and ADR-0024 (events travel peer to peer, relay as fallback), ADR-0021 (everyone facilitates by default; poker defaults to one moderator), ADR-0026 (one engine for solo and shared boards), ADR-0029 (compact links with board keys), ADR-0037 (snapshots), `docs/capacity.md`. The spec deltas of this decision are in `openspec/changes/scrum-poker/specs/`. Revisit if the voter cap makes rooms too small for real teams or if production measurements of relay duration differ from the model.

Amended in part by ADR-0045 (proposed, 2026-11-21): a board may also fold the poker rounds of an estimation phase in its own ledger. The decision above (a poker room is a second room kind, estimation is its own bounded context, the relay is kind-agnostic) is unchanged.
