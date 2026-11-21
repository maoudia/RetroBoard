# After group 3: reveal and results

Screenshots of the room after tasks 3.1 to 3.4 of `tasks.md`, taken like `../before/`, `../after-group-1/` and `../after-group-2/` (English, theme Studio, the moderator "Malaka" at the screen size, five phone voters, the cards 8, 5, 5, 13, 5, `?`; `<screen>-<voters>-<before|voted|revealed>-<light|dark>`; `phone` is 390x844, `phone664` 390x664, `phone360` 360x640, `tablet` 768x1024, `desktop` 1280x800, `tv` 2560x1440; the two small phones only have the revealed state of six voters).

## Against the wireframes

| Wireframe | After group 3 |
|---|---|
| Phone, revealed (`phone-6-revealed-*`, `phone664-6-revealed-*`) | Matches: the face-up cards with the value once, the highest-card icon on Cy, the two large numbers (Average 7.2, Median 5), "Some agreement" with the bar and 50%, the distribution (3 / 1 / 1 / 1 over the small faces 5, 8, 13, ?), "Highest: 13 (Cy)" with its icon, a quiet "Use 5", and in the dock Vote again (filled, the room disagrees) on the left and Next round (quiet) on the right. Differences: the bars are at most 24 px high on a phone shorter than 760 px (40 px on a taller one) instead of 40 px, and the results card has 8 px paddings, to keep eight voters with both outlier lines inside 360x640 (design K7 amended); the seat is 97 px high (the wireframe says 96) |
| Phone, revealed, one voter (`phone-1-revealed-*`) | Everyone agrees at 100%, one column, Next round filled, Vote again quiet |
| Phone, between rounds | Seats back to empty slots, results and estimate gone, the hand back with a 150 ms rise (e2e); not a picture, it is motion |
| Tablet, laptop, TV revealed (`tablet-*`, `desktop-*`, `tv-*`) | Not designed yet: they use the phone layout in a centred 44 rem column (the oval table and the results beside it are group 4). The results card itself is the final one |

## Measured: one viewport, revealed

`document.scrollHeight` against the viewport, the middle region's content against its visible height, the two dock buttons inside the viewport and the free space under the results card, for rooms of 1, 4, 6 and 8 voters with 24-character names, in English and French, at 390x844, 390x664 and 360x640. "typical" is 8, 5, 5, 13, 5, ?, 5, 8; "worst" is one 3, one 13 and the rest 5, so both outlier lines show (with a name of 24 characters in each). The script is a throwaway and is not in the repository; the e2e specs of `tests/e2e/poker.spec.ts` check the same claims at 390x664 and 360x640.

| Language | Voters | Cards | Viewport | Page | Middle region | Buttons in the dock | Slack under the results (px) |
|---|---|---|---|---|---|---|---|
| en | 1 | typical | 390x844 | ok | ok | ok | 354 |
| en | 1 | typical | 390x664 | ok | ok | ok | 190 |
| en | 1 | typical | 360x640 | ok | ok | ok | 166 |
| en | 4 | typical | 390x844 | ok | ok | ok | 325 |
| en | 4 | typical | 390x664 | ok | ok | ok | 161 |
| en | 4 | typical | 360x640 | ok | ok | ok | 138 |
| en | 4 | worst | 390x844 | ok | ok | ok | 354 |
| en | 4 | worst | 390x664 | ok | ok | ok | 190 |
| en | 4 | worst | 360x640 | ok | ok | ok | 166 |
| en | 6 | typical | 390x844 | ok | ok | ok | 220 |
| en | 6 | typical | 390x664 | ok | ok | ok | 56 |
| en | 6 | typical | 360x640 | ok | ok | ok | 32 |
| en | 6 | worst | 390x844 | ok | ok | ok | 248 |
| en | 6 | worst | 390x664 | ok | ok | ok | 84 |
| en | 6 | worst | 360x640 | ok | ok | ok | 61 |
| en | 8 | typical | 390x844 | ok | ok | ok | 220 |
| en | 8 | typical | 390x664 | ok | ok | ok | 56 |
| en | 8 | typical | 360x640 | ok | ok | ok | 32 |
| en | 8 | worst | 390x844 | ok | ok | ok | 198 |
| en | 8 | worst | 390x664 | ok | ok | ok | 34 |
| en | 8 | worst | 360x640 | ok | ok | ok | 10 |
| fr | 1 | typical | 390x844 | ok | ok | ok | 354 |
| fr | 1 | typical | 390x664 | ok | ok | ok | 190 |
| fr | 1 | typical | 360x640 | ok | ok | ok | 166 |
| fr | 4 | typical | 390x844 | ok | ok | ok | 325 |
| fr | 4 | typical | 390x664 | ok | ok | ok | 161 |
| fr | 4 | typical | 360x640 | ok | ok | ok | 138 |
| fr | 4 | worst | 390x844 | ok | ok | ok | 354 |
| fr | 4 | worst | 390x664 | ok | ok | ok | 190 |
| fr | 4 | worst | 360x640 | ok | ok | ok | 166 |
| fr | 6 | typical | 390x844 | ok | ok | ok | 220 |
| fr | 6 | typical | 390x664 | ok | ok | ok | 56 |
| fr | 6 | typical | 360x640 | ok | ok | ok | 32 |
| fr | 6 | worst | 390x844 | ok | ok | ok | 248 |
| fr | 6 | worst | 390x664 | ok | ok | ok | 84 |
| fr | 6 | worst | 360x640 | ok | ok | ok | 61 |
| fr | 8 | typical | 390x844 | ok | ok | ok | 220 |
| fr | 8 | typical | 390x664 | ok | ok | ok | 56 |
| fr | 8 | typical | 360x640 | ok | ok | ok | 32 |
| fr | 8 | worst | 390x844 | ok | ok | ok | 198 |
| fr | 8 | worst | 390x664 | ok | ok | ok | 34 |
| fr | 8 | worst | 360x640 | ok | ok | ok | 10 |

Every row fits: the page never scrolls, the middle region never needs to, and both buttons are inside the viewport. The tightest is 10 px of slack (eight voters, both outliers, 360x640).
