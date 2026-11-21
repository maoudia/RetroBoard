# After group 1: the card and the hand

Screenshots of the room after tasks 1.1 and 1.2 of `tasks.md`, taken the same way as `../before/` (the generated site served by the Worker with the real relay; English, theme Studio; the moderator "Malaka" has the screen size, the other voters are phone contexts; the same cards: 8, 5, 5, 13, 5, `?`). Names follow `before/`: `<screen>-<voters>-<before|voted|revealed>-<light|dark>`, `phone` is 390x844 at a device pixel ratio of 2, `tablet` 768x1024, `desktop` 1280x800, `tv` 2560x1440. Each is the top of the page; the room still scrolls in its middle region until group 2.

## What changed, against the wireframes

| Wireframe element | After group 1 |
|---|---|
| Hand, phone: 7 + 6 cards of 46x64, centred, in the dock at the foot, same place in every state | Done (`phone-*-before`, `-voted`). Measured by e2e at 390x664 and 360x640: every card inside the viewport, at least 44x44, 6 px or more apart, rows of 7 and 6 centred, the dock's bottom edge on the viewport's, the box of the hand identical before voting, after a vote and in the next round |
| Chosen card lifted, ringed, with a check badge, never dimmed | Done (`phone-6-voted-*`): lifted 10 px, a 3 px ring with a gap, a check badge; the face keeps `--text` on `--surface` (13.9:1 or better in the nine themes, both variants) |
| The hand leaves at the reveal | Done (`*-revealed-*`): no hand, no fade. The moderator's two buttons are still in the middle region: they move into the dock with group 2 |
| Card face: value large and centred, corner values, the second turned 180 degrees | Done, in the hand and on the seats once revealed |
| Card back: a diamond lattice of the accent and the surface, no text | Done (`*-voted-*`, a voted seat); it takes the accent of each theme |
| Empty slot: dashed edge, clock icon | Done (`phone-6-voted-*`, the two waiting seats) |
| Keyboard hint only on a fine pointer | Done: visible on `desktop`, `tablet` and `tv` (a mouse), hidden on `phone` (touch) |
| Custom deck of 15 to 24 cards: one row, snapping sideways, chosen card centred | Done (e2e with 20 cards; not in the screenshots, which use the Fibonacci deck) |

## Not yet (and where it comes)

- The seats keep the old seat cards (114 px) with the new playing card inside at 44x62; the compact seat grid and the 36x50 seat card are task 2.3. The seat still prints its state and, after the reveal, its value as a caption (defect D9): task 2.3.
- The page still opens with the share block, the language pair and the headings (defects D5, D6, D7, D23): tasks 2.1 and 2.2. So the page height at 390x844 is not yet the one-viewport figure; the measurement of that claim belongs to group 2.
- Tablet: the hand of 13 cards wraps as 11 + 2 at 768 px; rows balanced by the table layout come with task 4.2.
- Reveal flip is still 400 ms and the results are the old grid: group 3.
