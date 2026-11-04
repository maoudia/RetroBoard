# Proposal

## Why

Owner feedback 2026-11-04 (eight photos and screenshots, four feature asks): the size buttons have poor contrast and use squares, columns have different widths, grouped ideas break on phones, the write-area chevron only acts on one column, the chat drawer is cramped on phones, the "Done" tick is an unstyled box, presentation mode hides the content of groups, and four facilitator features are missing.

## What Changes

1. Size controls use rectangles everywhere and keep a readable selected state in every theme (urgent).
2. One shared tick component replaces the bare "Done" checkbox.
3. Columns use the full width available so text never overflows in posts and groups; one width rule for all columns.
4. Grouped ideas lay out correctly on small screens.
5. When the write areas are locked together, the double chevron opens and closes every column.
6. Phone chat drawer takes more space, hides the participants strip by default on small screens, and has a messaging-style composer.
7. Presentation mode shows the ideas of each group by default; a board setting turns it off.
8. Screens recentred: calmer header and spacing on big and small screens.
9. Facilitator can colour a whole column in one go.
10. A facilitator or the author can remove a single idea (dangerous action, confirmed).
11. A board can be cloned (columns, theme, agenda), and only its actions can be copied into a new empty board.

## Capabilities

### Modified Capabilities
- `ui-coherence`, `presentation`, `notes`, `boards`, `chat`
