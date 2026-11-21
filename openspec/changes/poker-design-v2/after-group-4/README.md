# After group 4: larger screens

Screenshots of the room after tasks 4.1 to 4.3 of `tasks.md`, taken like `../before/` and the earlier `after-group-*` folders (English, theme Studio, the moderator "Malaka" at the screen size, five phone voters, the cards 8, 5, 5, 13, 5, `?`; `<screen>-<voters>-<before|voted|revealed>-<light|dark>`; `tablet` is 768x1024, `desktop` 1280x800, `tv` 2560x1440). `desktop-20-revealed-light` and `tablet-20-revealed-light` are rooms of twenty voters. The phone is unchanged since `../after-group-3/`.

## Against the wireframes

| Wireframe | After group 4 |
|---|---|
| Tablet 768x1024, voting (`tablet-6-voted-*`) | Matches: the oval, Malaka at the bottom centre with the crown and the ring, the others clockwise in join order, backs with a check and dashed slots with a clock, "Round 1 / 4 of 6 voted / Reveal" in the middle of the table, the one hint under the table, the hand in rows of 60x84 cards at the foot (11 and 2: the 13 cards wrap). Differences: the hand needs two rows at 768 px, as the wireframe allows; the status text is also in the bar, which the wireframe omits |
| Tablet, revealed (`tablet-6-revealed-*`) | Matches: faces on the oval, the highest-card icon on Cy, the results under the table in two columns (numbers, meter, outlier and "Use 5" at the left, the distribution at the right), Vote again filled and Next round quiet centred in the dock. Differences: the table is about 690 px high (it takes what is left) instead of shrinking to about 380 px |
| Laptop 1280x800, lobby (`desktop-1-before-*`) | Matches: the dashed Invite seat opposite, "Round 1 / Waiting for your team / Invite your team" (filled) in the table, the quiet panel at the right with the hint, the hand in 72x100 cards |
| Laptop, voting and waiting (`desktop-6-voted-*`) | Matches: Reveal filled in the table, the quiet panel at the right with the count and "Waiting for Dee and Eli." |
| Laptop, revealed (`desktop-6-revealed-*`) | Matches: the table at the left, the results at the right (about 340 px), the dock under both, centred, no page scroll |
| TV 2560x1440, revealed (`tv-6-revealed-*`) | Matches: the same layout with the table, seats, cards, numbers and results text at 1.5 times, the bar and the buttons at their size. The 340 px panel is 510 px here |
| Twenty voters (`desktop-20-revealed-light`, `tablet-20-revealed-light`) | Seats of 64 px on a tall oval that does not overlap; the middle region scrolls (the bottom seats are below the fold at 1280x800), the bar and the dock stay |

## Measured: the oval

For rooms of 3, 6, 8, 14 and 20 people with 24-character names, voting and revealed, at 768x1024, 1280x800, 1600x900 and 2560x1440: the boxes of the seats against each other and against the stage, the person at the bottom centre (the lowest seat, centred), whether the page scrolls and whether the hand and the dock are in the viewport. The script is a throwaway and is not in the repository; the e2e specs of `tests/e2e/poker.spec.ts` check the same claims at 768x1024 and 1280x800.

| Voters | State | Viewport | Seat (px) | Seat card width | Overlapping pairs | Seats outside the stage | Person at bottom centre | Page scrolls | Middle region scrolls by (px) | Hand and dock in the viewport |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | voting | 768x1024 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 3 | voting | 1280x800 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 3 | voting | 1600x900 | 108x131 | 54 | 0 | 0 | yes | no | no | in |
| 3 | voting | 2560x1440 | 144x172 | 72 | 0 | 0 | yes | no | no | in |
| 3 | revealed | 768x1024 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 3 | revealed | 1280x800 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 3 | revealed | 1600x900 | 108x131 | 54 | 0 | 0 | yes | no | no | in |
| 3 | revealed | 2560x1440 | 144x172 | 72 | 0 | 0 | yes | no | no | in |
| 6 | voting | 768x1024 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 6 | voting | 1280x800 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 6 | voting | 1600x900 | 108x131 | 54 | 0 | 0 | yes | no | no | in |
| 6 | voting | 2560x1440 | 144x172 | 72 | 0 | 0 | yes | no | no | in |
| 6 | revealed | 768x1024 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 6 | revealed | 1280x800 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 6 | revealed | 1600x900 | 108x131 | 54 | 0 | 0 | yes | no | no | in |
| 6 | revealed | 2560x1440 | 144x172 | 72 | 0 | 0 | yes | no | no | in |
| 8 | voting | 768x1024 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 8 | voting | 1280x800 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 8 | voting | 1600x900 | 108x131 | 54 | 0 | 0 | yes | no | no | in |
| 8 | voting | 2560x1440 | 144x172 | 72 | 0 | 0 | yes | no | no | in |
| 8 | revealed | 768x1024 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 8 | revealed | 1280x800 | 96x118 | 48 | 0 | 0 | yes | no | no | in |
| 8 | revealed | 1600x900 | 108x131 | 54 | 0 | 0 | yes | no | no | in |
| 8 | revealed | 2560x1440 | 144x172 | 72 | 0 | 0 | yes | no | no | in |
| 14 | voting | 768x1024 | 80x107 | 40 | 0 | 0 | yes | no | no | in |
| 14 | voting | 1280x800 | 80x107 | 40 | 0 | 0 | yes | no | 94 | in |
| 14 | voting | 1600x900 | 90x119 | 45 | 0 | 0 | yes | no | 90 | in |
| 14 | voting | 2560x1440 | 120x155 | 60 | 0 | 0 | yes | no | no | in |
| 14 | revealed | 768x1024 | 80x107 | 40 | 0 | 0 | yes | no | no | in |
| 14 | revealed | 1280x800 | 80x107 | 40 | 0 | 0 | yes | no | no | in |
| 14 | revealed | 1600x900 | 90x119 | 45 | 0 | 0 | yes | no | no | in |
| 14 | revealed | 2560x1440 | 120x155 | 60 | 0 | 0 | yes | no | no | in |
| 20 | voting | 768x1024 | 64x93 | 32 | 0 | 0 | yes | no | 93 | in |
| 20 | voting | 1280x800 | 64x93 | 32 | 0 | 0 | yes | no | 234 | in |
| 20 | voting | 1600x900 | 72x104 | 36 | 0 | 0 | yes | no | 247 | in |
| 20 | voting | 2560x1440 | 96x135 | 48 | 0 | 0 | yes | no | 44 | in |
| 20 | revealed | 768x1024 | 64x93 | 32 | 0 | 0 | yes | no | 132 | in |
| 20 | revealed | 1280x800 | 64x93 | 32 | 0 | 0 | yes | no | 133 | in |
| 20 | revealed | 1600x900 | 72x104 | 36 | 0 | 0 | yes | no | 133 | in |
| 20 | revealed | 2560x1440 | 96x135 | 48 | 0 | 0 | yes | no | no | in |

No pair of seats overlaps and none leaves the stage in any of the 40 rows; the page never scrolls; the hand and the dock are always inside the viewport. The middle region scrolls for 9 or more people on some screens (the stage keeps the minimum height its seat count needs, 480, 660 and 800 px, times the type scale), never for up to 8 on a tablet or a laptop.
