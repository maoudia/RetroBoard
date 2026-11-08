# Design

## Findings in the current product

- The writing-area row of a column has a size control and a columns icon (`ui.writeAll`, testid `area-all-<column>`): "makes the choice apply to every column". It is off by default and resets on reload.
- Each column has `expand-<column>` (fold and unfold icons), shown only when the column has groups; it acts on that column in the viewer's own view (`ui.expandedColumns`).
- Column width sizes (`narrow`, `normal`, `wide`, `full`) and widths are personal, per board and per screen class (`layout` store); every column starts at `normal`, so columns are already equal until someone resizes one.
- "Progress bar" appears in the specs as "the phase bar" (the stepper under the toolbar, `PhaseStepper`); the creation page has an agenda editor with an on/off switch for the agenda itself, but nothing for the bar.

## Interpretation of the owner's words

| Request | Chosen reading | Alternative (not chosen) |
|---|---|---|
| "Same size for every column enabled by default" | The all-columns link is ON by default, so picking a size in one column (writing area or width) applies to every column. | Force equal initial widths: already true (`normal` everywhere), so it would change nothing visible. |
| "Collapse groups or any column options but spread it to all columns, line writing array, a small button or the same button" | Reuse the same link: it covers the writing-area size, the column width and the group collapse. No new button in the writing row. The collapse button stays in the column header. | A second link dedicated to collapse; rejected because it doubles the controls the owner finds heavy. |
| "Disabled by default" (collapse feature) | The collapse button is hidden until "Group collapse buttons" is switched on in the profile (personal). The all-columns link default is ON independently. | Hide only the all-columns spread; rejected because it leaves the header button visible to people who do not want it. |
| "Progress bar on/off in the creation page, enabled by default" | A "Show the progress bar" switch on the creation page, board-wide, ON by default. | Tie it to the agenda switch (hide the bar when the agenda is off): kept as a consequence, not as the setting; the bar can be hidden while the agenda runs. |

## Where things live

| Piece | Layer | Notes |
|---|---|---|
| `settings.progressBar?: boolean` | domain (facilitation settings), protocol (`settings.update`), snapshot | Absent means on, so old boards and old peers keep showing it. Only facilitators set it (existing privilege of `settings.update`). |
| `linkColumns` (default true), `collapseButtons` (default false) | app personal settings (`stores/settings.ts`) | Remembered on the device, in the profile and, for the link, still toggled from the writing-area row. |
| Spread to all columns | app (`stores/ui.ts`) | `ui.writeAll` becomes `settings.linkColumns`; `setColumnSize` and `toggleExpanded` apply to every column of the board when the link is on. |
| Stepper visibility | app | `PhaseStepper` rendered when an agenda exists and `settings.progressBar !== false`. |

## Behaviour details

- **All-columns link.** Writing-area size: choosing S, M or L in one column sets all columns. Column width: choosing a size in one column sets all columns' sizes; dragging the grip stays per column (a free width is deliberate). Collapse: toggling in one column sets all columns that have groups. Turning the link off keeps what is on screen; later choices are per column.
- **Migration.** Existing personal layout (sizes, widths) is untouched. The new defaults apply to the link only; people who already used the link off keep it off because the stored `writeAll` was never persisted (it reset each load), so everyone starts linked once and can switch it off.
- **Collapse feature off by default.** With the switch off, `expand-<column>` is not rendered; groups behave as today (stacked unless the presenter shows them expanded). Switching it on shows the button in every column that has groups. Simple mode shows the switch with the other board display options; advanced mode adds nothing more.
- **Progress bar off.** The phase bar under the toolbar is hidden for everyone; the ring (and so start, pause and next) and the timer stay; the end-of-phase popup stays. The phase detail popover (segment click) goes with the bar; its content remains in the agenda panel.
- **Creation page.** Simple and advanced mode both show the switch under the agenda editor, ON; it is sent with the creation settings. The board options dialog shows the same switch for facilitators.
- **Phone and TV.** On a phone the bar takes one row; hiding it gives that row back to the board. On a TV the link behaves the same; widths are per screen class as today.

## Security and privacy

One boolean board setting travels in an existing, signed, end-to-end encrypted event; personal settings stay on the device. The relay observes nothing new.

## Risks

- Changing a default surprises people who sized columns one by one: the link is visible in the writing-area row with its pressed state, and the tooltip says what it spreads.
- The link now also spreads width and collapse: covered by e2e that switch it off and check the columns diverge.
