# Proposal

## Why

Publishing is not intuitive: drafts live in a "Private" box at the bottom of each column, and people forget to publish. The owner asked to rethink the publishing UI.

## What Changes

- One composer per column at the top, clearly labelled "Only you see this until you publish".
- Draft cards look like notes held in hand (tilted, with a "draft" ribbon), stacked in a personal tray.
- Publish one, publish column, publish all; a visible draft counter in the toolbar; undo for 10 seconds.
- Keyboard: Enter saves a draft, Cmd/Ctrl+Enter publishes, Esc cancels.
- Mobile: bottom-sheet composer with column chips.
- Optional auto-publish at the end of the Write phase (from `timeboxed-agenda`).
- Reminder when leaving the page with unpublished drafts.

Out of scope: rich text, images.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`: adds composer, undo, keyboard and leave-guard requirements.

## Impact

- Web components; application use cases `WriteDraft`, `PublishDrafts`, `UndoPublish`.
