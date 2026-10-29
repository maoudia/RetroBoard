# Proposal

## Why

Owner feedback (2026-10-29): the bottom info bar ("Now: Group. Opened: grouping.", "Time is up for Check-in. Next: Previous actions.") is poorly designed, the time-up component renders at the bottom of the board and goes off screen, and nothing should be displayed under the columns. The owner wants a progress bar of the steps and a discreet log of board events (KISS, 2026 design).

## What Changes

- Phase stepper: a compact progress bar of the agenda steps (done, current with time left, next) near the toolbar, replacing the bottom info bar.
- Activity feed: phase changes, what opened or closed, time up, reveals, votes closed, as a discreet floating panel (badge with unread count, short log).
- Important notices (time up): sticky notification at a fixed position, visible until dismissed or hidden after 20 s by default, never below the columns.
- Notification position: top centre by default, left or right as a personal preference; one popup at a time (shared queue).

Out of scope: the off-screen bug fix itself (bug issue), sound and system notifications (exist).

Bounded contexts: Facilitation (presentation), Presence (local). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `facilitation`

## Impact

- Application: activityLog read model; web: PhaseStepper, ActivityPanel, notice host; profile: notice position.
