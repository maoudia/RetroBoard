# Proposal

## Why

A retro is time-based: one hour, starting with last retro's actions, then writing, grouping, voting and deciding actions. Today there is only a free timer. Teams need a predefined agenda and a clear view of where they are in the hour.

## What Changes

- Agenda made of phases with durations (default 1 h agenda, see docs/PLAN.md 6.1), editable at creation, savable in the team profile.
- Global retro countdown shown as a ring cut into segments (one per phase) with progression, expandable into a panel with every phase, remaining time and overtime.
- Facilitator can start, pause, extend, skip and borrow time from later phases.
- Phase-specific UI: e.g. composers enabled in Write, grouping in Group, vote buttons in Vote; optional auto-publish of drafts at the end of Write.
- The existing timer becomes the current-phase timer.

Out of scope: talk time (separate change), AI timeboxing (in `local-ai-companion`).

## Capabilities

### New Capabilities

- `retro-agenda`: phases, durations, global countdown and phase rules.

### Modified Capabilities

- `timer`: the shared countdown becomes the current phase countdown.

## Impact

- Context: Facilitation (Agenda, Phase). UI ring component in `packages/ui`.
- Free-plan budget: phase events only (a few per retro).
