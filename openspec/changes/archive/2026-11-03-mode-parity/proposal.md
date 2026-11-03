# Proposal

## Why

Owner feedback (2026-11-02): the board set-up page (shown to the facilitator after creation) has no simple and advanced switch, and its invite step has no advanced mode either. Theme selection must stay in simple mode because themes are a key differentiator. In advanced mode every column must be listed with its vote setting, not a subset.

## What Changes

- Board set-up page: the same simple and advanced switch as the creation page, with the same rules.
- Invite step after set-up: follows the mode (advanced shows templates, notes and the facilitator link).
- Theme selection visible in simple mode (creation, set-up and options).
- Advanced mode lists every column with its vote switch at creation, set-up and in the options.

Out of scope: new settings.

Bounded contexts: Facilitation (set-up), Voting (column scope). No protocol change.

## Capabilities

### New Capabilities

- `ui-modes`

### Modified Capabilities

None.

## Impact

- Web: `BoardSetupForm.vue`, board set-up flow, `ShareDialog.vue`, `OptionsDialog.vue`, `ModeSwitch.vue`.
- Tests: e2e for each surface in both modes.
