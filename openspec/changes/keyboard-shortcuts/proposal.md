# Proposal

## Why

On a computer, power users and facilitators want to work without the mouse: write, publish, vote, move between columns, run the timer and the agenda.

## What Changes

- A shortcut map, shown with `?` in a help overlay (fr/en, platform-aware Ctrl/Cmd):
  - `n` new idea in the focused column, `1`..`8` focus a column, arrows move between notes, `Enter` edit, `Esc` close or cancel
  - `p` publish my drafts, `/` filter, `v` vote on the focused note (Shift+v removes a vote), `c` colour palette
  - facilitator: `Space` start or pause the timer or phase, `]` next phase, `[` previous phase, `r` ranking, `t` give the floor to the focused participant
  - `Shift+p` presenter mode, `s` share, `e` export
- Shortcuts are disabled while typing and inside dialogs, never override browser or screen-reader shortcuts, and can be turned off in the profile.

Out of scope: customisable bindings.

Bounded contexts: none (UI). No relay traffic beyond the actions themselves.

## Capabilities

### New Capabilities

- `keyboard`: shortcuts and help overlay.

### Modified Capabilities

None.

## Impact

- Web: a `useShortcuts` composable with a declarative map, roving focus on notes and columns, help overlay.
