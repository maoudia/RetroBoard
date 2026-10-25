# Proposal

## Why

The results dialog shows a podium and a list. The owner wants a more engaging results page with charts so the team understands the vote at a glance.

## What Changes

- Results page redesign: podium on top, then charts drawn in SVG on the device (no chart library, CSP-safe):
  - horizontal bars of the top 10 ideas with vote counts and ties highlighted
  - votes per column (share of the total)
  - vote participation (how many people voted, votes used over votes available), without revealing who voted for what
  - optional: how votes are spread (top-heavy or spread) with a one-line interpretation
- Charts respect hidden counts: nothing is drawn while the secret vote is open.
- Charts follow the board theme colours and are readable in light and dark, with text alternatives for screen readers.
- "Create an action" stays on every idea.

Out of scope: charts in the exported report (later, reuses the same read model).

Bounded contexts: Voting (read model). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`: results page with charts.

## Impact

- Application: `voteStats(snapshot)` read model; Web: RankingDialog redesign, small SVG chart components.
