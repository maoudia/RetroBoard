# Proposal

## Why

Owner feedback (2026-11-01): the phase stepper (progress bar) is liked, but people should choose between elapsed and remaining time, for the stepper and for the global ring. By default the two must not say the same thing. A phase in overtime must be obvious: its remaining time at zero in the overtime colour.

## What Changes

- Personal setting "Time shown" for the phase stepper and for the global ring, each one of: remaining, elapsed. Defaults: the stepper shows the progress with the elapsed time of the phase, the ring shows the time left of the whole retro, so they complement each other.
- Overtime: the stepper segment and its label switch to the overtime token (red family from the theme, `--ring-over`), show 0:00 left, then "+m:ss" over; the ring keeps its overtime ring.
- The setting lives in the profile dialog and in a small menu on the stepper; changes apply at once.

Out of scope: per-board defaults chosen by the facilitator, new ring visuals (activity-rings-timer).

Bounded contexts: Facilitation (presentation only), Profile (local setting). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `retro-agenda`

## Impact

- Application: a pure time label read model (remaining, elapsed, overtime) used by the stepper and the ring; web: settings, stepper menu, overtime styles.
