# After group 2: the phone room in one viewport

Screenshots of the room after tasks 2.1 to 2.3 of `tasks.md`, taken like `../before/` and `../after-group-1/` (English, theme Studio, the moderator "Malaka" at the screen size, five phone voters, the cards 8, 5, 5, 13, 5, `?`; `<screen>-<voters>-<before|voted|revealed>-<light|dark>`).

## Against the wireframes

| Wireframe | After group 2 |
|---|---|
| Phone, lobby (`phone-1-before-*`) | Matches: bar with back, round, "Waiting for your team", Invite and menu; my seat (ring, crown) and the dashed Invite seat; the one hint "Share the link, then pick a card."; the filled "Invite your team" above the hand |
| Phone, voting and waiting (`phone-6-voted-*`) | Matches: four seats a row, a card back with a check for the voted, a dashed slot with a clock for the others, the one hint "Waiting for Dee and Eli.", the filled Reveal above the lifted, checked card of the hand. The seats are 85x107 px at 390 px and 78x107 at 360 (the wireframe says 83x96): the avatar row, the 4 px gaps and the padding cost 11 px, and the measured rows below still fit with room to spare |
| Phone, revealed (`phone-6-revealed-*`) | Dock and bar match (Vote again and Next round, 48 px, nothing else). The middle region still shows the old results grid: the new results, the outlier icons and "Use 5" are group 3. The cards show their value once, on the card |
| Tablet, laptop and TV | Not designed yet: the phone grid is used up to the TV (the oval table and the results beside it are group 4). The buttons of the dock are centred and 12 rem wide from 600 px |

## Measured: one viewport

`document.scrollHeight` against the viewport and the middle region's content against its visible height, for a room that grows from 1 to 8 voters with 24-character names (the longest the field takes), in English and French, at 390x844, 390x664 and 360x640, in the states lobby, voting, waiting, everyone voted and revealed. The script is a throwaway and is not in the repository; the e2e specs of `tests/e2e/poker.spec.ts` check the same claims (8 voters at 390x664 and 360x640, French at 360x640, 20 voters).

| Language | Voters | State | Viewport | Page height (of viewport) | Middle region (content / visible) |
|---|---|---|---|---|---|
| en | 1 | lobby | 390x844 | 844 (844) ok | 554 / 554 ok |
| en | 1 | lobby | 390x664 | 664 (664) ok | 374 / 374 ok |
| en | 1 | lobby | 360x640 | 640 (640) ok | 356 / 356 ok |
| en | 2 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 2 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 2 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 3 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 3 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 3 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 4 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 4 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 4 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 5 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 5 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 5 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 6 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 6 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 6 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 7 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 7 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 7 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 8 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| en | 8 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| en | 8 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| en | 8 | voting (2 voted) | 390x844 | 844 (844) ok | 554 / 554 ok |
| en | 8 | voting (2 voted) | 390x664 | 664 (664) ok | 374 / 374 ok |
| en | 8 | voting (2 voted) | 360x640 | 640 (640) ok | 356 / 356 ok |
| en | 8 | waiting (7 voted) | 390x844 | 844 (844) ok | 554 / 554 ok |
| en | 8 | waiting (7 voted) | 390x664 | 664 (664) ok | 374 / 374 ok |
| en | 8 | waiting (7 voted) | 360x640 | 640 (640) ok | 356 / 356 ok |
| en | 8 | everyone voted | 390x844 | 844 (844) ok | 554 / 554 ok |
| en | 8 | everyone voted | 390x664 | 664 (664) ok | 374 / 374 ok |
| en | 8 | everyone voted | 360x640 | 640 (640) ok | 356 / 356 ok |
| en | 8 | revealed | 390x844 | 844 (844) ok | 723 / 723 ok |
| en | 8 | revealed | 390x664 | 664 (664) ok | 543 / 543 ok |
| en | 8 | revealed | 360x640 | 640 (640) ok | 519 / 519 ok |
| fr | 1 | lobby | 390x844 | 844 (844) ok | 554 / 554 ok |
| fr | 1 | lobby | 390x664 | 664 (664) ok | 374 / 374 ok |
| fr | 1 | lobby | 360x640 | 640 (640) ok | 356 / 356 ok |
| fr | 2 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 2 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 2 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 3 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 3 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 3 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 4 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 4 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 4 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 5 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 5 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 5 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 6 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 6 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 6 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 7 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 7 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 7 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 8 | lobby | 390x844 | 844 (844) ok | 610 / 610 ok |
| fr | 8 | lobby | 390x664 | 664 (664) ok | 430 / 430 ok |
| fr | 8 | lobby | 360x640 | 640 (640) ok | 412 / 412 ok |
| fr | 8 | voting (2 voted) | 390x844 | 844 (844) ok | 554 / 554 ok |
| fr | 8 | voting (2 voted) | 390x664 | 664 (664) ok | 374 / 374 ok |
| fr | 8 | voting (2 voted) | 360x640 | 640 (640) ok | 356 / 356 ok |
| fr | 8 | waiting (7 voted) | 390x844 | 844 (844) ok | 554 / 554 ok |
| fr | 8 | waiting (7 voted) | 390x664 | 664 (664) ok | 374 / 374 ok |
| fr | 8 | waiting (7 voted) | 360x640 | 640 (640) ok | 356 / 356 ok |
| fr | 8 | everyone voted | 390x844 | 844 (844) ok | 554 / 554 ok |
| fr | 8 | everyone voted | 390x664 | 664 (664) ok | 374 / 374 ok |
| fr | 8 | everyone voted | 360x640 | 640 (640) ok | 356 / 356 ok |
| fr | 8 | revealed | 390x844 | 844 (844) ok | 723 / 723 ok |
| fr | 8 | revealed | 390x664 | 664 (664) ok | 543 / 543 ok |
| fr | 8 | revealed | 360x640 | 640 (640) ok | 519 / 519 ok |

Every row fits: the page never scrolls and the middle region never needs to. Twenty voters make the middle region scroll alone while the bar and the dock stay put (e2e). The revealed rows use the old results grid, which is what group 3 replaces: they will need to be measured again with the new results card.
