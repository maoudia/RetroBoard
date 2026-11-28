import { describe, expect, it } from 'vitest'
import {
  BUTTON, DEFAULT_PLACE, MARGIN, NO_INSETS, PLACES, badgeSide, convert, dock, drawerSide, fromPixels, keyboardHeight, mirror, nextPlace, placeKey, placeOf, position,
  rest, span, stepFree, validMode, validPlace, type Box, type Insets, type Place,
} from '../app/utils/chat-dock'

const SIZES = { phone: { w: 360, h: 740 }, laptop: { w: 1280, h: 800 }, wide: { w: 2560, h: 1440 } } as const
const NOTCH: Insets = { top: 44, right: 0, bottom: 34, left: 0 }
const centre = (p: { x: number; y: number }) => ({ x: p.x + BUTTON / 2, y: p.y + BUTTON / 2 })
const inside = (p: { x: number; y: number }, size: { w: number; h: number }, ins: Insets = NO_INSETS) =>
  p.x >= ins.left && p.y >= ins.top && p.x + BUTTON <= size.w - ins.right && p.y + BUTTON <= size.h - ins.bottom

describe('dock: the place for a drop', () => {
  for (const [name, size] of Object.entries(SIZES)) {
    describe(name, () => {
      it('snaps to the nearest edge and keeps the position along it', () => {
        const right = dock({ x: size.w - 90, y: size.h / 2 }, size, NO_INSETS)
        expect(right).toMatchObject({ mode: 'snap', edge: 'right' })
        expect((right as { at: number }).at).toBeGreaterThan(0.4)
        expect((right as { at: number }).at).toBeLessThan(0.6)
        expect(dock({ x: 90, y: size.h / 2 }, size, NO_INSETS)).toMatchObject({ edge: 'left' })
        expect(dock({ x: size.w / 2, y: 90 }, size, NO_INSETS)).toMatchObject({ edge: 'top' })
        expect(dock({ x: size.w / 2, y: size.h - 90 }, size, NO_INSETS)).toMatchObject({ edge: 'bottom' })
      })
      it('takes the corner when dropped near two edges', () => {
        expect(dock({ x: 40, y: size.h - 40 }, size, NO_INSETS)).toMatchObject({ mode: 'snap', edge: 'left', at: 1 })
        expect(dock({ x: size.w - 40, y: 40 }, size, NO_INSETS)).toMatchObject({ mode: 'snap', edge: 'right', at: 0 })
      })
      it('keeps free positions as fractions of the usable area', () => {
        const place = dock({ x: size.w / 2, y: size.h / 2 }, size, NO_INSETS, 'free')
        expect(place.mode).toBe('free')
        const back = rest(place, size, NO_INSETS)
        expect(Math.abs(centre(back).x - size.w / 2)).toBeLessThan(2)
        expect(Math.abs(centre(back).y - size.h / 2)).toBeLessThan(2)
      })
    })
  }

  it('breaks a tie towards the left and right edges', () => {
    const size = { w: 400, h: 400 }
    expect(dock({ x: 100, y: 100 }, size, NO_INSETS, 'snap')).toMatchObject({ mode: 'snap', edge: 'left' })
    // 200/200 from every edge: the centre of a square window is a tie of all four
    expect(dock({ x: 200, y: 200 }, size, NO_INSETS)).toMatchObject({ edge: 'left' })
  })
})

describe('rest: a place in pixels', () => {
  for (const [name, size] of Object.entries(SIZES)) {
    it(`${name}: every place of the picker is inside the window and off the safe areas`, () => {
      for (const p of PLACES) {
        const at = rest(placeOf(p.key), size, NOTCH)
        expect(inside(at, size, NOTCH)).toBe(true)
        expect(at.y).toBeGreaterThanOrEqual(NOTCH.top)
        expect(at.y + BUTTON).toBeLessThanOrEqual(size.h - NOTCH.bottom)
      }
    })
  }

  it('keeps the middle of the right edge through a rotation', () => {
    const place: Place = { mode: 'snap', edge: 'right', at: 0.5 }
    const portrait = rest(place, SIZES.phone, NO_INSETS)
    const landscape = rest(place, { w: 740, h: 360 }, NO_INSETS)
    expect(portrait.x + BUTTON + MARGIN).toBe(SIZES.phone.w)
    expect(landscape.x + BUTTON + MARGIN).toBe(740)
    expect(Math.abs(centre(portrait).y - SIZES.phone.h / 2)).toBeLessThan(1)
    expect(Math.abs(centre(landscape).y - 180)).toBeLessThan(1)
  })

  it('stays inside a window smaller than the button area', () => {
    const at = rest({ mode: 'snap', edge: 'right', at: 1 }, { w: 60, h: 60 }, NO_INSETS)
    expect(Number.isFinite(at.x) && Number.isFinite(at.y)).toBe(true)
  })

  it('rests above the keyboard while it is open', () => {
    const size = SIZES.phone
    const place: Place = { mode: 'snap', edge: 'bottom', at: 0.5 }
    const open = rest(place, size, NOTCH, [], 300)
    expect(open.y + BUTTON).toBeLessThanOrEqual(size.h - 300)
    expect(rest(place, size, NOTCH).y + BUTTON).toBeGreaterThan(size.h - 300)
    expect(span(size, NOTCH, 300).maxY).toBeLessThan(span(size, NOTCH).maxY)
  })

  describe('avoidance', () => {
    const size = SIZES.phone
    const place: Place = { mode: 'snap', edge: 'right', at: 0.5 }
    const home = rest(place, size, NO_INSETS)
    const composer: Box = { x: 200, y: home.y - 10, w: 150, h: 60 }

    it('slides along the edge to the nearest free slot', () => {
      const moved = rest(place, size, NO_INSETS, [composer])
      expect(moved.x).toBe(home.x)
      expect(moved.y).not.toBe(home.y)
      expect(moved.y + BUTTON <= composer.y || moved.y >= composer.y + composer.h).toBe(true)
      expect(inside(moved, size)).toBe(true)
    })
    it('is transient: without the obstacle the stored place gives the same spot again', () => {
      rest(place, size, NO_INSETS, [composer])
      expect(rest(place, size, NO_INSETS)).toEqual(home)
    })
    it('falls back to the opposite edge when its own edge is full', () => {
      const wall: Box = { x: size.w - 100, y: 0, w: 100, h: size.h }
      const moved = rest(place, size, NO_INSETS, [wall])
      expect(moved.x).toBe(position({ mode: 'snap', edge: 'left', at: 0.5 }, size, NO_INSETS).x)
    })
    it('keeps its place when every edge is full', () => {
      const all: Box = { x: 0, y: 0, w: size.w, h: size.h }
      expect(rest(place, size, NO_INSETS, [all])).toEqual(home)
    })
    it('avoids the toolbar on the top edge by sliding sideways', () => {
      const bar: Box = { x: 100, y: 0, w: 160, h: 64 }
      const moved = rest({ mode: 'snap', edge: 'top', at: 0.5 }, size, NO_INSETS, [bar])
      expect(moved.x + BUTTON <= bar.x || moved.x >= bar.x + bar.w).toBe(true)
    })
  })
})

describe('free mode and conversions', () => {
  it('clamps a free place inside the safe area', () => {
    const at = rest({ mode: 'free', x: 5, y: -3 } as Place, SIZES.phone, NOTCH)
    expect(inside(at, SIZES.phone, NOTCH)).toBe(true)
  })
  it('changing mode keeps the button where it rests', () => {
    const size = SIZES.laptop
    const snap: Place = { mode: 'snap', edge: 'right', at: 0.3 }
    const free = convert(snap, 'free', size, NO_INSETS)
    expect(free.mode).toBe('free')
    expect(rest(free, size, NO_INSETS)).toEqual(rest(snap, size, NO_INSETS))
    expect(convert(free, 'snap', size, NO_INSETS)).toMatchObject({ mode: 'snap', edge: 'right' })
  })
})

describe('migration of the old pixel key', () => {
  it('converts the old bubble position once to an edge and a fraction', () => {
    const size = SIZES.phone
    const place = fromPixels({ x: 280, y: 300 }, size, NO_INSETS)
    expect(place).toMatchObject({ mode: 'snap', edge: 'right' })
    expect(inside(rest(place!, size, NO_INSETS), size)).toBe(true)
  })
  it('converts to free fractions when the mode is free', () => {
    expect(fromPixels({ x: 100, y: 100 }, SIZES.phone, NO_INSETS, 'free')).toMatchObject({ mode: 'free' })
  })
  it('ignores junk', () => {
    expect(fromPixels(null, SIZES.phone, NO_INSETS)).toBeNull()
    expect(fromPixels({ x: 'a', y: 2 }, SIZES.phone, NO_INSETS)).toBeNull()
    expect(fromPixels({ x: Number.NaN, y: 2 }, SIZES.phone, NO_INSETS)).toBeNull()
  })
})

describe('validation of stored values', () => {
  it('accepts a good place and clamps the fraction', () => {
    expect(validPlace({ mode: 'snap', edge: 'left', at: 2 })).toEqual({ mode: 'snap', edge: 'left', at: 1 })
    expect(validPlace({ mode: 'free', x: 0.2, y: 0.9 })).toEqual({ mode: 'free', x: 0.2, y: 0.9 })
  })
  it('falls back to the default on anything else', () => {
    for (const bad of [null, 3, 'x', {}, { mode: 'snap', edge: 'middle', at: 0.5 }, { mode: 'snap', edge: 'left' }, { mode: 'free', x: 'a', y: 1 }, { mode: 'snap', edge: 'left', at: Number.NaN }]) {
      expect(validPlace(bad)).toEqual(DEFAULT_PLACE)
    }
  })
  it('the default is the lower third of the right edge', () => {
    expect(DEFAULT_PLACE).toMatchObject({ mode: 'snap', edge: 'right' })
    expect((DEFAULT_PLACE as { at: number }).at).toBeGreaterThan(2 / 3)
  })
  it('a mode is snap unless it is free', () => {
    expect(validMode('free')).toBe('free')
    expect(validMode('snap')).toBe('snap')
    expect(validMode(7)).toBe('snap')
  })
})

describe('move mode', () => {
  it('jumps to the next place of the eight in snap mode', () => {
    const middle: Place = { mode: 'snap', edge: 'right', at: 0.5 }
    expect(nextPlace(middle, 'left')).toEqual({ mode: 'snap', edge: 'left', at: 0.5 }) // the centre cell is skipped
    expect(nextPlace(middle, 'up')).toEqual({ mode: 'snap', edge: 'top', at: 1 })
    expect(nextPlace(middle, 'down')).toEqual({ mode: 'snap', edge: 'bottom', at: 1 })
    expect(nextPlace(middle, 'right')).toEqual(middle) // the border stops
    expect(nextPlace({ mode: 'snap', edge: 'top', at: 0.5 }, 'down')).toEqual({ mode: 'snap', edge: 'bottom', at: 0.5 })
  })
  it('every place of the picker is reachable with the arrows', () => {
    const seen = new Set<string>()
    const walk = (p: Place, depth: number) => {
      const k = placeKey(p)
      if (!k || depth > 6) return
      seen.add(k)
      for (const d of ['left', 'right', 'up', 'down'] as const) { const n = nextPlace(p, d); if (JSON.stringify(n) !== JSON.stringify(p)) walk(n, depth + 1) }
    }
    walk(placeOf('right'), 0)
    expect([...seen].sort()).toEqual(PLACES.map((p) => p.key).sort())
  })
  it('moves 24 px in free mode and stays inside the usable area', () => {
    const size = SIZES.laptop
    const start: Place = { mode: 'free', x: 0.5, y: 0.5 }
    const before = rest(start, size, NO_INSETS)
    const after = rest(stepFree(start, 'left', size, NO_INSETS), size, NO_INSETS)
    expect(before.x - after.x).toBeCloseTo(24, 5)
    expect(after.y).toBeCloseTo(before.y, 5)
    const wall = rest(stepFree({ mode: 'free', x: 0, y: 0 }, 'up', size, NO_INSETS), size, NO_INSETS)
    expect(wall.y).toBe(MARGIN)
  })
})

describe('badge, drawer and picker helpers', () => {
  it('puts the badge on the inner corner of every edge and corner', () => {
    expect(badgeSide({ mode: 'snap', edge: 'right', at: 0.5 }).h).toBe('left')
    expect(badgeSide({ mode: 'snap', edge: 'left', at: 0.5 }).h).toBe('right')
    expect(badgeSide({ mode: 'snap', edge: 'top', at: 0.5 }).v).toBe('bottom')
    expect(badgeSide({ mode: 'snap', edge: 'bottom', at: 0.5 }).v).toBe('top')
    expect(badgeSide({ mode: 'snap', edge: 'right', at: 0 })).toEqual({ h: 'left', v: 'bottom' })
    expect(badgeSide({ mode: 'snap', edge: 'bottom', at: 1 })).toEqual({ h: 'left', v: 'top' })
    expect(badgeSide({ mode: 'free', x: 0.9, y: 0.1 })).toEqual({ h: 'left', v: 'bottom' })
  })
  it('opens the drawer on the side of the button, else on the chosen side', () => {
    expect(drawerSide('snap', { mode: 'snap', edge: 'left', at: 0.5 }, 'right')).toBe('left')
    expect(drawerSide('snap', { mode: 'snap', edge: 'right', at: 0.5 }, 'left')).toBe('right')
    expect(drawerSide('snap', { mode: 'snap', edge: 'top', at: 0.5 }, 'left')).toBe('left')
    expect(drawerSide('free', { mode: 'free', x: 0.1, y: 0.1 }, 'right')).toBe('right')
  })
  it('mirrors a place to the other side', () => {
    expect(mirror({ mode: 'snap', edge: 'right', at: 0.8 })).toEqual({ mode: 'snap', edge: 'left', at: 0.8 })
    expect(mirror({ mode: 'snap', edge: 'top', at: 0.2 })).toEqual({ mode: 'snap', edge: 'top', at: 0.8 })
  })
  it('finds the picker place that matches', () => {
    expect(placeKey({ mode: 'snap', edge: 'bottom', at: 1 })).toBe('bottom-right')
    expect(placeKey({ mode: 'snap', edge: 'right', at: 0.52 })).toBe('right')
    expect(placeKey({ mode: 'snap', edge: 'right', at: 0.8 })).toBeNull()
    expect(placeKey({ mode: 'free', x: 0.5, y: 0.5 })).toBeNull()
  })
  it('detects the soft keyboard from the visual viewport', () => {
    expect(keyboardHeight(740, 740)).toBe(0)
    expect(keyboardHeight(740, 420)).toBe(320)
    expect(keyboardHeight(740, 0)).toBe(0)
    expect(keyboardHeight(740, 600)).toBe(0) // a collapsing address bar is not a keyboard
  })
})
