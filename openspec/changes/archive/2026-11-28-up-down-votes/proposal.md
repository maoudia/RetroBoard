# Proposal

## Why

Owner feedback (2026-11-01): an optional voting mode with up and down votes, like on a video site, off by default.

## What Changes

- Board setting "Vote style": dots (today, default) or up and down. Set at creation and in the board options by the facilitator; it cannot change once votes exist (or the votes are reset after a confirmation).
- Up and down mode: each participant gives one up or one down per idea (or nothing); the score is ups minus downs; the ranking orders by score, then by ups. The votes-per-person budget does not apply in this mode.
- Hidden counts and secret voting keep working: counts hidden until voting closes, own choice always visible to oneself.
- The vote control shows two buttons with accessible names and the current choice pressed; results show ups, downs and score.

Out of scope: emoji reactions, weighted votes.

Bounded contexts: Voting. One event per vote, like today; no budget impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`

## Impact

- Domain: vote style in settings, `vote.up`, `vote.down`, `vote.clear` folding; application: ranking and stats by score; web: vote control variant, creation form and options; exporters show the score.
