# Proposal

## Why

Teams that retro every sprint retype the title each time. Task 1.2 of `board-creation-v2` asked for a smart title with sprint increment; it is small and stands alone.

## What Changes

- The creation form suggests the next title from the most recent board of this browser: "Sprint 42" becomes "Sprint 43". Titles with a date or without a number keep the dated default. Typing replaces the suggestion; nothing is sent anywhere.

Bounded contexts: presentation, local recent boards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `nextTitle` util and `BoardSetupForm`.
