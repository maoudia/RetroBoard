# Proposal

## Why

Today the facilitator capability is a secret in a link: anyone who opens the facilitator link is a facilitator, there can be several at once, and the link is hidden in a collapsed section of the share panel. People are unsure who leads. The owner wants one clear facilitator, visible on the board, with simple rules.

## What Changes

- **One lead facilitator at a time**, with simple rules:
  1. The creator is the facilitator.
  2. Opening the facilitator link on another device asks "Take over facilitation?"; confirming makes that device the facilitator (the last one to confirm wins), the previous facilitator becomes a co-facilitator and is told.
  3. The facilitator can hand the role to any connected participant from the participants list (exists, made more visible).
- The facilitator is visible: a crown badge above their pointer and next to their name in the participants list and on the presence markers.
- The facilitator link gets its own card in the share panel ("For you or a co-facilitator"), with copy, a warning, and "send to a connected participant" (handover) instead of a collapsed detail.
- Theme sync: a regression test proves that a facilitator who is not the creator, and a new lead after handover, theme the board for everyone (the owner's report could not be reproduced; the test stays).

Applies to boards in "One facilitator" mode only; "Everyone facilitates" (the default since open-facilitation-default) has no lead, no crown and no takeover.

Out of scope: accounts or identity verification.

Bounded contexts: Access (roles), Presence (badge). Relay traffic: one role event per takeover.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `facilitation`: single lead, takeover by link, visibility.
- `sharing`: facilitator link card.

## Impact

- Domain: `role.claim` signed by the facilitator capability key (existing seed) naming the claiming session key as lead; fold rule "last claim wins".
- Web: takeover dialog, crown on cursor and presence markers, share panel card.
