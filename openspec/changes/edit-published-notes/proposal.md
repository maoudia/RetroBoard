# Proposal

## Why

Live retro feedback (owner, 2026-11-02): the author of a published post-it, and the facilitator, must be able to change its text after it is published.

## What Changes

- The author of a published note can edit its text; the facilitator (and co-facilitators) can edit any note. Edits are signed events; every participant sees the new text and an "edited" mark.
- Locked board or closed phase: only facilitators may edit.
- Votes stay on the edited note.

Out of scope: Edit history view.

Bounded contexts: Ideation (note.edit event), Access (privileges).

## Capabilities

### New Capabilities

- `notes`

### Modified Capabilities

None.

## Impact

- Web: board page and its components; e2e on phone, desktop and TV.
