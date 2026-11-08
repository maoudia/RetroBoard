# Proposal

## Why

Owner feedback (2026-11-08): "Chat floating button should have sticky auto position like Facebook messenger style. Left right etc and we should also have the possibility to choose a free position."

Today the minimised chat bubble (`ChatPanel.vue`) can be dragged anywhere and stays exactly where it was dropped. That is fine on a desktop, but on a phone it ends up half over the composer or the "add idea" button, on a rotated device it lands off screen, and nothing tells the person where it may rest. Messenger's chat heads solved this years ago: the head slides to the nearest edge on release, stays out of the way, and keeps its place. We copy the behaviour that works, keep a free mode for people who want it, and add the keyboard and menu alternative that dragging alone cannot give (WCAG 2.2 criterion 2.5.7).

## What Changes

- **Snap on release.** Dropping the chat button moves it to the nearest screen edge (left, right, top, bottom, or a corner when dropped near two edges) with a short spring; the position along the edge is kept.
- **It remembers.** The place is stored on this device as an edge plus a fraction along it (not pixels), so it survives rotation, a resized window and a different screen of the same device. Nothing is sent to the board or the server.
- **It keeps out of the way.** The resting place avoids the safe areas of the device (notch, home bar), the toolbar, the presenter bar, the composer action buttons of the column in focus and the soft keyboard: if the spot is taken, the button slides along its edge to the nearest free slot, and sits above the keyboard while it is open.
- **Free position, by choice.** A profile setting "Chat button: snap to the edges (default) / free" lets a person drop it anywhere (stored as fractions of the window, clamped inside the safe area); a "Reset position" returns it to the default (right edge, lower third).
- **No drag needed.** A menu on the button (long press, the context-menu key or Shift+F10) offers "Move", with the arrow keys and Enter, and a position picker with the eight edge places in the profile, so the feature works without a pointer.
- **Unread badge** follows the button and flips to the inner side so it never leaves the screen.
- Reduced motion: no spring, the button jumps to its place.
- Migrates the old free position (`retroboard:chat-bubble` in pixels) to the new model on first load.

Out of scope: the chat drawer itself and the side it opens on (`chatSide` stays), chat content and message actions (`chat-message-controls`), a draggable toolbar, notifications (`attention-and-notifications`).

Bounded context: Presence (chat, local UI state). No protocol, domain or relay change, no relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chat`: the floating chat button snaps, remembers its place, avoids what it could cover and can be moved without dragging.

## Impact

- Web: `ChatPanel.vue` (bubble), a small pure placement module (`apps/web/app/utils/chat-dock.ts`) with unit tests, profile settings keys, i18n (fr, en).
- Docs: the user guide chapter `people` and its manifest step for the chat are updated and regenerated in the same pull request (agent rule).
- Free-plan budget: unchanged (no traffic).
