# Proposal

## Why

Fifth batch of the CSS audit (owner note 2026-11-20): on a laptop or tablet the floating chat dock starts 12 px under the toolbar, which covers the right end of the agenda strip (the phase progress line) that sits between the toolbar and the board.

## What Changes

- The chat dock starts below the agenda strip (toolbar height plus 2.6rem). On phones the chat is full screen and unchanged.
- Audited and kept as is: the "Open the vote now" button ends in an ellipsis in narrow columns (wrapping it makes notes taller and collides with the stack badge); the board title that yields to the toolbar.

Out of scope: behaviour, strings. Web only, CSS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-coherence`: floating panels do not cover the agenda strip.

## Impact

`apps/web/app/components/ChatPanel.vue`.
