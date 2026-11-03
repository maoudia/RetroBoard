# Proposal

## Why

Owner feedback of 2026-11-03 (ten screenshots of the live app) lists visual and behavioural defects that make the product feel unfinished: a transparent chat, a one-line field for action plans, clipped buttons, a mode switch with its own look, a column menu action that does nothing when everybody is facilitator, a writing-size control that feels invented, an overflowing "has the floor" banner on phones, a voting menu full of duplicated text, participant colours that do not match the profiles, and a long encryption sentence where a shield would do. These are the next release: nothing new is built before they are fixed.

## What Changes

1. Chat: opaque panel, each message and the header use the author's configured colour and avatar, and a "connected / focused on the conversation" status is shown by default; a preference turns the status off.
2. Action plan dialog: a real multi-line writing area (autosizing textarea) for the action text, with Ctrl/Cmd+Enter to save.
3. Profile dialog: the Erase button is fixed (no clipped outline).
4. Simple / Advanced mode switch: same button style as the rest of the app, no special outline.
5. "Hide for now" in the column menu works for every role, including when everybody is facilitator (open facilitation).
6. Writing-area sizing is redesigned: drag the top edge of the writing area (grip), tap the size chip to cycle S/M/L, double-click to reset; one "Apply to all columns" choice in the Display popover; the toolbar chevron of the Write button is removed (the button only shows or hides).
7. Mobile: the "has the floor" banner wraps and truncates cleanly, never overflows, and stays one coherent component at 320 px and up.
8. Voting menu: each fact appears once, short labels, meaningful icons, and one shared toggle component for every on/off setting in the app.
9. Participants menu shows each person's own chosen colour and avatar, taken from the profile every peer broadcasts on connect, not a colour derived from the key.
10. Encryption state is an icon (shield when protected, open shield-off when not) with the explanation in a tooltip and on tap, instead of the long sentence.

Out of scope: the feature ideas of the same message, specified in their own changes (`vote-all-on-one-idea`, `board-undo-rewind`, `export-destinations-v2`, `user-drive-storage`, `agent-feedback-and-timeboxed-sessions`, `funny-local-companion`).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `board-chat`: opaque panel, author colours and avatars, presence status and its preference.
- `action-tracking`: multi-line action text.
- `profile`: Erase button, broadcast colour and avatar shown in the participants menu.
- `ui-coherence`: one toggle component, mode switch style, voting menu wording.
- `columns`: hide for now when everybody is facilitator.
- `board-layout`: writing-area sizing interaction.
- `mobile-board`: floor banner.
- `voting`: menu content.
- `room-access`: encryption indicator.
- `ui-modes`: mode switch.

## Impact

- `apps/web` components (ChatPanel, action dialog, profile dialog, mode switch, column menu, PrivateSection, AppToolbar, voting menu, participants menu, encryption badge, floor banner), `layout` and `ui` stores, i18n fr/en, design-system doc (toggle).
- Domain: none, except that the hide-for-now rule is checked in the application layer; protocol: the existing profile broadcast must carry colour and avatar (verify, add if missing, backward compatible).
- No relay, storage or dependency change.
