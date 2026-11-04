# Proposal

## Why

Owner feedback (2026-11-02): personal layout choices (column sizes, composer height and more) must be remembered per device and per screen size, so a laptop, a phone and the meeting-room TV each keep their own comfortable layout.

## What Changes

- Layout profiles kept on the device, one per screen class: phone (under 600 px), tablet (under 1024 px), desktop (under 1920 px) and wall or TV (1920 px and more), with portrait and landscape kept apart on phones and tablets.
- Learned, not configured: whatever the person resizes or toggles (column widths, composer height, density, zoom, presenter focus style, drawer and filter open states, actions panel width) is saved to the profile of the current screen class and reused next time on any board.
- Optional per-board override: "keep this layout for this board only" for boards with unusual formats.
- Profile section "Layout on this screen": reset this screen, copy the layout of another screen class, see what is remembered.
- Existing column sizes migrate into the desktop profile; local only, never synced.

Out of scope: syncing layouts between devices (no server storage).

Bounded contexts: none on the domain side (local view state).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profile`: layout preferences per device and screen class.

## Impact

- Web: a layout store (replaces the column-size storage), composer, drawers, presenter focus, profile dialog.
- Tests: unit tests of the store (screen classes, migration), e2e with viewport changes.
