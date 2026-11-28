# After group 5: start page and name step

Screenshots of the start page, the name step and a room with a picked hue after tasks 5.1 to 5.3 of `tasks.md`, taken like `../before/` (English, the moderator "Malaka"; `phone` is 390x844, `tablet` 768x1024, `desktop` 1280x800, `tv` 2560x1440; light and dark). Names: `<screen>-start-<light|dark>` (the page as it opens), `<screen>-start-custom-colours-<light|dark>` (Custom chosen, "Card colours" open, the green hue picked), `<screen>-name-<light|dark>` (the name step, nothing typed so the button is quiet), `<screen>-room-green-<light|dark>` (the room of that moderator after one vote: the card back of the seat is green), `phone-start-fr-light` (French). The room itself is unchanged since `../after-group-4/`.

## Against the wireframes (K10)

| Wireframe | After group 5 |
|---|---|
| Phone start (`phone-start-*`, `before/phone-start-*`) | Matches: the bar with "RetroBoard" and the language as the pill of the landing page, the headline with the Beta tag once, one lead line, the deck chips (Fibonacci chosen), the deck as round chips, "Card colours" collapsed, one muted line, "Create the room" fixed at the foot (48 px). Gone: the "Deck of cards" legend, the long typed field, the "Team colours" placeholder, the two muted paragraphs and the "Suggest an idea" link (it is in the room's overflow menu) |
| Phone start with Custom and the colours (`phone-start-custom-colours-*`) | The typed list appears only for Custom, starting as the current deck; "Card colours" shows nine round swatches (the theme, then the eight hues of the avatar picker) as a radio group, the name of the choice under them and a live card back beside them |
| Laptop start (`desktop-start-*`) | Matches: the same content in a 36 rem column, centred, "Create the room" in the flow under the colours section (56 px) |
| Name step (`phone-name-*`, `tablet-name-*`) | Matches: the bar with the way back, "Scrum Poker" and the overflow menu, the question as the headline, one field, "Only a name. No account.", "Join the room" fixed at the foot (48 px), no table behind it. The field is prefilled with the name of this browser when it has one |
| TV start (`tv-start-*`) | The start page is the 36 rem column at its own size: the type scale applies to the room's content (K8), not to the steps before it |

## Measured

Overflow (document wider than the window, and boxes outside it) on the start page and the name step with a 24-character name, in French and English, at 360, 390, 768, 1280, 1440 and 2560 px, light and dark: none. The e2e specs of `tests/e2e/poker.spec.ts` check the button (at least 48 px, at the foot of 844 and of 560 px, in the flow at 1280 px), the swatches (44 px, arrow keys), the name step and axe in light and dark (WebKit, the phone project and Chromium).
