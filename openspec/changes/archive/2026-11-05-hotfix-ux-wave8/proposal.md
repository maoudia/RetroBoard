# Proposal

## Why

Owner screenshots of 2026-11-05 (14 findings, desktop and phone) show regressions and rough edges on a live board: the person alone on a board is listed as "Anonymous", a grouped stack previews only five of eleven notes, the note footer and the group badges overflow their card, several controls have no or wrong CSS (clone menu, action form inputs, time choice, column size choice), the creation page moves its Simple/Advanced switch, the footer links to wrong social profiles, the "Agenda finished" line wastes a row, the progress bar does not say it can be clicked, and the floating chat bubble hides the add-idea button.

This is one hotfix: no new feature, no new dependency, no protocol change.

## What Changes

- Participants menu: my own row shows my name even when I stay anonymous for the others (with a note saying so); "Direct: 0 person(s)" is never shown, the idle text is.
- Stack preview (hover) lists up to eight notes, then "+N more", positioned from its real height.
- Note footer wraps (author, badges, vote, menu) and the group card badge row wraps: nothing leaves the card, with or without Pinned / Frozen.
- Time choice of the format suggestions keeps its natural height (a short fieldset next to a tall one no longer stretches its buttons).
- The Simple / Advanced switch keeps the same place in both modes; its hint is always present.
- Footer follow links use the profiles listed on https://www.maoudia.com/ (GitHub, LinkedIn, X, DEV.to).
- Board menu: "Clone this board" and "Clone only the open actions" get the menu item look (button reset).
- Action form: owner and date fields share one height and stay inside the dialog on a phone.
- Phase stepper becomes one row: phase and time in front of the bar, the bar, then an info button listing every step. Finished agenda shows a check mark. Segments grow on hover and focus.
- One shared `SizePicker` component for the writing area and the column width, equal cells, compact popover.
- The minimised chat bubble can be dragged anywhere (position kept on the device) and closed with its own X.

Out of scope: new themes, new phases, any change to the agenda or voting rules.

Bounded contexts: presence, ideation (view only), facilitation (stepper view), board layout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-irritants`

## Impact

Vue components (ParticipantsMenu, GroupCard, NoteCard, TemplatePicker, ModeSwitch page, AppToolbar, ActionsDrawer, PhaseStepper, SizePicker, BoardColumn, PrivateSection, ChatPanel), `utils/feedback.ts`, i18n keys (fr and en), e2e `hotfix-ux-wave8.spec.ts`. No relay, protocol or storage change.
