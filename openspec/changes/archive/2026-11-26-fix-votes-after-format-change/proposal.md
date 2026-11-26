# Proposal

## Why

Owner note (2026-11-20), a bug: "After a column changes to new column names, the votes are still shown in the post-it and the groups but are absent from the voting results and voting is impossible."

The code explains how the three symptoms can happen together, which the reproduction in task 1.1 must confirm:

- Changing the format of a board that already has notes (`template.apply`, mode `migrate`, `packages/domain/src/facilitation/handlers.ts`) gives the notes and clusters the columns of the new format by position and keeps every vote on them. The new columns are built from the template's own `votable` flags (`columnsFromTemplate`), and a template can mark a column as not votable.
- The vote count on a post-it and on a cluster is read from the idea itself, so it is still shown.
- The vote refusal (`votability()` in `packages/domain/src/voting/policy.ts`) and the ranking (`buildRanking()` in `packages/application/src/read-models/ranking.ts`) both look at the column and skip an idea whose column is not votable. So the idea is missing from the results and cannot be voted any more, while its count is still drawn.

Whatever the exact trigger turns out to be (a format change, a column edit that turns voting off, a move into a non-votable column), the rule that is broken is the same: **what is counted, what is shown and what can be voted must agree**.

## What Changes

- Reproduce first (task 1.1) with a unit test on the domain and an e2e: vote, change the format, look at the card, the results and the vote button.
- One rule, one place: an idea shows a vote count and a vote control, and appears in the results, exactly when its column is votable. An idea in a column that is not votable shows no count, no vote control and is not ranked. The votes already cast stay in the log (nothing is deleted) and come back, with the idea, in the results when the column becomes votable again or the idea is moved to a votable column.
- The vote limit per person counts only the votes on ideas that are counted, so a person is not left with fewer votes because of ideas that no longer count.
- A format change that sets votes aside says so: the facilitator sees "N votes are set aside because their column is not votable in this format" before confirming, and a note remains in the history. Choosing a format to carry the votes is not changed.
- If the reproduction finds another cause (for example a stale `votable` flag after the column editor), the fix goes to that cause and the rule above is the test.

Out of scope: changing which columns of a template are votable, vote history in the report, undo of a format change (`board-undo-rewind`).

Bounded contexts: Voting and Facilitation (domain), the ranking read model, the vote controls in the web. No protocol change (the rule is a pure function of the state, so every replica agrees); no relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`: counted, shown and votable agree after a format or column change.

## Impact

- `packages/domain/src/voting/policy.ts` (one predicate shared by `votability`, the vote limit and the snapshot's `votable` flag), `packages/application/src/read-models/ranking.ts`, the snapshot mapping that decides whether a count is exposed, `NoteCard.vue`, `GroupCard.vue`, `VoteControl.vue`, the format-change confirmation dialog, i18n fr and en.
- Tests: unit tests with a board of notes, clusters and votes taken through every format; an e2e of the owner's scenario; the existing voting specs unchanged.
