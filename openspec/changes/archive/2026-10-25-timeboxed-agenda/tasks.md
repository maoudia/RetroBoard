# Tasks

## 1. Domain

- [x] 1.1 Implement `Agenda`, `Phase`, `PhaseClock` and events (start, pause, resume, extend, skip, end) with borrowing; verify unit tests (proportional borrowing, floor, overtime)
- [x] 1.2 Implement the `allowedActions` policy and enforce it in the fold for non-facilitators; verify unit tests

## 2. UI

- [x] 2.1 Segmented ring and expandable phase panel, built in apps/web (AgendaRing; no `packages/ui` package exists, drift accepted); a11y covered by the axe suite; visual regression moved to agentic-delivery-harness 2.2; the Apple-Fitness-style redesign continues in `timer-rings-and-phase-control`
- [x] 2.2 Facilitator phase controls (start, pause, extend with borrow/extend total, skip); verify e2e with two contexts
- [x] 2.3 Phase-aware UI (composer, grouping, vote buttons) and auto-publish at end of Write; verify e2e

## 3. Agenda editing

- [x] 3.1 Agenda editor in board creation (reorder, durations, presets 30/45/60/90 min) and save as team default; verify e2e and fr/en strings
