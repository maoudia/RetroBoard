import { describe, expect, it } from 'vitest'
import { createBoard, reduce } from '../src'
import { fnv1a, ROOM_WORD_COUNT, roomWordList, roomWords } from '../src/access/room-words'
import { ids } from '@retroboard/testkit'

describe('room words', () => {
  it('has 128 distinct, lowercase ASCII words per language', () => {
    for (const l of ['fr', 'en'] as const) {
      const list = roomWordList(l)
      expect(list).toHaveLength(ROOM_WORD_COUNT)
      expect(new Set(list).size).toBe(ROOM_WORD_COUNT)
      expect(list.every((w) => /^[a-z]{2,12}$/.test(w))).toBe(true)
    }
  })

  it('is deterministic per room and language, and differs between rooms', () => {
    const a = roomWords('Ab3dEfGhIjKlMnOpQrStUv', 'fr')
    expect(roomWords('Ab3dEfGhIjKlMnOpQrStUv', 'fr')).toEqual(a)
    expect(roomWords('Zz3dEfGhIjKlMnOpQrStUv', 'fr')).not.toEqual(a)
    expect(roomWords('Ab3dEfGhIjKlMnOpQrStUv', 'en').every((w) => roomWordList('en').includes(w))).toBe(true)
  })

  it('uses 7 bits per word from FNV-1a', () => {
    // Reference values of FNV-1a 32-bit.
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
    const h = fnv1a('room-x')
    const list = roomWordList('en')
    expect(roomWords('room-x', 'en')).toEqual([list[h & 127], list[(h >>> 7) & 127], list[(h >>> 14) & 127]])
  })

  it('spreads rooms over many combinations', () => {
    const seen = new Set(Array.from({ length: 2000 }, (_, i) => roomWords(`room-${i}-padding-xyz`, 'fr').join('-')))
    expect(seen.size).toBeGreaterThan(1990)
  })

  it('the board remembers the language it was created in', () => {
    const s0 = createBoard({ newId: ids() })
    const r = reduce(s0, { t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', locale: 'en' }, { cid: 'c', name: null, showName: false }, { now: 1, newId: ids() })
    expect(r.ok && r.state.settings.locale).toBe('en')
  })
})
