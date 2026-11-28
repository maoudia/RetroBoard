# Before: Scrum Poker next to the rest of RetroBoard, as it is today

Screenshots of release 1.67.0 (commit `f45f547f`), taken on 2026-11-21 from the generated site served by `wrangler dev`, in English, by a throwaway Playwright script that is not part of the repository. They are the evidence for the observations in `proposal.md` and `design.md` ("What the owner sees today"); nothing here is a target.

| Name | What it shows | What it proves |
|---|---|---|
| `desktop-landing-light`, `phone-landing-light` | The landing page: "Start a retro" is the one filled action, "Scrum Poker" is a third, text-weight action beside "Try it solo", and a fourth entry sits in the header navigation | Poker is announced as a side feature with three separate entry points, and there is no choice between a retro and an estimation |
| `desktop-new-light` | `/new` in advanced mode: title, format, theme, passcode, team and project, carry-over; nothing about an estimation | The creation flow the retro has and poker lacks: no theme, no passcode, no team |
| `desktop-library-light` | `/boards`, the library, with no board link: a list of the person's boards and a "Scrum Poker" button in the page header | A poker room is never a row of this list (a `LibraryEntry` has no kind), so a finished or paused room cannot be found again |
| `phone-room-moderator-device-studio`, `phone-room-participant-device-noel` | The same room opened by two people at once on two phones. The moderator's device uses the Studio theme and the participant's device the Noel theme (their device default) | The room has no theme of its own: each person sees their own device's theme, so a team does not share one look, and the moderator cannot choose it. On a board the facilitator's theme is imposed on everybody and only light or dark is personal (ADR-0006) |

Read from the code and not shown:

- `apps/web/app/poker/client.ts` is a relay-only client (its own connect, retry, heartbeat, history, re-upload) and says so ("It does not use the mesh"); there is no replica, so a reload depends on what the relay still holds.
- The voter's own card and signing seed are kept in the tab's `sessionStorage` in clear (`retroboard:poker:card:<room>`, `retroboard:poker:key:<room>`), where `scrum-poker` `design.md` says "sealed local storage".
- `PokerMenu.vue` re-implements the language and the light-or-dark switch and reads the variant from `document.documentElement.dataset.variant`; `InviteSheet.vue` re-implements the link, QR and copy of `ShareDialog.vue` without the templates, the passcode or the short code; the name step and `retroboard:poker:name` re-implement the identity store; `CardDistribution.vue` and `ConsensusMeter.vue` re-implement `ChartBars.vue` and `ChartGauge.vue`.
