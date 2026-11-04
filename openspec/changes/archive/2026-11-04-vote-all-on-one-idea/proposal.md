# Proposal

## Why
Owner feedback 2026-11-03: let a participant spend all of her votes on a single post-it. Today `maxVotesPerItem` caps votes per idea; some teams want to concentrate their weight.

## What Changes
- Board option "Allow all votes on one idea", off by default, in the advanced board options (creation and board menu).
- When on, the per-idea cap equals the person's vote budget; when off, existing `maxVotesPerItem` rules apply unchanged.
- Results and charts count weighted votes as today.

## Capabilities
### New Capabilities
<!-- none -->
### Modified Capabilities
- `voting`: option to concentrate votes.

## Impact
Domain voting policy and board settings event; voting menu (advanced); i18n fr/en. Relates to `up-down-votes` and `voting-v2-and-ranking`. No relay or storage change. Spec only for now.
