import { describe, expect, it } from 'vitest'
import {
  anchorPoint, canSendCursor, CURSOR_SCALE, CURSOR_STALE_MS, dequantise, IDLE_AFTER_MS, lerp, MAX_VISIBLE_CURSORS,
  placePoint, presenceStatus, quantise, type TimedCursor, visibleCursors,
} from '../src/presence/cursor'

const cursor = (conn: string, at: number, anchor: string | null = 'n1'): TimedCursor => ({ conn, anchor, x: 0, y: 0, drag: false, at })

describe('anchored cursors', () => {
  it('quantises fractions to uint16 and clamps out-of-box values', () => {
    expect([quantise(0), quantise(1), quantise(0.5), quantise(-2), quantise(3), quantise(Number.NaN)]).toEqual([0, CURSOR_SCALE, 32_768, 0, CURSOR_SCALE, 0])
    expect(dequantise(CURSOR_SCALE)).toBe(1)
    expect(dequantise(0)).toBe(0)
    expect(dequantise(CURSOR_SCALE * 2)).toBe(1)
  })

  it('points at the same spot of a note for windows of different sizes', () => {
    const wide = { left: 100, top: 200, width: 400, height: 100 }
    const narrow = { left: 10, top: 50, width: 200, height: 80 }
    const sent = anchorPoint(wide, 300, 225) // middle, a quarter down
    expect(sent).toEqual({ x: quantise(0.5), y: quantise(0.25) })
    const p = placePoint(narrow, sent.x, sent.y)
    expect(p.left).toBeCloseTo(110, 1)
    expect(p.top).toBeCloseTo(70, 1)
  })

  it('handles empty boxes without dividing by zero', () => {
    expect(anchorPoint({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual({ x: 0, y: 0 })
  })

  it('draws the most recent fresh cursors only, capped at 10', () => {
    const now = 100_000
    const many = Array.from({ length: 25 }, (_, i) => cursor(`c${String(i).padStart(2, '0')}`, now - i * 10))
    const shown = visibleCursors([...many, cursor('stale', now - CURSOR_STALE_MS), cursor('away', now, null)], now)
    expect(shown).toHaveLength(MAX_VISIBLE_CURSORS)
    expect(shown[0]!.conn).toBe('c00')
    expect(shown.map((c) => c.conn)).not.toContain('stale')
    expect(shown.map((c) => c.conn)).not.toContain('away')
    expect(shown.at(-1)!.conn).toBe('c09')
    expect(visibleCursors(many, now, 0)).toEqual([])
  })

  it('breaks ties by connection id so every render is stable', () => {
    expect(visibleCursors([cursor('b', 5), cursor('a', 5)], 10).map((c) => c.conn)).toEqual(['a', 'b'])
  })

  it('throttles cursor frames to 4 per second', () => {
    expect(canSendCursor(null, 0)).toBe(true)
    expect(canSendCursor(1_000, 1_249)).toBe(false)
    expect(canSendCursor(1_000, 1_250)).toBe(true)
  })
})

describe('presence status', () => {
  const focus = { conn: 'c', column: 'col', note: null, typing: false }
  it('is typing, online, then idle after a minute without activity', () => {
    expect(presenceStatus({ ...focus, typing: true }, 0, IDLE_AFTER_MS * 2)).toBe('typing')
    expect(presenceStatus(focus, 1_000, 1_000 + IDLE_AFTER_MS - 1)).toBe('online')
    expect(presenceStatus(undefined, 1_000, 1_000 + IDLE_AFTER_MS)).toBe('idle')
  })
})

it('interpolates and clamps', () => {
  expect([lerp(0, 10, 0.5), lerp(0, 10, -1), lerp(0, 10, 2)]).toEqual([5, 0, 10])
})
