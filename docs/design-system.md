# RetroBoard design system

One page of rules so every screen feels like the same product. Themes change the mood (colour, fonts, radius, motion); they never change the rules below. Read it before any UI work. The test `apps/web/test/design-tokens.test.ts` enforces the token rules.

## 1. Principles

1. **Calm first.** The board is a workspace, not a poster. Spend the visual energy in one place per screen (the note being written, the phase in progress, the result of a vote) and keep everything around it quiet.
2. **Structure carries meaning.** Borders, badges, dividers and numbers appear only when they encode something (a state, a count, a sequence). No decoration, no numbered markers unless the content is a sequence.
3. **Say state in words.** A control shows what is true now ("Voting is closed"), not only an icon or a colour. Unavailable actions are disabled with a reason, or hidden when the person can never use them.
4. **One screen, one primary action.** A single filled button per view or dialog. Everything else is secondary or ghost.
5. **Phone first.** Design at 360 px, then widen. TV and presenter mode scale the content, not the chrome.
6. **Themes are skins.** A theme is a token set. No component CSS lives in a theme file.

## 2. Tokens (source of truth: `apps/web/app/assets/css/base.css` and `packages/themes`)

| Group | Tokens | Rule |
|---|---|---|
| Colour | `--bg --surface --surface2 --border --text --muted --accent --accent-ink --accent2 --danger --success --note-*` | Never hard-code a hex in a component. Text on `--accent` uses `--accent-ink`. |
| Type | `--fs-xs .75rem, --fs-sm .875rem, --fs-md 1rem, --fs-lg 1.125rem, --fs-xl 1.25rem, --fs-2xl 1.5rem, --fs-3xl 2rem` | Only these sizes, plus `clamp()` for marketing headlines. `--f-display`, `--f-body`, `--f-mono` come from the theme. |
| Fluid type | `--fluid-xs` to `--fluid-3xl`, `--type-scale` | Same steps as `--fs-*`, growing with the viewport from 360 to 1600 px and multiplied by `--type-scale` (1 up to laptop, 1.125 wide, 1.5 tv). Written on `<html>` by `applyScreen`, next to `data-screen`. Use for text that must follow the screen; `--fs-*` stays the default. |
| Screens | `data-screen` = `phone` (360), `tablet` (600), `laptop` (1024), `wide` (1600), `tv` (2400), `--bp-*` | Source: `packages/themes/src/screens.ts`. CSS cannot read a custom property in a media query: write the pixel value and select with `[data-screen="tv"]` where a rule depends on the class. |
| Radius | `--r-xs 6px, --r-sm 8px, --r-control, --r-card` | `--r-control` and `--r-card` are set by the theme. Pills use `999px`, avatars `50%`. |
| Space | `--sp-1 .25rem ... --sp-6 2rem` | Prefer these; gaps inside a component are multiples of `--sp-1`. |
| Motion | `--dur-fast .15s, --dur-base .25s, --dur-slow .4s` | Under 400 ms. Motion answers an action (open, confirm, move). Respect reduced motion. |
| Elevation | `--shadow-1` (resting), `--shadow-2` (floating: menus, popups) | Two levels only. |

Type roles: body `--fs-md`; secondary text and hints `--fs-sm` in `--muted`; badges and counters `--fs-xs`; dialog titles `--fs-lg` or `--fs-xl`; page titles `--fs-2xl`. Line length under 70 characters in running text.

## 3. Components and states

- **Button** (`.btn`): primary (filled, one per view), default, ghost (toolbar and dense rows), danger (text in `--danger`, confirmed in a dialog). Small (`.btn-sm`) inside bars and cards.
- **Icon button** (`.icon-btn`, `.mini-btn`): always has an `aria-label`; the label is visible in the main toolbar. `.mini-btn` is a fixed square for an icon only: a button with a visible label is `.btn .btn-sm` (`design-tokens.test.ts` fails otherwise).
- **Menu / Dropdown**: opens in the top layer; items have an icon and a verb; a checked item uses `role="menuitemradio"` or `menuitemcheckbox`; the trigger shows the current value when it is a choice (sort, size).
- **List panels** (History, Activity, Participants): one width (`--panel-w`, passed to `Dropdown` with `fixed`), one inner padding (`--panel-pad`), one row gap (`--row-gap`), one empty state (`.panel-empty`), one clock (`formatClock`, tabular digits) and one trigger pattern (`aria-haspopup="dialog"`, a `role="region"` with the panel name). A row is `.panel-row`: leading `.meta`, wrapping `.body`, optional trailing `.act` that never wraps (a 40 px `.btn .btn-sm` pill with icon, short visible label, full accessible name).
- **Fitting the screen**: `Dropdown` places itself in the visual viewport (below the trigger, else above, else the larger side), subtracts any fixed bar marked `data-reserve-bottom` (presenter bar, turn bar), scrolls in one container with a bottom fade, takes `tabindex` when it overflows, and closes only on a width change (a keyboard or browser-bar height change re-places it).
- **Phone** (`data-screen="phone"`): `Dropdown` is a bottom sheet (full width, pinned to the bottom edge, or resting on the presenter bar or the turn bar when one is shown, 48 px rows, dimmed backdrop that closes it). The columns are a tab bar at the foot of the board (one tab per column, 56 px high). The primary action of a page is full width and at least 48 px high under 480 px, in the thumb zone: fixed at the bottom on the landing, sticky at the bottom of the setup form, 48 px for the composer's add and publish. The composer itself is a bottom sheet opened by one write button above the tab bar: a chip per column chooses the target (48 px high), the column keeps only the drafts tray. Elsewhere the composer is the last block of each column, at its foot under the notes that scroll above it (it stays in view without `position: sticky`, the column being as tall as the board), and the drafts stack above its field as tilted notes with a "draft" ribbon; a skip link, visible on focus, is the first stop after the column title (change writing-zone-at-column-bottom).
- **Toolbar fit**: the toolbar turns icon-only (`data-compact`) when its labels do not fit; the label stays as the accessible name and the tooltip. Never hide a label with `display: none`.
- **Segmented control** (`.seg`): two to four exclusive options with a visible current one.
- **Dialog**: title says the action, body one or two sentences, footer has Cancel (ghost) then the confirming action named like the trigger.
- **Toast / popup**: one at a time, important ones stay until dismissed or 20 s, never below the columns. Position is a personal setting.
- **Badge**: counts only; unread and open counts use `--accent2`.
- **Menu order** (most to least important, same style everywhere): main toolbar = invite (share), participants, actions, filter, presenter, export, activity, options, light/dark, profile. Export hub = retro report, files (md, csv, json), destinations (advanced), board file, destroy last. Voting bar = state, results, facilitator menu, then the primary publish button last.
- Every interactive element has a visible focus ring (`:focus-visible`) and passes axe in light and dark.

## 4. Writing

- Sentence case. Plain verbs. No filler, no exclamation marks.
- **Icon at the left of every labelled button.** A `.btn` that shows a word starts with a Lucide icon; only numeric or status chips (`+1`, vote scores, status pills) and toggle segments go without. The shared vocabulary: cancel and close `x`, confirm and apply `check`, delete `trash`, erase and reset `eraser` or `rotate-ccw`, next `skip-forward` or `arrow-right`, back `arrow-left`, leave `log-out`, home `house`, save `save`, later `clock`, stop `square`. `ConfirmDialog` takes `confirm-icon` (default `check`, `trash` when dangerous). `apps/web/test/design-tokens.test.ts` enforces it.
- A button says what happens: "Group", "Publish", "Freeze". The same action keeps the same name everywhere (the button "Publish" produces the toast "Published").
- Errors say what happened and what to do, without apologising: "This note is frozen by the facilitator."
- Empty states invite an action ("Write the first idea").
- Every string has an `fr` and an `en` key. French is the source language.

## 4b. Calm controls and menu order (change ux-irritants-wave-3)

- Icon first: buttons show an icon and keep their text for assistive tech (`.sr-only`); visible text stays for the few actions that need a word (the active half of a switch, dialog confirmations). Colour carries intent: accent filled for the main action, accent outline for the secondary one, danger colour for destructive ones, neutral for the rest.
- One chevron opens and closes a foldable area (writing area, menus); the hide-menus chevron is the last item at the right on every screen size.
- Toolbar order, the same on every size: invite, people, actions, chat, find, writing area, presentation, export, notifications, settings, theme, profile.
- Setting rows with wide controls stack under their label under 600 px.
- Time is shown as m:ss, then `1h05`, then `2d`; the phase clock stops when the planned time of the whole retro is used up.

## 4c. Notifications (change toast-notifications-v2)

- Toasts are floating cards docked under the header, never over a writing area or the board; fixed position, no layout shift. At most 3, newest last.
- They wrap their text, stay inside the viewport minus 1rem gutters and safe areas, carry a tone icon and accent (ok, info, warn), and offer a 44 px action and a close button.
- A thin line shows the time left; hover or focus pauses it; reduced motion removes the slide. Warnings use role alert, the others role status.

## 5. Adding or changing UI: checklist

1. Use tokens from section 2; run `pnpm test` (the guard fails on off-scale sizes or radii).
2. One primary action; state in words; disabled with a reason.
3. Check 360 px and TV, light and dark, at least two themes.
4. Keyboard path and `aria-*` for any new control; add an axe check to the e2e.
5. If a rule here is wrong or missing, change this page in the same commit.

## 6. Status and next steps

The token layer and the guard exist. The component primitives (Button, Segmented, Menu as Vue components in `packages/ui`) and the choice of a base library are tracked in the `design-system-components` change (spike and ADR first). Marketing pages (`pages/index.vue`, `components/Landing*`) keep their own look and are exempt from the radius rule.

## Switches, state icons and in-place controls (feedback-wave-4)

- **One on/off control.** Every setting that is on or off uses `ToggleSwitch` (label, optional hint and icon, `role="switch"`); `plain` inside a settings list, the padded form inside menus. No other checkbox-as-switch, no on/off written in the label ("Secret voting: off" becomes a switch labelled "Secret votes"). `data-testid` lands on the input.
- **State as an icon with its explanation on demand.** The encryption state is a shield (`shield-check` passcode, `shield` link only, `shield-off` not encrypted) with a tooltip on hover and focus and a popover on tap; never a sentence in a menu.
- **Say a fact once.** A state shown by a chip (voting open or closed) is not repeated as text; the text stays for assistive technology only (`.sr-only`).
- **Size where it is used.** The writing size is set on the writing area itself (S M L, a link to apply it to every column, a grip to drag the height, double-click to reset); the toolbar Write button only shows or hides.
- **Segmented choices use `.pick-seg`**, including the Simple / Advanced switch.
- **Participants wear their own colour.** Peers show the avatar colour they chose, broadcast with their presence (`Peer.hue`); the name-derived colour is only the fallback before it arrives.

## Scrum Poker: the table and the cards (change poker-design-v2)

The rules of the Scrum Poker room in one page (the reasoning, the wireframes and the measures are in `openspec/changes/poker-design-v2/design.md`, K1 to K12). The code is in `apps/web/app/components/poker/` and `apps/web/app/pages/poker/`; no theme file is involved, the poker interface is component CSS on the tokens above.

- **One viewport on a phone (K1).** Under 600 px the room is a bar, a middle region and a dock over `100dvh`. The page never scrolls; the middle region is the only thing that may, and only for more than 8 voters (390x664 and 360x640 are the sizes that are checked). No visible heading names a region; assistive technology does.
- **The dock is the thumb zone (K2).** The hand while voting, the moderator's two buttons or a voter's one hint after the reveal. It is fixed at the bottom above the safe-area inset and in the same place in every state. The hand leaves at the reveal; it is never dimmed.
- **Seats and the table (K3).** A seat is a card slot (a back when the person voted, an empty slot when not, the face after the reveal), an avatar on the person's hue with a ring for "you", the name on one line and two icons (role, state), each with a hidden word. A phone shows a grid of `minmax(76px, 1fr)`; from 600 px the seats sit on an ellipse by CSS trigonometry, the person at the bottom centre and the others clockwise in join order, the DOM order never changing. A value is never in the DOM before the reveal.
- **Cards (K4).** One `PokerCard` draws every card: ratio 5:7, radius `--r-card` scaled with the card (never a pill), the value centred with corner values, the back a lattice of `--accent` and the surface (or of the hue the moderator picked, `--poker-back`), the empty slot dashed with a clock, the chosen card lifted, ringed and checked. State is a shape and an icon, never a colour alone. The edge is `--muted` (3:1 or better, measured on the nine themes by `tests/e2e/poker-themes.spec.ts`).
- **Short copy, one status line (K6).** The bar says the round and one status line ("3 of 6 voted"); at most one muted hint follows (two lines at most). "Connected" is never said. The bar is the bar of the application (`AppBar`: the mark that leads home, Invite first of the tools as Share is on a board, light or dark and the avatar); the profile dialog behind the avatar holds the language, the theme, the settings, the guide and the feedback links, so the room has no menu of its own.
- **Results (K7).** Two large numbers (average and median), a meter with its words (Everyone agrees, Strong agreement, Some agreement, No agreement yet), a distribution as a list, the outliers as a line and an icon on the seat, and the suggested card as an action for the moderator ("Use 5") or as text for a voter.
- **Larger screens and the TV (K8).** The table, seats, avatars, cards, numbers and results text grow with `--type-scale` (1.125 wide, 1.5 TV); the bar, the menus and the sheets keep their size and their 44 px targets. A person who only watches has a larger table and no dock.
- **One primary action per state (K9).** One filled button per view and role; Reveal appears with the first vote; after the reveal Next round is filled when the room agrees and Vote again when it does not; no glow, the filled button has the quiet `--shadow-1` of a card.
- **The steps before the room (K10).** The start page and the name step share `PokerStep`: a bar, one 36 rem column and one filled button, fixed at the foot of a phone (48 px) and in the flow from 600 px (56 px). The deck chips fill the round chips and Custom is where a deck of one's own is set; "Card colours" is a collapsed radio group of the theme and eight hues with a live card back.
- **Tokens and accessibility (K11).** Sizes of text from `--fs-*` and `--fluid-*`, radii from `--r-*`, space from `--sp-*`, no hex colour: `apps/web/test/poker-tokens.test.ts` audits the poker files with no baseline. Targets are 44 px, every control shows a focus ring, the hand is a radio group with arrow keys and typed card names, forced colours keep the edges and the chosen card, and axe and the contrast spec run on the start page, the name step and the room in lobby, voting, waiting and revealed, in the nine themes and both variants.
- **Language and overflow (K12).** Every string has fr and en keys in `apps/web/app/poker/strings.ts` (a test fails on a key nobody uses); `pt()` goes through `pseudolocalize` under `?lang=pseudo`; `tests/e2e/poker-overflow.spec.ts` plays a room of eight with 24-character names at 360, 390, 768 and 1440 px in fr, en and pseudo and fails on anything that leaves the screen, a label on two lines or a hint on three.
