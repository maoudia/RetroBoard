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
| Radius | `--r-xs 6px, --r-sm 8px, --r-control, --r-card` | `--r-control` and `--r-card` are set by the theme. Pills use `999px`, avatars `50%`. |
| Space | `--sp-1 .25rem ... --sp-6 2rem` | Prefer these; gaps inside a component are multiples of `--sp-1`. |
| Motion | `--dur-fast .15s, --dur-base .25s, --dur-slow .4s` | Under 400 ms. Motion answers an action (open, confirm, move). Respect reduced motion. |
| Elevation | `--shadow-1` (resting), `--shadow-2` (floating: menus, popups) | Two levels only. |

Type roles: body `--fs-md`; secondary text and hints `--fs-sm` in `--muted`; badges and counters `--fs-xs`; dialog titles `--fs-lg` or `--fs-xl`; page titles `--fs-2xl`. Line length under 70 characters in running text.

## 3. Components and states

- **Button** (`.btn`): primary (filled, one per view), default, ghost (toolbar and dense rows), danger (text in `--danger`, confirmed in a dialog). Small (`.btn-sm`) inside bars and cards.
- **Icon button** (`.icon-btn`, `.mini-btn`): always has an `aria-label`; the label is visible in the main toolbar.
- **Menu / Dropdown**: opens in the top layer; items have an icon and a verb; a checked item uses `role="menuitemradio"` or `menuitemcheckbox`; the trigger shows the current value when it is a choice (sort, size).
- **Segmented control** (`.seg`): two to four exclusive options with a visible current one.
- **Dialog**: title says the action, body one or two sentences, footer has Cancel (ghost) then the confirming action named like the trigger.
- **Toast / popup**: one at a time, important ones stay until dismissed or 20 s, never below the columns. Position is a personal setting.
- **Badge**: counts only; unread and open counts use `--accent2`.
- Every interactive element has a visible focus ring (`:focus-visible`) and passes axe in light and dark.

## 4. Writing

- Sentence case. Plain verbs. No filler, no exclamation marks.
- **Icon at the left of every labelled button.** A `.btn` that shows a word starts with a Lucide icon; only numeric or status chips (`+1`, vote scores, status pills) and toggle segments go without. The shared vocabulary: cancel and close `x`, confirm and apply `check`, delete `trash`, erase and reset `eraser` or `rotate-ccw`, next `skip-forward` or `arrow-right`, back `arrow-left`, leave `log-out`, home `house`, save `save`, later `clock`, stop `square`. `ConfirmDialog` takes `confirm-icon` (default `check`, `trash` when dangerous). `apps/web/test/design-tokens.test.ts` enforces it.
- A button says what happens: "Group", "Publish", "Freeze". The same action keeps the same name everywhere (the button "Publish" produces the toast "Published").
- Errors say what happened and what to do, without apologising: "This note is frozen by the facilitator."
- Empty states invite an action ("Write the first idea").
- Every string has an `fr` and an `en` key. French is the source language.

## 5. Adding or changing UI: checklist

1. Use tokens from section 2; run `pnpm test` (the guard fails on off-scale sizes or radii).
2. One primary action; state in words; disabled with a reason.
3. Check 360 px and TV, light and dark, at least two themes.
4. Keyboard path and `aria-*` for any new control; add an axe check to the e2e.
5. If a rule here is wrong or missing, change this page in the same commit.

## 6. Status and next steps

The token layer and the guard exist. The component primitives (Button, Segmented, Menu as Vue components in `packages/ui`) and the choice of a base library are tracked in the `design-system-components` change (spike and ADR first). Marketing pages (`pages/index.vue`, `components/Landing*`) keep their own look and are exempt from the radius rule.
