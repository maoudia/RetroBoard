# Proposal

## Why

The profile menu lists about twenty personal settings at once. With the simple and advanced mode now in creation, sharing, export and board options, the profile should follow it so people are not overloaded.

## What Changes

- Simple shows identity, display mode, language, theme variant, retention, pointer sharing, recent boards and the local wipe.
- Advanced adds ambient effects, motion, density, shortcuts and hints, popup position, clock display modes, phase warning, system notifications, sound, peer-to-peer, other people's pointers and browser agents.
- No setting is removed; values keep applying whatever the mode.

Bounded contexts: presentation, local settings. No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profile`

## Impact

- Web: `ProfileDialog` only.
