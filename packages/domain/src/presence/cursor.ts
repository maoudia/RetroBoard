/**
 * Live presence (change p2p-presence-and-cursors). Value objects only: presence is never part of
 * the event log, the replica, board files or exports.
 *
 * Layouts differ between participants (window size, density, a phone shows one column), so a
 * cursor is anchored to the column or note under the pointer, with x and y as fractions of that
 * element's box, quantised to uint16 on the wire.
 */

export const CURSOR_SCALE = 65_535
/** Relay path: at most 4 cursor frames per second per participant, only while moving. */
export const CURSOR_INTERVAL_MS = 250
/** A cursor not updated for this long fades out. */
export const CURSOR_STALE_MS = 10_000
/** Remote cursors drawn at most (most recently active first). */
export const MAX_VISIBLE_CURSORS = 10
/** Focus without activity for this long is shown as idle. */
export const IDLE_AFTER_MS = 60_000

export interface CursorFrame {
  readonly conn: string
  /** Column or note id under the pointer; null when the pointer left the board. */
  readonly anchor: string | null
  /** 0..CURSOR_SCALE fractions of the anchor's box. */
  readonly x: number
  readonly y: number
  /** True while dragging (the only time a touch device sends a cursor). */
  readonly drag: boolean
}

export interface FocusFrame {
  readonly conn: string
  /** Column in view or worked on. */
  readonly column: string | null
  /** Note being edited or dragged. */
  readonly note: string | null
  readonly typing: boolean
}

export interface TimedCursor extends CursorFrame { readonly at: number }

export type PresenceStatus = 'online' | 'idle' | 'typing'

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)

/** A fraction of an element box (0..1) to its wire value. */
export const quantise = (fraction: number): number => Math.round(clamp01(fraction) * CURSOR_SCALE)
/** A wire value back to a fraction of the element box. */
export const dequantise = (value: number): number => clamp01(value / CURSOR_SCALE)

/** Position of a point inside a box as wire fractions (the sender side). */
export function anchorPoint(box: { left: number; top: number; width: number; height: number }, px: number, py: number): { x: number; y: number } {
  return {
    x: quantise(box.width > 0 ? (px - box.left) / box.width : 0),
    y: quantise(box.height > 0 ? (py - box.top) / box.height : 0),
  }
}

/** Where a remote cursor lands in the local box of its anchor (the receiver side). */
export function placePoint(box: { left: number; top: number; width: number; height: number }, x: number, y: number): { left: number; top: number } {
  return { left: box.left + dequantise(x) * box.width, top: box.top + dequantise(y) * box.height }
}

/** Cursors to draw: fresh, on the board, the most recently active first, capped. */
export function visibleCursors(cursors: Iterable<TimedCursor>, now: number, max = MAX_VISIBLE_CURSORS): TimedCursor[] {
  return [...cursors]
    .filter((c) => c.anchor !== null && now - c.at < CURSOR_STALE_MS)
    .sort((a, b) => b.at - a.at || a.conn.localeCompare(b.conn))
    .slice(0, Math.max(0, max))
}

/**
 * Sender throttle: whether a move at `now` can go out, given the last frame sent.
 * The caller keeps the latest position and sends it on the next tick (trailing edge).
 */
export const canSendCursor = (lastSentAt: number | null, now: number, interval = CURSOR_INTERVAL_MS): boolean =>
  lastSentAt === null || now - lastSentAt >= interval

/** Presence status shown in the participants menu. */
export function presenceStatus(focus: FocusFrame | undefined, lastActiveAt: number, now: number): PresenceStatus {
  if (focus?.typing) return 'typing'
  return now - lastActiveAt >= IDLE_AFTER_MS ? 'idle' : 'online'
}

/** Linear interpolation for smooth cursors between two frames (t in 0..1). */
export const lerp = (from: number, to: number, t: number): number => from + (to - from) * clamp01(t)
