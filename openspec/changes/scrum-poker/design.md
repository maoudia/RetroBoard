# Design

Reference product: scrumpoker-online.org (rooms by link or QR, vote, reveal, reset; timer, average and median and a reusable room in a paid tier; no Jira integration by choice). This design keeps its one-click simplicity and puts its paid extras in the free product.

## Option chosen: a second room kind

| Option | Verdict |
|---|---|
| A poker room as a retro board with a special format and hidden counts | Rejected. The board model (columns, notes, clusters, actions) is wrong for estimation, and "reveal" and "decide" would be bolted onto board settings. |
| A new domain and room kind on the same transport | Chosen. Reuses envelopes, encryption, mesh, join code, passcode, replica, vault library. |
| A separate app and relay | Rejected: duplicates the platform and breaks the single deploy. |

An ADR (proposed with this change) records the choice and the rule that the relay stays memory-only and kind-agnostic: it forwards opaque envelopes and never learns whether a room is a board or a poker room. If the room id or the envelope needs a kind marker, it travels inside the encrypted payload or the key fragment, never as relay-visible metadata.

## Where each piece lives

| Piece | Layer |
|---|---|
| `PokerState` (stories, rounds, votes, decisions, settings), commands `story.add`, `story.select`, `round.start`, `vote.cast`, `round.reveal`, `round.reset`, `estimate.decide`, `settings.update`, reducer and snapshot | `packages/domain/src/estimation/` (pure) |
| Statistics (average, median, mode, spread, consensus, suggested card, outliers), deck definitions, session summary | `packages/application/src/estimation/` (pure read models) |
| Transport, replica, room access | reused from board sessions through the same ports |
| Pages and components | `apps/web/app/pages/poker/`, `components/poker/` |

## Sealed votes

A vote is a sealed ballot: the voter encrypts the card to the round key and the facilitator's reveal publishes what opens them (the mechanism of `packages/domain/src/voting/sealed.ts`). Consequences: no client can see a card before the reveal, a reload mid-round keeps the voter's own card (kept locally), a late joiner sees "voted" marks only. A "who voted" mark is public (a boolean per seat); the value is not. The spike (task 1.1) confirms the existing sealed design carries a per-round key and decides whether it is reused as is or generalised.

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

- Moderator (the creator, transferable), voters, observers. "Everyone moderates" is an option.
- Cap of 20 voters per room by default (observers uncounted up to the peer cap of the mesh) so the relay fallback stays inside its budgets; configurable down. The cap is a spike output tied to `packages/protocol/src/budgets.ts`.
- Idle cost: zero. Only events are sent; there is no heartbeat beyond the presence the board already uses.

## Privacy and security note

The relay sees ciphertext, sizes and timing, as for boards. Stories typed by the facilitator are event content and are encrypted like notes. Imported Jira titles are the same: they never go to us. The room key is in the link fragment (ADR-0029), the join code and passcode work as for boards. No analytics, no cookies, nothing stored by us. An exported file is the person's own copy.

## Creative extras, and what is not promised

Themed card backs and flip motion, emoji throws, digit keys, auto-reveal, quick-estimate mode, a result card to copy. Sound stays off by default and uses the existing setting. Any extra that costs relay traffic beyond a small fixed event is cut first.

## Risks

- Scope: this is the largest item on the list. Groups are ordered so that after group 3 a room already works end to end; stories, decks and export can ship later.
- Cheating through a modified client: sealed votes remove peeking; nothing can stop a voter from asking a colleague, which is a human matter.
- SEO and launch timing: the public page is group 7 and must not delay the rest.
