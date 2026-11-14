import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  EMPTY_LIBRARY, type Library, type LibraryEntry, type LibraryRecord, type Stamp, archiveEntry, compareStamps, forgetEntry, getEntry, isTombstone,
  libraryEntries, mergeLibrary, mergeRecord, mergeStamped, nextStamp, parseLibraryRecord, saveEntry, touchEntry,
} from '../src'

const entry = (boardId: string, over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  boardId, title: `Board ${boardId}`, role: 'facilitator', origin: 'created', fragment: '#r=x&k=y', hasPasscode: false, solo: false,
  createdAt: 1000, lastActivityAt: 1000, archived: false, keepOffline: true, stamp: { at: 1000, device: 'd1' }, ...over,
})
const base = { boardId: 'room-1', title: 'Sprint 12', role: 'facilitator', origin: 'created', fragment: '#k=1', hasPasscode: false } as const

describe('stamps', () => {
  it('order by time, then device id', () => {
    expect(compareStamps({ at: 2, device: 'a' }, { at: 1, device: 'z' })).toBeGreaterThan(0)
    expect(compareStamps({ at: 1, device: 'b' }, { at: 1, device: 'a' })).toBeGreaterThan(0)
    expect(compareStamps({ at: 1, device: 'a' }, { at: 1, device: 'b' })).toBeLessThan(0)
    expect(compareStamps({ at: 1, device: 'a' }, { at: 1, device: 'a' })).toBe(0)
  })
  it('a local edit ticks above the stamp it replaces, even when the clock runs behind', () => {
    expect(nextStamp(undefined, 500, 'd')).toEqual({ at: 500, device: 'd' })
    expect(nextStamp({ at: 900, device: 'x' }, 500, 'd')).toEqual({ at: 901, device: 'd' })
    expect(nextStamp({ at: 100, device: 'x' }, 500, 'd')).toEqual({ at: 500, device: 'd' })
  })
  it('merges per key, last write winning, and treats "__proto__" as data', () => {
    const a = { k: { value: 1, stamp: { at: 5, device: 'a' } }, only: { value: 7, stamp: { at: 1, device: 'a' } } }
    const b = { k: { value: 2, stamp: { at: 6, device: 'b' } }, ['__proto__']: { value: 3, stamp: { at: 1, device: 'b' } } }
    const merged = mergeStamped(a, JSON.parse(JSON.stringify(b)) as typeof b)
    expect(merged.k!.value).toBe(2)
    expect(merged.only!.value).toBe(7)
    expect(Object.hasOwn(merged, '__proto__')).toBe(true)
    expect(({} as Record<string, unknown>).value).toBeUndefined()
    expect(mergeStamped(b, a).k!.value).toBe(2)
    const tie = { value: 'second', stamp: { at: 5, device: 'a' } }
    const first = { value: 'first', stamp: { at: 5, device: 'a' } }
    expect(mergeStamped({ k: first }, { k: tie }).k).toBe(first)
    expect(mergeStamped({ k: tie }, { k: first }).k).toBe(tie)
  })
})

const stampArb: fc.Arbitrary<Stamp> = fc.record({ at: fc.integer({ min: 1, max: 20 }), device: fc.constantFrom('d1', 'd2', 'd3') })
const recordArb: fc.Arbitrary<LibraryRecord> = fc.oneof(
  fc.record({ stamp: stampArb, lastActivityAt: fc.integer({ min: 0, max: 50 }), title: fc.constantFrom('A', 'B') }).map((r) => entry('b1', r)),
  fc.record({ stamp: stampArb, lastActivityAt: fc.integer({ min: 0, max: 50 }) }).map((r): LibraryRecord => ({ boardId: 'b1', forgotten: true, ...r })),
)

describe('library merge', () => {
  it('is commutative, associative and idempotent (any order of arrival gives the same library)', () => {
    // Two distinct writes never share a stamp in practice (stamps include the device): equal stamps would mean equal writes.
    const distinct = (rs: LibraryRecord[]) => new Set(rs.map((r) => `${r.stamp.at}/${r.stamp.device}`)).size === rs.length
    fc.assert(fc.property(recordArb, recordArb, recordArb, (a, b, c) => {
      fc.pre(distinct([a, b, c]))
      expect(mergeRecord(a, b)).toEqual(mergeRecord(b, a))
      expect(mergeRecord(mergeRecord(a, b), c)).toEqual(mergeRecord(a, mergeRecord(b, c)))
      expect(mergeRecord(a, a)).toEqual(a)
    }), { numRuns: 300 })
  })
  it('a tombstone beats an older put, a newer put beats an older tombstone', () => {
    const put = entry('b1', { stamp: { at: 5, device: 'd1' } })
    const gone = forgetEntry({ b1: put }, 'b1', 9, 'd2').b1!
    expect(isTombstone(mergeRecord(put, gone))).toBe(true)
    expect(isTombstone(mergeRecord(entry('b1', { stamp: { at: 20, device: 'd1' } }), gone))).toBe(false)
  })
  it('keeps the latest activity of both sides whichever write wins', () => {
    const a = entry('b1', { title: 'new title', lastActivityAt: 100, stamp: { at: 10, device: 'd1' } })
    const b = entry('b1', { title: 'old title', lastActivityAt: 500, stamp: { at: 5, device: 'd2' } })
    expect(mergeRecord(a, b)).toMatchObject({ title: 'new title', lastActivityAt: 500 })
    expect(mergeRecord(b, a)).toMatchObject({ title: 'new title', lastActivityAt: 500 })
  })
  it('keeps the first record on an exact tie of stamps, and the winner itself when nothing else changes', () => {
    const a = entry('b1', { title: 'first', stamp: { at: 5, device: 'd1' }, lastActivityAt: 10 })
    const b = entry('b1', { title: 'second', stamp: { at: 5, device: 'd1' }, lastActivityAt: 10 })
    expect(mergeRecord(a, b)).toBe(a)
    expect(mergeRecord(b, a)).toBe(b)
    const newer = entry('b1', { stamp: { at: 9, device: 'd1' }, lastActivityAt: 20 })
    expect(mergeRecord(a, newer)).toBe(newer)
    expect(mergeRecord(newer, a)).toBe(newer)
    expect(mergeRecord(a, newer)).not.toBe(a)
  })
  it('unites two libraries by board id', () => {
    const l1: Library = { a: entry('a'), b: entry('b', { title: 'one' }) }
    const l2: Library = { b: entry('b', { title: 'two', stamp: { at: 2000, device: 'd2' } }), c: entry('c') }
    const merged = mergeLibrary(l1, l2)
    expect(Object.keys(merged).sort()).toEqual(['a', 'b', 'c'])
    expect((merged.b as LibraryEntry).title).toBe('two')
    expect(mergeLibrary(l2, l1)).toEqual(merged)
    expect(mergeLibrary(l1, EMPTY_LIBRARY)).toEqual(l1)
  })
})

describe('library operations', () => {
  it('saves a created board kept offline, not archived, with its times', () => {
    const lib = saveEntry(EMPTY_LIBRARY, base, 5000, 'dev')
    expect(getEntry(lib, 'room-1')).toEqual({ ...base, solo: false, createdAt: 5000, lastActivityAt: 5000, archived: false, keepOffline: true, stamp: { at: 5000, device: 'dev' } })
  })
  it('a joined board is not kept offline unless asked', () => {
    expect(getEntry(saveEntry(EMPTY_LIBRARY, { ...base, origin: 'joined', role: 'participant' }, 1, 'd'), 'room-1')!.keepOffline).toBe(false)
    expect(getEntry(saveEntry(EMPTY_LIBRARY, { ...base, origin: 'joined', keepOffline: true }, 1, 'd'), 'room-1')!.keepOffline).toBe(true)
  })
  it('saving again updates the title and keeps what the person decided and the creation time', () => {
    let lib = saveEntry(EMPTY_LIBRARY, { ...base, solo: true, teamId: 't1' }, 1000, 'd')
    lib = archiveEntry(lib, 'room-1', true, 2000, 'd')
    lib = saveEntry(lib, { ...base, title: 'Renamed', lastActivityAt: 500 }, 3000, 'd')
    expect(getEntry(lib, 'room-1')).toMatchObject({ title: 'Renamed', createdAt: 1000, lastActivityAt: 1000, archived: true, solo: true, stamp: { at: 3000 } })
    expect(getEntry(lib, 'room-1')!.teamId).toBeUndefined()
  })
  it('touching moves the activity forward only, and ignores a board that is not in the library', () => {
    let lib = saveEntry(EMPTY_LIBRARY, base, 1000, 'd')
    lib = touchEntry(lib, 'room-1', 4000, 4000, 'd')
    expect(getEntry(lib, 'room-1')!.lastActivityAt).toBe(4000)
    lib = touchEntry(lib, 'room-1', 100, 4001, 'd')
    expect(getEntry(lib, 'room-1')!.lastActivityAt).toBe(4000)
    expect(touchEntry(lib, 'nope', 1, 1, 'd')).toBe(lib)
  })
  it('orders by activity, newest first, and by board id on a tie, whatever the order they were added in', () => {
    const add = (ids: [string, number][]) => ids.reduce((lib, [boardId, lastActivityAt]) => saveEntry(lib, { ...base, boardId, lastActivityAt }, 1, 'd'), EMPTY_LIBRARY)
    for (const order of [[['x', 10], ['y', 30], ['e', 20], ['c', 20]], [['c', 20], ['e', 20], ['y', 30], ['x', 10]], [['e', 20], ['x', 10], ['c', 20], ['y', 30]]] as [string, number][][]) {
      expect(libraryEntries(add(order)).map((e) => e.boardId)).toEqual(['y', 'c', 'e', 'x'])
    }
    expect(libraryEntries(add([['a', 1], ['b', 2]])).map((e) => e.boardId)).toEqual(['b', 'a'])
  })
  it('ticks a new stamp above the one it replaces, even when the clock is behind', () => {
    const lib = saveEntry(EMPTY_LIBRARY, base, 5000, 'd1')
    expect(getEntry(saveEntry(lib, base, 1000, 'd2'), 'room-1')!.stamp).toEqual({ at: 5001, device: 'd2' })
    expect(getEntry(saveEntry(EMPTY_LIBRARY, base, 1000, 'd2'), 'room-1')!.stamp).toEqual({ at: 1000, device: 'd2' })
  })
  it('lists most recent first, archived ones apart, forgotten ones never', () => {
    let lib = saveEntry(EMPTY_LIBRARY, { ...base, boardId: 'a', lastActivityAt: 10 }, 1, 'd')
    lib = saveEntry(lib, { ...base, boardId: 'b', lastActivityAt: 30 }, 1, 'd')
    lib = saveEntry(lib, { ...base, boardId: 'c', lastActivityAt: 20 }, 1, 'd')
    lib = saveEntry(lib, { ...base, boardId: 'e', lastActivityAt: 20 }, 1, 'd')
    lib = archiveEntry(lib, 'c', true, 2, 'd')
    lib = forgetEntry(lib, 'a', 2, 'd')
    expect(libraryEntries(lib).map((e) => e.boardId)).toEqual(['b', 'e'])
    expect(libraryEntries(lib, { archived: true }).map((e) => e.boardId)).toEqual(['c'])
    expect(archiveEntry(lib, 'nope', true, 1, 'd')).toBe(lib)
    expect(getEntry(lib, 'a')).toBeUndefined()
    expect(getEntry(lib, 'toString')).toBeUndefined()
  })
  it('forgetting keeps a tombstone with the activity time, and does nothing twice or for an unknown board', () => {
    const lib = saveEntry(EMPTY_LIBRARY, base, 1000, 'd')
    const gone = forgetEntry(lib, 'room-1', 2000, 'd')
    expect(gone['room-1']).toEqual({ boardId: 'room-1', forgotten: true, lastActivityAt: 1000, stamp: { at: 2000, device: 'd' } })
    expect(forgetEntry(gone, 'room-1', 3000, 'd')).toBe(gone)
    expect(forgetEntry(gone, 'unknown', 3000, 'd')).toBe(gone)
    expect(forgetEntry(gone, 'constructor', 3000, 'd')).toBe(gone)
    const again = saveEntry(gone, base, 3000, 'd')
    expect(getEntry(again, 'room-1')).toMatchObject({ stamp: { at: 3000 } })
  })
})

describe('parsing a stored record', () => {
  const good = entry('b1', { teamId: 't' })
  it('round-trips an entry and a tombstone, with the optional fields present or absent', () => {
    expect(parseLibraryRecord(JSON.parse(JSON.stringify(good)))).toStrictEqual(good)
    const withTheme = entry('b2', { themeId: 'slate', teamId: 't' })
    expect(parseLibraryRecord(JSON.parse(JSON.stringify(withTheme)))).toStrictEqual(withTheme)
    const bare = entry('b3')
    expect(parseLibraryRecord(JSON.parse(JSON.stringify(bare)))).toStrictEqual(bare)
    expect(Object.keys(parseLibraryRecord(bare)!)).not.toContain('themeId')
    expect(Object.keys(parseLibraryRecord(bare)!)).not.toContain('teamId')
    const t = { boardId: 'b1', forgotten: true, lastActivityAt: 3, stamp: { at: 2, device: 'd' } }
    expect(parseLibraryRecord(t)).toStrictEqual(t)
    expect(parseLibraryRecord({ ...t, extra: 1, title: 'kept out' })).toStrictEqual(t)
  })
  it('refuses anything of another shape', () => {
    const bad: unknown[] = [
      null, undefined, 'x', 1, [], {}, { ...good, boardId: '' }, { ...good, boardId: 3 }, { ...good, stamp: { at: 'x', device: 'd' } }, { ...good, stamp: null }, { ...good, stamp: { at: 1 } },
      { ...good, lastActivityAt: 'x' }, { ...good, title: 3 }, { ...good, fragment: null }, { ...good, createdAt: NaN }, { ...good, role: 'admin' }, { ...good, origin: 'cloned' },
      { ...good, hasPasscode: 'yes' }, { ...good, themeId: 5 }, { ...good, stamp: { at: 1, device: 5 } }, { ...good, stamp: 'now' }, { ...good, stamp: { device: 'd' } }, { ...good, lastActivityAt: undefined }, { ...good, createdAt: '5' }, { ...good, boardId: undefined }, { ...good, solo: 1 }, { ...good, archived: null }, { ...good, keepOffline: undefined }, { ...good, teamId: 5 },
    ]
    for (const b of bad) expect(parseLibraryRecord(b), JSON.stringify(b)).toBeNull()
  })
})
