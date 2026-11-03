# Proposal

## Why

Live retro feedback (owner, phone, 2026-11-02, second wave): many features exist, the irritants now cost more than missing features. Priority goes to everyday UX and UI friction before new capabilities.

## What Changes

- Safety and feedback: confirm before deleting a pinned note; "Group similar ideas" no longer freezes the page, also on empty columns, and always ends with a notification (found N groups / nothing to group).
- Phone columns: the column width menu (narrow, normal, wide, full) works on phones and a narrow column leaves the next one peeking; the column slider moves to the top, is very thin and shows how many columns there are and where you are; long labels in the presentation menu and the voting bar become icon plus short text so nothing overlaps.
- Chrome: writing area can be hidden per column with a smooth vertical slide; the toolbar hides and shows with a smooth slide and keeps a chevron handle; board creation offers "hide the menu bar in presentation mode", on by default.
- Joining: faster QR code generation and a clearer "how to join" explanation (scan, link, code).
- Consistency and readability: one button style for the vote bar and phase bar (3 of 3 left, Open now, Closed, More, Publish all); overdue time reads like "2 days late" instead of "+10949:49".

Out of scope: new facilitation features; changes to the sync protocol.

Bounded contexts: Ideation (group similar, delete), Facilitation (display), Presence (join).

## Capabilities

### New Capabilities

- `ux-irritants`

### Modified Capabilities

None.

## Impact

- Web only: board page, toolbar, column, QR/share dialog, creation page, i18n fr and en; e2e on phone (390 px), desktop and TV; axe on each touched surface.
