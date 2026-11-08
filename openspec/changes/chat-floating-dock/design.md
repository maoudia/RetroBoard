# Design

## Decisions

- **Model, not pixels.** The place is `{ mode: 'snap', edge: 'left'|'right'|'top'|'bottom', at: 0..1 }` or `{ mode: 'free', x: 0..1, y: 0..1 }` (fractions of the usable area). Corners are `at` 0 or 1 on an edge. A pure function `dock(point, rect, insets, avoid[]) -> Place` decides the nearest edge, and `rest(place, rect, insets, avoid[], keyboard) -> {x, y}` turns a place into pixels. Both are pure and unit tested; the component only measures and applies.
- **Nearest edge.** The distance to each of the four edges decides; ties go to the horizontal edges (thumb reach on phones). A drop within 56 px of two edges snaps to that corner (the button is 48 px, the corner zone one button wide plus a margin).
- **Avoidance is a rule, not a layout.** Elements that must stay reachable carry `data-avoid-chat` (toolbar, presenter bar, the composer action buttons of a column); the rest position is computed from their rectangles: if the button would overlap one, it slides along its edge to the nearest free slot, and if the edge is full it falls back to the opposite edge. Recomputed on resize, orientation change, `visualViewport` change (keyboard) and when an avoided element appears. A stored place is never overwritten by an avoidance shift: avoidance is transient.
- **Keyboard open.** While `visualViewport.height` is below 75% of the window, the button rests above the keyboard at its x.
- **Where it lives.** The button stays in `ChatPanel.vue`; the placement maths in `apps/web/app/utils/chat-dock.ts`; the choice and the place in `settings` (`chatDock: 'snap' | 'free'`, `chatPlace`), local only, written through the existing `safeStorage`. Migration: if `retroboard:chat-bubble` holds `{x, y}` pixels, convert to fractions once and drop the key.
- **Drag, with a slop.** Pointer events with capture, 6 px slop before a drag starts (the existing value), `touch-action: none` on the button only, so scrolling the board is untouched. During a drag the button follows the pointer; on release it animates to the resting place (180 ms, `cubic-bezier(.22, 1, .36, 1)` like the other motion tokens), none under `prefers-reduced-motion`.
- **Alternatives to dragging (2.5.7).** (1) A menu on the button: long press, the context-menu key or Shift+F10 opens "Move chat button", "Snap to edges / Free position", "Reset position". (2) "Move" enters a mode announced politely ("Use the arrow keys to move the chat button, Enter to drop, Escape to cancel"): arrows step 24 px in free mode and jump to the next edge place in snap mode. (3) Profile > Chat button: a picker of eight places (four corners, four edge middles) and the snap / free choice.
- **Target size (2.5.8).** The button is 48 px; menu items are 44 px high.
- **Badge.** The unread badge is anchored to the button's inner corner (the one pointing to the screen centre) so it is never clipped.
- **Presenter mode.** The button follows the existing "hide menus in presenter mode" profile setting; when shown it avoids the presenter bar.
- **Drawer.** The drawer still opens on `chatSide`; when the button rests on the left or right edge, the drawer opens on that side (the person put the button there on purpose), top and bottom edges use `chatSide`.

Where things live: placement maths and migration in `apps/web/app/utils`, state in the settings store, rendering in `ChatPanel.vue`. No domain, application or relay code.

Security and privacy note: the place is local UI state; it is never put in a board event, presence frame or log, so the relay and the other participants cannot observe it. CSP: positions are applied through `transform` set from script (CSSOM, allowed), never an inline `style` attribute in markup.

## Open questions

- Should a person on a phone be offered "Always show the chat button" because the toolbar chat icon scrolls out of view? Decide after the first field feedback; the snap model does not depend on it.
