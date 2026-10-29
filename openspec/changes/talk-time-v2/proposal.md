# Proposal

## Why

Owner feedback (2026-10-29): the talk-time experience is basic and not intuitive; it needs to be rethought.

## What Changes

- Raise hand queue: participants raise a hand, the facilitator sees the queue and gives the floor in order ("pass the mic").
- Speaker indicator: a budget ring around the speaker avatar instead of a banner.
- Talk balance meter for the facilitator (shares, anonymous names stay anonymous).
- Big "Raise hand" button on phones.
- A short UX study with three flows reviewed by the owner before building.

Out of scope: audio or video.

Bounded contexts: Talk time (facilitation). Two small events per raised hand; within the relay budget.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `talk-time`

## Impact

- Domain: talk.raise and talk.lower; web: queue, avatar ring, balance meter.
