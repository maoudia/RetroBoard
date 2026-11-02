# Proposal

## Why

The board options dialog lists every setting at once. The simple and advanced mode (shipped with creation, sharing and export) should reach the options too, so a facilitator sees the essentials first and the expert settings one click away.

## What Changes

- The options dialog shows the mode switch. Simple shows title, votes per person, secret voting, board lock, theme, format and the danger zone. Advanced adds note length, votes per idea, voting scope, arrival popups, browser agents, action mode and talk time.
- Nothing is removed or renamed; the setting is local to the device.

Bounded contexts: presentation only. No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `OptionsDialog` only.
