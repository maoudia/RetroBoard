# Proposal

## Why

Split from `results-insights` (task 3.1, 2026-11-11). The results page and the report now show insights for one board; comparing a retro with the previous ones of the same team needs the team history that `team-workspaces` (R3) provides. Keeping the task inside `results-insights` held that change open for a release it does not belong to.

## What Changes

- Trends against the previous retros of the same team: participation, actions done and recurring topics, computed locally from the team history.
- Shown on the results page and carried into the report and the exports.

Out of scope: an AI summary (`local-ai-companion`), any server-side history (no server storage).

Bounded contexts: Reporting (read side), Team space. Pure read models, no protocol change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`: results with trends against the team's previous retros.

## Impact

- Depends on `team-workspaces` (team history, carry-over query by team). Reuses the insights read model and keyword grouping of `results-insights`.
- Web: trends block on the results page, report and exports.
