# Proposal

## Why

Live retro feedback (owner, 2026-11-02): the presentation mode needs a beautiful CSS animation in the accordion style.

## What Changes

- Accordion presenter: the focused column opens wide, the others fold to slim labelled spines; moving to the next column animates the fold and unfold (CSS only, transform and flex-grow, 60 fps).
- The focused note can be enlarged in place with a soft zoom; arrow keys and swipe move column by column.
- Reduced motion: instant switch, no animation.

Out of scope: Video export of the presentation.

Bounded contexts: none (presentation).

## Capabilities

### New Capabilities

- `presenter`

### Modified Capabilities

None.

## Impact

- Web: board page and its components; e2e on phone, desktop and TV.
