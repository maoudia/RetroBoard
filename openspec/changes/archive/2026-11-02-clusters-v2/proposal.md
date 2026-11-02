# Proposal

## Why

Owner feedback (2026-10-30):
- A group (cluster) cannot be dragged to another column the way a note can. Moving five notes one by one breaks the flow and loses the cluster.
- Group title ideas look weird. Today the default title is the first idea and the suggestions (`suggestClusterTitles`) pair two shared words or pick single frequent words. That gives titles like "Deploy Friday" or "Tests" that read as noise.

## What Changes

- New domain command `group.move { id, columnId }`: every note of the cluster and the cluster itself move to the target column; votes, title and order are kept. Locked board and unknown column are refused, as for `note.move`.
- Drag and drop of a cluster card to another column, with the same drop targets, ghost and animation as a note. Keyboard and touch alternative: "Move to column..." in the cluster menu (WCAG 2.5.7 dragging alternative).
- Better title suggestions, still local, no AI and no network:
  - Phrases that appear contiguously in several ideas rank above isolated words.
  - Light plural and accent folding (fr, en) so "test" and "tests" count together.
  - A shared word is suggested only if it is a content word of at least 4 letters.
  - The short idea fallback is cut on a word boundary.
  - At most 3 suggestions, never a pair of unrelated words.
- Default title: the shortest idea, cut to 40 characters on a word boundary, instead of the first idea.
- A golden corpus of real-like clusters (fr and en) with the accepted suggestions, to keep the quality measurable.

Out of scope: AI titles (`local-ai-companion` 3.1), cluster motion variants (`cluster-reveal-motion` group 2), merging clusters across columns (merge keeps the same-column rule; move first, then merge).

Bounded contexts: Ideation (domain, protocol), Presentation (drag, menu), Application (suggestions read model). One more event type on the wire, same message rate as `note.move`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grouping`

## Impact

- `packages/domain` (ideation handlers, commands), `packages/protocol` (schema), `packages/application` (command, suggestions), web drag layer and cluster menu, i18n fr and en, unit and e2e tests.
- Peers on an older version ignore `group.move` (unknown command) until they update; same rule as the other additions.
