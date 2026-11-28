# Design

## Context

Facts read from the code (2026-11-08):

- Phases: `checkin`, `review` (shown as "Previous actions"), `write`, `group`, `vote`, `rank`, `actions`, `close` (`packages/domain/src/facilitation/agenda.ts`). `PHASE_COMMANDS.review` allows only action status changes; `write` allows `note.add`, `note.addMany`, edit, delete and colour.
- `board.availability('note.addMany')` drives the **gated** composer: greyed, dashed, with the reason, facilitators keep it open (`PrivateSection.vue`).
- `ActionsReviewDialog` opens once per board and browser tab when `carriedFrom !== null` actions exist; it sets `ui.reviewDone`, which `boards.vue` waits for before it opens the invite panel.
- `agenda.prev` clears the recorded time of the phases it leaves, so "the Write phase already ran" cannot be read from `actualMs`.
- `usePhaseEnd` already watches phase transitions and ignores state that was already there when the tab loaded: the new nudge reuses that rule.

## Decisions

1. **Detect the empty review from state, not from the transition alone.** `reviewState(snapshot)` returns `none` (no carried action), `open` (at least one open carried action), or `allDone`. The nudge shows when the running phase is `review` and the state is `none` or `allDone`. A tab that loads in the middle of the phase shows it too (it is a state, unlike the phase-end popup which is an event), and it disappears the moment the phase changes.
2. **Two surfaces, one action.** A card inside the board area (anchored above the columns, `role="status"`, polite) and, after 6 seconds without a response, a toast with the same button. Dismissing the card (Esc or the close icon) hides both for this phase run in this tab (`sessionStorage`, same key style as the review dialog). The action is `agenda.next` for people who may steer (`board.access.canSteer`); everyone else gets the same card without a button and the sentence "The facilitator will start writing". Never `agenda.next` on a timer: the owner asked to propose, and an automatic advance would surprise a facilitator who wants to talk first.
3. **The saved time is visible.** Skipping the empty phase early already gives the time back to the global budget (requirement "Global time follows the real time spent"); the card says so in one line when more than a minute is left ("You keep 4 minutes").
4. **Hidden writing areas are a view rule over the snapshot.** `writingHidden(snapshot)` is true when `hideWritingOnReturn` is on, phase rules are running, the current phase comes before the first `write` phase in the agenda, and the board holds at least one published note. "Holds a note" is the deterministic signal that writing already happened (every replica computes the same), and it keeps the first pass through Previous actions of a brand new retro exactly as today (greyed composers show where writing will happen). Phases after Write keep the greyed composer (the cue designed by `phase-availability-cues`).
5. **One banner, per person.** When hidden, `PrivateSection` renders a single compact row per column instead of the composer, and the board header shows the banner with the reason and the button "Show writing areas". The button sets a local, per-phase override (in memory); changing phase clears it. The writing commands are not enabled by it: under phase rules they stay refused for participants, so "show" only reveals the greyed composers with their reason. Facilitators, who bypass phase rules, can write when shown.
6. **Setting.** `settings.hideWritingOnReturn` (boolean, default `true`, absent means `true`), changed through `settings.update` by whoever steers, listed in the board's advanced options with a hint. Old peers ignore the field.
7. **Accessibility.** Hidden areas leave the tab order (`inert`) and the accessibility tree; focus that was inside a composer moves to the banner button; the change is announced once in the live region ("Writing areas hidden: back in Previous actions"). The card is not modal and never traps focus. Collapse and expand animate in 200 ms and not at all under reduced motion. Contrast follows the design system tokens; the card uses `--surface`, `--border`, one primary button.
8. **Layout.** Phone: the card sits under the stepper, full width, the button full width; TV: centred, max 40 rem, text `--fs-lg`. The toast uses the existing toast slot (`notifyPos`).

## Where things live

| Type | Layer | Notes |
|---|---|---|
| `hideWritingOnReturn` | domain (settings handler, snapshot) | optional boolean, default on |
| `reviewState`, `writingHidden` | application read models | pure, unit tested |
| `ReviewNudge.vue` | web component | card and toast variants |
| collapsed writing areas, banner | web (`PrivateSection`, `BoardColumn`) | view only |
| option row | web (`OptionsDialog`, advanced) | fr and en |

## Security and privacy note

Nothing new travels except one boolean in `settings.update`, sealed like every other event. The relay sees the same opaque envelopes and sizes. The nudge and the override live in the tab.

## Risks

- A facilitator who steps back to Check-in on purpose to rerun an icebreaker loses the composers: mitigated by the banner button and the board option.
- `hideWritingOnReturn` hides drafts the participant was typing: the drafts stay on the device (they are local) and come back with the areas; the banner says so.
