import { describe, expect, it } from 'vitest'
import { DOUBLE_TAP_MS, DOUBLE_TAP_SLOP_PX, isDoubleTap, isTap, LONG_PRESS_MS } from '../app/utils/note-zoom-gesture'

const tap = (x: number, y: number, at: number) => ({ x, y, at })

describe('double tap rule of the note zoom', () => {
  it('two taps within 300 ms and 10 px zoom', () => {
    expect(isDoubleTap(tap(10, 10, 0), tap(14, 13, 200))).toBe(true)
  })
  it('the limits are inclusive', () => {
    expect(isDoubleTap(tap(0, 0, 0), tap(DOUBLE_TAP_SLOP_PX, 0, DOUBLE_TAP_MS))).toBe(true)
  })
  it('a slow second tap or a far one starts a new pair', () => {
    expect(isDoubleTap(tap(0, 0, 0), tap(0, 0, DOUBLE_TAP_MS + 1))).toBe(false)
    expect(isDoubleTap(tap(0, 0, 0), tap(DOUBLE_TAP_SLOP_PX + 1, 0, 100))).toBe(false)
  })
  it('a first tap alone never zooms', () => {
    expect(isDoubleTap(null, tap(0, 0, 0))).toBe(false)
  })
  it('a drag or a long press is not a tap', () => {
    expect(isTap(tap(0, 0, 0), tap(4, 4, 90))).toBe(true)
    expect(isTap(tap(0, 0, 0), tap(30, 0, 90))).toBe(false)
    expect(isTap(tap(0, 0, 0), tap(0, 0, LONG_PRESS_MS))).toBe(false)
  })
})
