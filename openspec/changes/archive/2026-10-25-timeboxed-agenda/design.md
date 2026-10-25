# Design

## Decisions

- `Agenda` value object in `domain/facilitation`: ordered `Phase { id, kind, plannedMs }`, plus a running `PhaseClock { phaseId, startedAt, pausedAt, extensions }`. Time computed from HLC wall-clock component and each client's measured skew.
- Borrowing distributes the delta proportionally across remaining phases, with a floor of 1 minute per phase.
- Ring: SVG with `stroke-dasharray` segments, gaps of 2 degrees ("cut rings"), CSS-only animation of progress, reduced motion respected; expandable panel is a popover anchored to the ring.
- Phase rules are a pure policy `allowedActions(phase, role, settings)` used by both UI and fold (the fold accepts out-of-phase events from facilitators only).
- Agenda templates are saved in the team profile (local).

## Risks / Trade-offs

- [Clock skew] -> skew estimation from relay pings (existing), display rounded to seconds.
