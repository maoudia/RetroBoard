import { describe, expect, it } from 'vitest'
import { classOf, copyClass, layoutOf, legacySizes, resetClass, setAllWrite, setColumnWrite, setColumnWriteHeight, setSize, setWrite, withLayout } from '../app/utils/layout'

describe('layout per screen class', () => {
  it('classifies widths', () => {
    expect([390, 800, 1440, 2560].map(classOf)).toEqual(['phone', 'tablet', 'desktop', 'wall'])
  })
  it('keeps a laptop width apart from the TV', () => {
    let b = setSize({}, 'desktop', 'room', 'c1', 'wide')
    b = setSize(b, 'wall', 'room', 'c1', 'narrow')
    expect(layoutOf(b, 'desktop').sizes.room).toEqual({ c1: 'wide' })
    expect(layoutOf(b, 'wall').sizes.room).toEqual({ c1: 'narrow' })
    expect(layoutOf(b, 'phone').sizes).toEqual({})
  })
  it('normal removes the entry, and the input is never mutated', () => {
    const a = setSize({}, 'phone', 'r', 'c', 'full')
    const b = setSize(a, 'phone', 'r', 'c', 'normal')
    expect(layoutOf(a, 'phone').sizes.r).toEqual({ c: 'full' })
    expect(layoutOf(b, 'phone').sizes.r).toEqual({})
  })
  it('resets and copies one class', () => {
    let b = withLayout(setWrite({}, 'desktop', 'r', 'large'), 'desktop', { density: 'compact' })
    b = copyClass(b, 'desktop', 'tablet')
    expect(layoutOf(b, 'tablet').density).toBe('compact')
    expect(layoutOf(b, 'tablet').write.r).toBe('large')
    b = resetClass(b, 'desktop')
    expect(b.desktop).toBeUndefined()
    expect(b.tablet).toBeDefined()
    expect(copyClass(b, 'phone', 'wall')).toBe(b)
  })
  it('reads the sizes saved before the change', () => {
    const store: Record<string, unknown> = { 'rb.colsize.r1': { c: 'wide' }, 'rb.writesize.r1': 'large' }
    const get = <T,>(k: string, f: T): T => (k in store ? (store[k] as T) : f)
    expect(legacySizes('r1', get)).toEqual({ sizes: { c: 'wide' }, write: 'large' })
    expect(legacySizes('none', get)).toEqual({ sizes: {}, write: null })
  })
})

describe('writing field height (change board-layout-v2)', () => {
  it('is clamped, per room, and a size preset clears it', async () => {
    const { setWriteHeight, setWrite, layoutOf, MAX_WRITE_PX, MIN_WRITE_PX } = await import('../app/utils/layout')
    let book = setWriteHeight({}, 'desktop', 'r1', 5000)
    expect(layoutOf(book, 'desktop').writeH).toEqual({ r1: MAX_WRITE_PX })
    book = setWriteHeight(book, 'desktop', 'r1', 1)
    expect(layoutOf(book, 'desktop').writeH?.r1).toBe(MIN_WRITE_PX)
    book = setWriteHeight(book, 'desktop', 'r2', 120)
    book = setWrite(book, 'desktop', 'r1', 'large')
    expect(layoutOf(book, 'desktop').writeH).toEqual({ r2: 120 })
    expect(layoutOf(setWriteHeight(book, 'desktop', 'r2', null), 'desktop').writeH).toEqual({})
  })
})

describe('writing size per column (change toast-notifications-v2)', () => {
  it('a column keeps its own size, a dragged height is replaced by a preset, and null follows the room again', () => {
    let b = setWrite({}, 'desktop', 'r1', 'normal')
    b = setColumnWriteHeight(b, 'desktop', 'r1', 'c1', 150)
    expect(layoutOf(b, 'desktop').writeHCol?.r1?.c1).toBe(150)
    b = setColumnWrite(b, 'desktop', 'r1', 'c1', 'large')
    expect(layoutOf(b, 'desktop').writeCol?.r1?.c1).toBe('large')
    expect(layoutOf(b, 'desktop').writeHCol?.r1?.c1).toBeUndefined()
    b = setColumnWrite(b, 'desktop', 'r1', 'c1', null)
    expect(layoutOf(b, 'desktop').writeCol?.r1?.c1).toBeUndefined()
  })

  it('the heights are clamped and the other columns are untouched', () => {
    let b = setColumnWriteHeight({}, 'phone', 'r1', 'c1', 5)
    b = setColumnWriteHeight(b, 'phone', 'r1', 'c2', 9999)
    expect(layoutOf(b, 'phone').writeHCol?.r1).toEqual({ c1: 40, c2: 420 })
  })

  it('one size for all clears every column of its own, in that room only', () => {
    let b = setColumnWrite({}, 'desktop', 'r1', 'c1', 'large')
    b = setColumnWrite(b, 'desktop', 'r2', 'c1', 'small')
    b = setAllWrite(b, 'desktop', 'r1', 'small')
    expect(layoutOf(b, 'desktop').write.r1).toBe('small')
    expect(layoutOf(b, 'desktop').writeCol?.r1).toEqual({})
    expect(layoutOf(b, 'desktop').writeCol?.r2?.c1).toBe('small')
  })
})
