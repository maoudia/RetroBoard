# Proposal

## Why

The owner wants the retro's theme to be respected by everyone; today a participant can replace it with their own theme. At the same time some people cannot read dark boards (or light ones on a projector). Also the landing and profile still show the board theme (Halloween) instead of the landing design.

## What Changes

- **BREAKING**: remove the personal theme override ("My theme").
- Every theme ships a light and a dark variant; each participant may switch variant (or follow the system).
- Landing, /new and the profile dialog always use the landing design system, never a board theme.
- The facilitator's theme choice is a privileged, signed event.

Out of scope: new themes (premium packs are in `licensing-and-monetization`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`: remove personal override, add variants and the landing/profile theme rule.

## Impact

- Packages `themes` (variant tokens, contrast tests per variant), web profile dialog, theme plugin.
- Free-plan budget: none.
