# Proposal

## Why

Owner feedback (2026-11-08), three gaps in how groups (clusters) behave next to post-its:

1. "Group color change should have the same palette with advanced shades like post it." A note offers a quick row of 8 swatches and a full palette with 24 shades; a group only offers the 8 base swatches in its panel, although the domain already accepts the 24 colours for `group.recolor`.
2. "We should have a 3 dots menu event on group post it for quick actions. Like post it." A note has a three-dot menu (colour, action, freeze, pin, ungroup, group with, move, delete); a group has none: every action needs the group panel to be opened first.
3. "I should be able to click on group per columns not per board. Opened group per column." Today the whole board shares one open group (`openGroupId`): opening a group in column B closes the one in column A, which breaks side-by-side comparison of two columns during the discussion.

## What Changes

- **Same colour picker for groups.** The group menu and the group panel use the note swatch row and the same full palette dialog (base shades, then "more shades" for the 24 colours), reusing one component. The group colour shows on the stack as before; recolouring still recolours every non-frozen note (one `group.recolor` command).
- **Three-dot menu on the group stack** with the same look, placement and keyboard behaviour as the note menu: colour swatches and palette, rename, open, move to column, merge into, create an action, pin and freeze (facilitators), dissolve. The panel keeps its own controls; both read one shared list of group actions so they cannot drift.
- **One open group per column.** Each column opens its own group; several columns can show an open group at once and each panel stays inside its column. Opening another group in the same column replaces the previous one. Escape closes the focused panel only. On a phone, where a column fills the screen, the behaviour is the same per column; a note in the column nav shows which columns have an open group.
- Personal view state only: nothing is sent to the relay and no protocol or domain change.

Out of scope: a free colour picker (`postit-visual-system` rules stand: theme colours and their shades only); changing how groups are created or voted; a group menu for presenter mode (presenter keeps its spotlight).

Bounded contexts: Ideation (clusters), UI state (personal view). No relay traffic added: the free-plan budget is unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grouping`: one open group per column, group quick-actions menu.
- `notes`: the cluster colour uses the full note palette.

## Impact

- Web: `GroupCard.vue` (menu), `GroupPanel.vue` (palette, per-column state), `BoardColumn.vue`, `stores/ui.ts` (`openGroupIds` per column), `NoteMenu.vue` and `PaletteDialog.vue` (made generic over a note or a group), `useJumpToSource.ts`, `pages/boards.vue` (cleanup of vanished groups).
- Domain and protocol: none (`group.recolor` already accepts 0 to 23).
- i18n: a few keys (fr and en); guide chapter and manifest steps updated in the same pull request (user documentation rule).
