import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isSolo, markSolo, unmarkSolo } from '../app/utils/solo'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v) }, removeItem: (k) => { m.delete(k) }, clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size } }
}

describe('the solo registry', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()) })

  it('keeps every solo board: 60 boards later the first one is still solo', () => {
    const rooms = Array.from({ length: 60 }, (_, i) => `room${String(i).padStart(18, '0')}`)
    for (const r of rooms) markSolo(r)
    expect(rooms.every(isSolo)).toBe(true)
    expect(JSON.parse(localStorage.getItem('retroboard:solo')!)).toHaveLength(60)
  })

  it('marks once, and forgets only the room it is asked to forget', () => {
    markSolo('a'); markSolo('a'); markSolo('b')
    expect(JSON.parse(localStorage.getItem('retroboard:solo')!)).toEqual(['a', 'b'])
    unmarkSolo('a')
    expect([isSolo('a'), isSolo('b')]).toEqual([false, true])
  })

  it('treats a missing room as not solo', () => {
    expect([isSolo(null), isSolo(undefined), isSolo('')]).toEqual([false, false, false])
  })

  it('reads the list written before the cap was removed', () => {
    localStorage.setItem('retroboard:solo', JSON.stringify(['old1', 'old2']))
    expect(isSolo('old2')).toBe(true)
    markSolo('new')
    expect(JSON.parse(localStorage.getItem('retroboard:solo')!)).toEqual(['old1', 'old2', 'new'])
  })
})
