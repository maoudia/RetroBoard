# Proposal

## Why

Owner feedback (2026-10-29): the lock-voting button is clever but unclear, the Close/Open voting button stays active when the phase does not allow voting, the voting, reveal-all and publish-all controls are scattered, there is no direct way to end the session without stepping through every phase, and the global timer is hard to start.

## What Changes

- One facilitation control group: voting state as a segmented control with explicit text (Open, Closed, Opens in the Vote phase), Reveal all, Publish all.
- Facilitator override "Open voting now" outside the Vote phase, explicit and cleared at the next phase change.
- "Go to closing": jump to the close phase from anywhere, with confirmation; actual phase times are recorded.
- Global timer: click the clock (play/pause icon inside) to start or pause; the board option "start the timer when the board is created" (off by default); pausing the global timer pauses the phase clock.

Out of scope: the minimal fix of the active voting button (bug issue), sealed ballot (voting-v2-and-ranking).

Bounded contexts: Facilitation, Voting. One privileged event for the override; no change to the relay budget.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`
- `retro-agenda`
- `timer`

## Impact

- Application: votingState read model; domain: voting override, agenda jump; web: facilitation menu, clock control.
