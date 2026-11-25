# After group 6: the last pass

The final screenshot review of the change, taken like `../before/` and the earlier `after-group-*` folders (English, the moderator "Malaka" and five voters Ann, Bob, Cy, Dee and Eli, the cards 8, 5, 5, 13, 5, `?`; `<screen>-<voters>-<before|voted|revealed>-<light|dark>`; `phone664` is 390x664, `phone360` 360x640, `tablet` 768x1024, `desktop` 1280x800, `tv` 2560x1440). `-1-before-` is the room alone, `-6-before-` the six at the table with no card, `-6-voted-` four of six voted, `-6-revealed-` the reveal. The start page and the name step are in `../after-group-5/`, the bar and the profile of the application in `../after-shell/`. `card-backs-nine-themes.webp` is the review of the card back in the nine themes, light (top) and dark (bottom).

## Against `before/` and the wireframes

| What the owner saw before (`before/owner-live-phone-revealed.webp`, `phone-*`) | After |
|---|---|
| A long page, a heading "The table", a status line and a hint before anything visual, one small seat pinned to the left, a "Result" box of six text labels, two equal buttons with a glow, the hand below everything | One viewport at 390x664 and 360x640 in every state with six voters: the bar, the table, the results card, the dock. The page does not scroll in any of the 20 pictures taken for this folder (checked on the document, sideways and vertically) |
| Seats as boxes, a voted seat a flat block of accent | Seats are a card slot (a back with a check, an empty slot with a clock, the face after the reveal), the person's avatar and name, role and state as icons |
| Results as text labels | The average and the median as two large numbers, "Some agreement" with its meter and 50%, the distribution as a column per card, "Highest: 13 (Cy)" with its icon on the seat, "Use 5" |
| Vote again filled with a glow and Next round an outline, equal | One filled button, the likely next step: Vote again here because the room is at 50% agreement; no glow |
| One 44 rem column on every screen, nothing on the TV | An oval table from 600 px with the results beside it on a laptop and under it on a tablet; on the TV the table, seats, cards and numbers grow and the bar keeps its size |

Measured: the document does not scroll sideways or vertically at any of the five sizes, light or dark, in the lobby, voting and revealed states with six voters. The contrast spec (`tests/e2e/poker-themes.spec.ts`) passes on the nine themes in both variants; the review of the card backs says three of them are blues (Studio, Corporate, Slate) and two are oranges (Paper, Halloween), which is decided in `design.md` (no theme file changes).
