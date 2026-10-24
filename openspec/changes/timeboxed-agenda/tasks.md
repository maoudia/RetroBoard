# Tasks

## 1. Domain

- [x] 1.1 Implement `Agenda`, `Phase`, `PhaseClock` and events (start, pause, resume, extend, skip, end) with borrowing; verify unit tests (proportional borrowing, floor, overtime)
- [x] 1.2 Implement the `allowedActions` policy and enforce it in the fold for non-facilitators; verify unit tests

## 2. UI

- [ ] 2.1 Build the segmented ring and expandable phase panel in `packages/ui`; verify visual regression and a11y (announced phase changes)
- [x] 2.2 Facilitator phase controls (start, pause, extend with borrow/extend total, skip); verify e2e with two contexts
- [x] 2.3 Phase-aware UI (composer, grouping, vote buttons) and auto-publish at end of Write; verify e2e

## 3. Agenda editing

- [x] 3.1 Agenda editor in board creation (reorder, durations, presets 30/45/60/90 min) and save as team default; verify e2e and fr/en strings
