/**
 * Double tap rule of the note zoom (change note-zoom-on-double-tap, task 2.1). Pure: the composable feeds it pointer taps.
 * A single tap has no action on a note, so nothing waits for a second one: the second tap within 300 ms and 10 px opens the zoom.
 */
export const DOUBLE_TAP_MS = 300
export const DOUBLE_TAP_SLOP_PX = 10
/** A press this long is a long press (it lifts the note), never half of a double tap. */
export const LONG_PRESS_MS = 500

export interface Tap { x: number; y: number; at: number }

/** A tap is a press and release that stayed within the slop and shorter than a long press. */
export function isTap(down: Tap, up: Tap): boolean {
  return up.at - down.at < LONG_PRESS_MS && Math.hypot(up.x - down.x, up.y - down.y) <= DOUBLE_TAP_SLOP_PX
}

/** True when `next` completes a double tap that `prev` started. */
export function isDoubleTap(prev: Tap | null, next: Tap): boolean {
  if (!prev) return false
  return next.at - prev.at <= DOUBLE_TAP_MS && Math.hypot(next.x - prev.x, next.y - prev.y) <= DOUBLE_TAP_SLOP_PX
}

/** Controls that keep their own meaning: a double tap on them never zooms. */
export const ZOOM_EXCLUDED = 'button, a[href], input, textarea, select, [role="menuitem"], [contenteditable="true"]'
