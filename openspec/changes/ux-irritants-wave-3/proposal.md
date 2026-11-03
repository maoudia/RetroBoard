# Proposal

## Why

Live retro feedback (owner, phone, 2026-11-03, third wave): the app is feature-rich but visually noisy. Text everywhere, a confusing second menu bar, inconsistent icon order, a buggy presentation accordion and a chronometer that runs forever. This wave is about calm, intuitive controls and the remaining irritants.

## What Changes

- Chronometer: it stops when the planned time of the whole retro is used up and says so; the phase clock never runs forever.
- Presentation accordion: columns are positioned correctly when moving backward; no clipped column on phones.
- Writing area: icon first. Visible text is cut to a minimum (placeholder only), labels stay for screen readers, one chevron opens and closes, the write icon goes, send and add are colour-coded icon buttons.
- Buttons in general: less text, the right icons, call-to-action colours per intent (publish, add, danger, neutral); text stays in the accessibility tree.
- Menus: one natural, documented order of toolbar icons for every screen size; the hide-menus chevron sits on the right on every device; the secondary bar (voting and publishing) is rebuilt as a compact, icon-led strip.
- Turn-by-turn writing: the facilitator can open the columns one after the other; the open column zooms like presentation focus and the others get a light mask and a disabled writing area.
- Dialog rows: setting rows with wide controls (language, theme variant) stack under their label on phones instead of squeezing the text.

Out of scope: new facilitation modes beyond the column turns.

Bounded contexts: Facilitation (clock, column turns), Ideation (writing area display).

## Capabilities

### New Capabilities

- `ux-calm`

### Modified Capabilities

None.

## Impact

- Domain clock (pure), web components (toolbar, vote bar, composer, column, presenter, dialogs), i18n fr and en, e2e on phone, desktop and TV, axe on each touched surface.
