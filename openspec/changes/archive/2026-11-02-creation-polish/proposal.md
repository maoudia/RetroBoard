# Proposal

## Why

Owner feedback (2026-11-02): the "Create board" button sits on the left of the creation page; the primary action of a form belongs on the right, where the eye ends. The global clock's start and pause control, the progress bar of phases and the real time per phase already ship (change agenda-clock-v2); this change keeps them and only fixes the creation action.

## What Changes

- The "Create board" button is aligned to the right of the creation form (start of the line in right-to-left is not in scope).

Bounded contexts: presentation only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `BoardSetupForm` style.
