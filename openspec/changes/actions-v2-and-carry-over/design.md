# Design

## Decisions

- `Action` aggregate: `{ id, title, owner?: OwnerRef, status, statusHistory, due?, origin?: VotableRef, carriedFrom?: { board, sprint } }`; `StatusWorkflow` value object (`checkbox` maps to To do/Done).
- Owner suggestions: application query merging presence list, team history and typed text; pure function, unit-testable.
- Carry-over sources implemented as adapters of an `ActionSourcePort`: TeamProfile (IndexedDB), BoardFile, JsonExport, CsvExport (Jira columns), LiveBoard (join read-only, fetch actions, leave).
- Review popup is a phase-aware component shown in the "Previous actions" phase or at first join when no agenda is used.
