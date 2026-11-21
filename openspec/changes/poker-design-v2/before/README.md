# Before: the Scrum Poker pages as they are today

Screenshots of the pages of release 1.64.0 (commit `a43df19b`, `apps/web/app/pages/poker/` and `apps/web/app/components/poker/`), taken on 2026-11-21 from the generated site served by `pnpm dev:worker` (the Worker and the real relay), in English, theme Studio. They are the evidence behind the defect table in `design.md`; nothing here is a target.

## How they were taken

One room per screen size. The moderator ("Malaka") has the screen size; the five other voters are small phone contexts joined by the participant link. The deck is Fibonacci. The cards of the six voters are 8, 5, 5, 13, 5 and `?`. A browser script (Playwright, Chromium) drove it; it is a throwaway and is not part of the repository. Light and dark use the device setting `variant: system` and `emulateMedia`, because the poker pages have no light/dark control (defect D23).

| Name | What it shows |
|---|---|
| `<screen>-start-<light\|dark>` | the start page `/poker` |
| `<screen>-name-<light\|dark>` | the room link opened, before the name is given |
| `<screen>-1-before`, `-1-voted`, `-1-revealed` | a room of one voter: round open, card chosen, revealed (the owner's screenshot is the phone one) |
| `<screen>-6-before`, `-6-voted`, `-6-revealed` | six voters: nobody voted, four of six voted (the moderator has), all voted and revealed |
| `phone-*-full` | the whole scrolling page of that state at 390 px (light) |
| `phone-voter-6-revealed-*` | the same reveal seen by a voter who is not the moderator |
| `probe8-8-revealed-*` | eight voters with long names at 390 px |
| `phone-fr-*` | French, 390 px (light) |
| `phone-pseudo-start-light` | `/poker?lang=pseudo`: the pseudo-locale leaves the poker strings untouched (defect D30) |
| `owner-live-phone-revealed` | the owner's own screenshot of the live room (status and browser bars cropped) |

`<screen>` is `phone` (390x844, device pixel ratio 2, touch), `tablet` (768x1024), `desktop` (1280x800) or `tv` (2560x1440, `data-screen="tv"`). Every shot is taken at the top of the page; a room that does not fit is also kept whole in a `-full` file.

## Measurements

From the same sessions (`document.scrollHeight`, the position of the hand, the height of the buttons the moderator uses). A phone browser shows less than 844 px of page: the owner's screenshot shows about 670 px between the browser bars, so every phone figure below is worse on a real device.

| Shot | Viewport | Page height | Hand top (px) | Hand inside the viewport | Hand position | Card size | Buttons (height in px) |
|---|---|---|---|---|---|---|---|
| phone-1-before | 390x844 | 877 px (1.04 screens) | 660 | yes | sticky | 48x48 | Reveal 48 |
| phone-1-voted | 390x844 | 877 px (1.04 screens) | 660 | yes | sticky | 48x48 | Reveal 48 |
| phone-1-revealed | 390x844 | 1028 px (1.22 screens) | 885 | no | static | 48x48 | Vote again 48, Next round 48 |
| phone-6-before | 390x844 | 968 px (1.15 screens) | 660 | yes | sticky | 48x48 | Reveal 48 |
| phone-6-voted | 390x844 | 968 px (1.15 screens) | 660 | yes | sticky | 48x48 | Reveal 48 |
| phone-6-revealed | 390x844 | 1119 px (1.33 screens) | 976 | no | static | 48x48 | Vote again 48, Next round 48 |
| phone-voter-6-revealed | 390x844 | 1091 px (1.29 screens) | 948 | no | static | 48x48 |  |
| tablet-1-before | 768x1024 | 1024 px (1 screens) | 633 | yes | static | 60x56 | Reveal 37 |
| tablet-1-voted | 768x1024 | 1024 px (1 screens) | 633 | yes | static | 60x56 | Reveal 37 |
| tablet-1-revealed | 768x1024 | 1024 px (1 screens) | 850 | yes | static | 60x56 | Vote again 37, Next round 37 |
| tablet-6-before | 768x1024 | 1024 px (1 screens) | 764 | yes | static | 60x56 | Reveal 37 |
| tablet-6-voted | 768x1024 | 1024 px (1 screens) | 764 | yes | static | 60x56 | Reveal 37 |
| tablet-6-revealed | 768x1024 | 1094 px (1.07 screens) | 924 | no | static | 60x56 | Vote again 37, Next round 37 |
| desktop-1-before | 1280x800 | 831 px (1.04 screens) | 633 | yes | static | 60x56 | Reveal 37 |
| desktop-1-voted | 1280x800 | 831 px (1.04 screens) | 633 | yes | static | 60x56 | Reveal 37 |
| desktop-1-revealed | 1280x800 | 1020 px (1.27 screens) | 850 | no | static | 60x56 | Vote again 37, Next round 37 |
| desktop-6-before | 1280x800 | 963 px (1.2 screens) | 764 | no | static | 60x56 | Reveal 37 |
| desktop-6-voted | 1280x800 | 963 px (1.2 screens) | 764 | no | static | 60x56 | Reveal 37 |
| desktop-6-revealed | 1280x800 | 1094 px (1.37 screens) | 924 | no | static | 60x56 | Vote again 37, Next round 37 |
| tv-1-before | 2560x1440 | 1440 px (1 screens) | 633 | yes | static | 60x56 | Reveal 37 |
| tv-1-voted | 2560x1440 | 1440 px (1 screens) | 633 | yes | static | 60x56 | Reveal 37 |
| tv-1-revealed | 2560x1440 | 1440 px (1 screens) | 850 | yes | static | 60x56 | Vote again 37, Next round 37 |
| tv-6-before | 2560x1440 | 1440 px (1 screens) | 764 | yes | static | 60x56 | Reveal 37 |
| tv-6-voted | 2560x1440 | 1440 px (1 screens) | 764 | yes | static | 60x56 | Reveal 37 |
| tv-6-revealed | 2560x1440 | 1440 px (1 screens) | 924 | yes | static | 60x56 | Vote again 37, Next round 37 |
| probe8-8-revealed | 390x844 | 1303 px (1.54 screens) | 1160 | no | static | 48x48 | Vote again 48, Next round 48 |
