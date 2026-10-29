# Proposal

## Why

Owner feedback (2026-10-29): on desktop a mode should show the keyboard shortcuts next to the actions, and it can be turned off in the preferences. Shortcuts should not appear in the main messages (composer hint, toasts). A library that handles keyboard layouts may be better than our own handler.

## What Changes

- Hint mode: key caps next to toolbar actions and menu items on desktop, on by default, off in the preferences; never on touch devices.
- Shortcut text removed from the composer hint and toasts; the help overlay stays the reference.
- Evaluate a small permissive library (for example tinykeys, MIT) against the current handler for AZERTY and QWERTY layouts; keep the smaller correct option.

Out of scope: new shortcuts.

Bounded contexts: Presentation only. No relay traffic.

## Capabilities

### New Capabilities

- `keyboard`

### Modified Capabilities

None.

## Impact

- Web: key caps component, preference; maybe one dependency after the license and size check.
