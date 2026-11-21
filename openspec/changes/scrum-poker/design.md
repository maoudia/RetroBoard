# Design

Reference product: scrumpoker-online.org (rooms by link or QR, vote, reveal, reset; timer, average and median and a reusable room in a paid tier; no Jira integration by choice). This design keeps its one-click simplicity and puts its paid extras in the free product.

## Option chosen: a second room kind

| Option | Verdict |
|---|---|
| A poker room as a retro board with a special format and hidden counts | Rejected. The board model (columns, notes, clusters, actions) is wrong for estimation, and "reveal" and "decide" would be bolted onto board settings. |
| A new domain and room kind on the same transport | Chosen. Reuses envelopes, encryption, mesh, join code, passcode, replica, vault library. |
| A separate app and relay | Rejected: duplicates the platform and breaks the single deploy. |

ADR-0042 (accepted after the spike of task 1.1) records the choice and the rule that the relay stays memory-only and kind-agnostic: it forwards opaque envelopes and never learns whether a room is a board or a poker room. The spike confirmed it on the real relay. The kind is a field of the signed genesis event (`kind: "poker"`, absent means a board), so it travels inside the encrypted payload and is written once. The link fragment (ADR-0029), the join code and the passcode are unchanged and name no kind. The room page is `/poker/room#c=...`: the room id stays in the fragment, never in the path.

What the spike changed in this design: the sealed vote has a key per round published at the reveal (below), the voter cap is settled at 20 with its arithmetic in the ADR, and the shared ledger fold, which is typed on boards, is made kind-aware (next table). The transport itself (envelopes, relay, mesh, replica, anti-entropy) needs no change.

## The demo behind a flag

At the owner's request the proof of task 1.1 is a runnable demo (`apps/web/app/poker/`, `apps/web/app/pages/poker/`): `/poker` starts a room, `/poker/room#...` is the room, one tab creates it and others join by the link, each picks a card, nothing shows until Reveal and then the cards flip together. It speaks the real protocol through the relay only, has one Fibonacci deck, French and English strings kept beside it (not in the shared dictionaries, which sit inside the bundle budget) and uses the theme tokens. The flag is `NUXT_PUBLIC_POKER_DEMO=1` at build time: without it the routes are removed from the router, so the pages, their code and their strings are not in the build and the bundle budget does not move. The demo is the seed of the first playable slice and is replaced piece by piece by the real transport and domain (tasks 1.2 and 2.1), not kept next to them.

## Where each piece lives

| Piece | Layer |
|---|---|
| `PokerState` (stories, rounds, votes, decisions, settings), commands `story.add`, `story.select`, `round.start`, `vote.seal`, `round.reveal`, `round.reset`, `estimate.decide`, `settings.update`, reducer and snapshot | `packages/domain/src/estimation/` (pure) |
| Kind-aware ledger: `kind` in the genesis, a body `t: "poker"` handed to the estimation reducer, the poker privilege set (the moderator steers, anyone votes), the board rules untouched (`LEDGER_VERSION` stays) | `packages/domain/src/access/ledger.ts` (pure) |
| Wire: optional `kind` in the genesis body, the poker body and its command schema (an unknown body is kept and passed on by older clients) | `packages/protocol/` |
| Round key (`HKDF` of the opener's secret, per round), seal and open of a card; the board's `ballot.ts` is not changed | `packages/crypto/` (new file) |
| Statistics (average, median, mode, spread, consensus, suggested card, outliers), deck definitions, session summary, the read model that opens the ballots with the published key | `packages/application/src/estimation/` (pure read models and a ballot opener port) |
| Transport, replica, relay, mesh, join code | reused from board sessions; the send takes any event body; the relay does not change |
| Pages and components | `apps/web/app/pages/poker/`, `components/poker/`; `/poker` and `/poker/room` in `APP_ROUTES`, the room page in `PRIVATE_PREFIXES`, `/poker/room#` allowed for the joiner of a code |

## Sealed votes

A vote is a sealed ballot: the voter encrypts the card to the key of the round, and the reveal publishes the private half of that key, which opens every ballot of that round and no other. The spike found that the existing sealed ballot (`packages/domain/src/voting/sealed.ts`, `packages/crypto/src/ballot.ts`) is not reused as is: its key is one pair per facilitator link (publishing it would open every round), its payload is a note or cluster id (a card does not fit) and its reveal is anonymous counts (poker shows each seat's card). Its primitives are reused.

- Key: `round key = X25519(HKDF(opener secret, salt = room id, info = "rb/poker/round/v1|<round>"))`. The opener is the device that signs `round.start`; the facilitator link re-derives the key on any device, so a reload or a `role.claim` keeps it. The public key is in `round.start`.
- Ballot: `sealTo(round public key, 40 byte record "c<deck index>" padded, aad = "rb/poker/v1|<room>|<voter key>|<round key>")`, 100 bytes, 134 characters, inside the existing `SEALED_RE`. The AAD binds the ballot to the room, the voter and the round: a copy under another voter or into the next round does not open.
- One card per voter per round: the last `vote.seal` of an author replaces the earlier one before the reveal. The deck is frozen for the round. The voter's own card after a reload is kept on its device (sealed local storage), since the voter cannot open its own ballot.
- Reveal: `round.reveal { round, key }` signed by the opener. Every replica opens every ballot with the key (the application read model, with the public key check that the pure fold cannot make). Auto-reveal is therefore sent by the opener's device. A wrong key leaves the cards unreadable and a re-vote repairs it.
- A "who voted" mark is public (the author of each `vote.seal`); the value is not. A late joiner sees marks only.
- What each party learns: participants, nothing before the reveal (a voter cannot open its own ballot, tested); the relay, ciphertext of five fields; the moderator's device, which holds the key, could read cards early with a modified client (tested), as a facilitator can on a board. The interface never shows them and the help says so.

## Round flow

```
story selected -> round open (cards face down) -> reveal -> discuss -> re-vote | decide -> next story
```

- Reveal by the moderator, or automatically when every voter has voted (setting), or when the countdown ends (setting).
- A re-vote starts a new round of the same story; earlier rounds stay in the story's history (the summary shows the movement towards consensus).
- Deciding records the final estimate (a card of the deck or a free value) and the round it came from. The suggestion is the card nearest to the median, never applied by itself.
- Late changes of a vote before the reveal are allowed; after the reveal they are not (a re-vote is the way).

## Statistics

Computed from revealed rounds only, by one pure function: numeric cards give average, median, mode and spread; non-numeric cards (`?`, coffee, T-shirt sizes) are counted but excluded from numeric statistics, and T-shirt decks use ordinal median. Consensus is a fraction of voters on the modal card (shown as a meter plus text, never colour alone). Outliers are the lowest and highest cards when the spread exceeds one step of the deck.

## Roles and limits

- Moderator (the creator, transferable between rounds; a transfer in the middle of a round starts a new round, because the round key stays with its opener), voters, observers. "Everyone moderates" is an option: anyone may open a round, and whoever opens it holds its key, so only they can reveal it (if they leave, another moderator starts a new round).
- Cap of 20 voters per room, the default and the ceiling of the first release, configurable down. The relay allows 30 connections per room (`LIMITS.maxConnections`) and cannot tell voters from observers, so the fold enforces the cap: the first 20 seats in log order are voters, later claims are observers, and observers and second tabs share the other 10 connections. The budget would allow more; the connection cap, the shared observer seats and the guidance of `docs/capacity.md` (laptops above 20) do not. The arithmetic is in ADR-0042: about 1,170 events and 80 to 178 billed requests for a 20-voter hour, against 100,000 a day.
- Idle cost: zero. Only events are sent; there is no heartbeat beyond the presence the board already uses. The cost that grows with the room is the presence on each join (about n squared over 2 messages), not the votes.
- Signed snapshots (ADR-0037) are not used for a poker room in the first release: about 1,200 events an hour replay in well under a second.

## Privacy and security note

The relay sees ciphertext, sizes and timing, as for boards: in a poker room, measured, a room id of 22 random characters and envelopes of five fields (a vote is a frame of about 700 bytes). It cannot be sent a kind marker (an envelope with a field beyond the five is refused) and the page path names no room. The host that serves the page sees `/poker/room` when someone opens a room, without the room id, as it sees `/boards` today. Stories typed by the facilitator are event content and are encrypted like notes. Imported Jira titles are the same: they never go to us. The room key is in the link fragment (ADR-0029), the join code and passcode work as for boards. No analytics, no cookies, nothing stored by us. An exported file is the person's own copy. The moderator's device holds the round key (see Sealed votes); the other participants cannot read a card early.

## Creative extras, and what is not promised

Themed card backs and flip motion, emoji throws, digit keys, auto-reveal, quick-estimate mode, a result card to copy. Sound stays off by default and uses the existing setting. Any extra that costs relay traffic beyond a small fixed event is cut first.

## Risks

- Scope: this is the largest item on the list. Groups are ordered so that after group 3 a room already works end to end; stories, decks and export can ship later.
- Cheating through a modified client: sealed votes remove peeking by every participant except the moderator's own device, which holds the round key and is trusted not to look, as a facilitator is on a board; nothing can stop a voter from asking a colleague, which is a human matter.
- The ledger fold is typed on boards: making it kind-aware is a refactor of shared code (task 1.2). Boards must fold exactly as before, so the existing ledger and relay contract tests stay unchanged and gate it.
- The spike did not run the WebRTC path nor 20 real browsers; the budget is a model with its assumptions written in ADR-0042. Task 2.1 verifies the mesh with three contexts in CI.
- SEO and launch timing: the public page is group 7 and must not delay the rest.
