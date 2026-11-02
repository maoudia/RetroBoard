# Proposal

## Why

Votes per person and the sealed ballot can only be changed after the board exists, in the options. `board-creation-v2` asks the creation page to expose the voting decisions; this small step does it in advanced mode.

## What Changes

- Advanced creation shows "Votes per person" (1 to 20, default 3) and "Sealed ballot". They are applied right after the board exists. Simple mode keeps the defaults.

Out of scope: votes per idea, hidden counts variants and the stepper (rest of `board-creation-v2`).

Bounded contexts: facilitation (existing settings command). No new event.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `BoardSetupForm`, `board.vue` setup hand-off, fr and en strings.
