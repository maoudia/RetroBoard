# Proposal

## Why

Owner feedback (2026-11-02): the vote results and board statistics are too simple and the podium positions look wrong; the owner wants more charts and some intelligence in them.

## What Changes

- Podium fixed: positions 1, 2, 3 laid out as a real podium with ties side by side, readable at every size.
- More charts, drawn in SVG with an accessible table behind each: votes per idea, votes per column, vote spread, participation (how many people voted, share of votes used, counts only when the vote is not secret), time per phase against the plan, ideas turned into actions.
- Insights in plain words, computed locally (no AI service, no network): "3 ideas took 60% of the votes", "the team agrees on X" (low spread), "Y split the team" (high spread), "the Stop column got twice the votes of Start", "phase Discuss ran 12 minutes over", "2 of the top 3 ideas have no action yet".
- Recurring topics: local keyword grouping of the notes (fr/en stop words, no model) to show the themes the team keeps raising.
- Trends against the previous retros of the same team once `team-workspaces` lands (participation, actions done, recurring topics).
- Every chart and insight goes into the retro report and the exports.

Folds `voting-results-charts` task 2.2 (results page redesign), marked moved.

Out of scope: an AI summary (`local-ai-companion`).

Bounded contexts: Reporting (read side), Voting. Pure read models, no protocol change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`: results with charts and insights.

## Impact

- Packages: insights read model and keyword grouping in application; exporters reuse them.
- Web: results page redesign (phone to TV).
