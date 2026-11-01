# Proposal

## Why

Owner feedback (2026-11-01): (1) the start and pause button of the global ring floats next to it, it should be part of the ring component; (2) when the facilitator skips a phase, the global counter jumps by the planned size of that phase, although the retro still has its full hour: it must follow the real time spent; (3) the progress bar should reflect the phases and, on a click on a segment, name the phase and show the real time spent in it.

## What Changes

- The start and pause button lives inside the ring component, in the same rounded frame as the rings and the time.
- The global time (ring and "x of y min") counts the time really spent in finished phases plus the running one. A phase skipped (next, jump to the closing phase) adds only what was actually spent in it, so after skipping a fifteen minute phase after one minute the retro shows one minute elapsed, not sixteen. The planned total (one hour) does not change.
- Each segment of the phase bar is a button; activating it opens a small popover with the phase name, the real time spent (m:ss, running time for the current phase, "Skipped" when the phase was left without time spent, nothing yet for a phase to come) and the planned time. Keyboard and screen reader operable.

Out of scope: editing the time of a finished phase, per-phase history across boards.

Bounded contexts: Facilitation (pure read side). No new event, no protocol change, no relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `retro-agenda`

## Impact

- Domain: `phaseClock` total elapsed from recorded `actualMs`; application: stepper steps expose the actual time; web: ring frame with the toggle inside, stepper segment popover (fr/en), tests.
