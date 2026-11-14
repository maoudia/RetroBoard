import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  type Library, type StampedMap, type WorkspaceDoc, STAMP_DRIFT_MS, clampStamped, libraryCodec, mergeIncoming, mergeIncomingLibrary, mergeStamped, parseLibraryRecord, recordEdits,
  saveEntry, stampedCodec, valuesOf, workspaceCodec, forgetEntry, mergeLibrary,
} from '../src'

const NOW = 1_700_000_000_000
const YEAR = 365 * 24 * 3600 * 1000
const at = (n: number, device = 'd1') => ({ at: n, device })
const entry = (id: string, device = 'd1', now = NOW) => saveEntry({}, { boardId: id, title: `Title ${id}`, role: 'facilitator', origin: 'created', fragment: '#f', hasPasscode: false }, now, device)

describe('remote stamps are clamped and local edits tick above what they replace', () => {
  it('a clock one year ahead cannot pin a setting', () => {
    const local: StampedMap = { locale: { value: 'fr', stamp: at(NOW - 10) } }
    const far: StampedMap = { locale: { value: 'en', stamp: at(NOW + YEAR, 'far') } }
    const merged = mergeIncoming(local, far, NOW)
    expect(merged.locale).toEqual({ value: 'en', stamp: at(NOW + STAMP_DRIFT_MS, 'far') })
    // The person changes it back on this device: the edit stamps above the clamped one and wins.
    const edited = recordEdits(merged, { locale: 'fr' }, NOW + 5, 'd1')
    expect(edited.locale!.value).toBe('fr')
    expect(edited.locale!.stamp.at).toBe(NOW + STAMP_DRIFT_MS + 1)
    // Later again, on the device with the wrong clock: its old write is behind.
    expect(mergeStamped(merged, edited).locale!.value).toBe('fr')
  })

  it('clamps only what is past the allowance', () => {
    const near = { value: 1, stamp: at(NOW + STAMP_DRIFT_MS) }
    expect(clampStamped(near, NOW)).toBe(near)
    expect(clampStamped({ value: 1, stamp: at(NOW + STAMP_DRIFT_MS + 1) }, NOW).stamp.at).toBe(NOW + STAMP_DRIFT_MS)
  })

  it('a local edit ticks above the stamp it replaces even when this clock runs behind', () => {
    const map: StampedMap = { motion: { value: 'on', stamp: at(NOW + 5000, 'other') } }
    const edited = recordEdits(map, { motion: 'off' }, NOW, 'me')
    expect(edited.motion).toEqual({ value: 'off', stamp: at(NOW + 5001, 'me') })
  })

  it('records only what changed, adds new keys, and leaves keys it was not given', () => {
    const map: StampedMap = { a: { value: 1, stamp: at(5) }, b: { value: { x: [1, 2] }, stamp: at(5) }, keep: { value: 'k', stamp: at(5) } }
    const out = recordEdits(map, { a: 1, b: { x: [1, 2] }, c: 'new', gone: undefined }, 100, 'me')
    expect(out.a).toBe(map.a)
    expect(out.b).toBe(map.b)
    expect(out.keep).toBe(map.keep)
    expect(out.c).toEqual({ value: 'new', stamp: at(100, 'me') })
    expect(Object.keys(out)).not.toContain('gone')
    expect(recordEdits(map, { a: 2 }, 100, 'me').a!.value).toBe(2)
  })

  it('takes plain values back out for the keys in a list', () => {
    const map: StampedMap = { a: { value: 1, stamp: at(1) }, b: { value: 2, stamp: at(1) } }
    expect(valuesOf(map, ['a', 'zz'])).toEqual({ a: 1 })
    expect(valuesOf({ ['__proto__']: { value: 1, stamp: at(1) } } as StampedMap, ['__proto__'])).toEqual({ ['__proto__']: 1 })
  })

  it('merging remote changes in any order gives the same map', () => {
    // One device never writes two values under one stamp, so the value follows from the stamp.
    const stamped = fc.record({ at: fc.integer({ min: 0, max: 5 }), device: fc.constantFrom('a', 'b') }).map((stamp) => ({ value: `${stamp.device}${stamp.at}`, stamp }))
    fc.assert(fc.property(fc.dictionary(fc.constantFrom('x', 'y', 'z'), stamped), fc.dictionary(fc.constantFrom('x', 'y', 'z'), stamped), (a, b) => {
      expect(mergeIncoming(a, b, 1_000_000)).toEqual(mergeIncoming(b, a, 1_000_000))
    }))
  })
})

describe('library from another device', () => {
  it('clamps stamps, and a tombstone beats an older put whichever arrives first', () => {
    const put = entry('b1', 'phone', NOW - 1000)
    const gone = forgetEntry(put, 'b1', NOW, 'laptop')
    expect(mergeIncomingLibrary(put, gone, NOW)).toEqual(mergeIncomingLibrary(gone, put, NOW))
    expect(mergeIncomingLibrary(put, gone, NOW)['b1']).toMatchObject({ forgotten: true })
    const far: Library = { b2: { ...entry('b2')['b2']!, stamp: at(NOW + YEAR, 'far') } }
    expect(mergeIncomingLibrary({}, far, NOW)['b2']!.stamp).toEqual(at(NOW + STAMP_DRIFT_MS, 'far'))
    expect(mergeIncomingLibrary({}, entry('b3'), NOW)['b3']).toBeDefined()
    expect(mergeLibrary({}, {})).toEqual({})
  })
})

describe('stream codecs', () => {
  const lib = { ...entry('b1'), ...entry('b2', 'd2', NOW + 5) }

  it('library: tokens order by stamp then activity, pick and split by key, parse refuses what is not a record', () => {
    const idx = libraryCodec.index(lib)
    expect(Object.keys(idx).sort()).toEqual(['b1', 'b2'])
    expect(idx.b2! > idx.b1!).toBe(true)
    expect(libraryCodec.pick(lib, ['b2', 'nope'])).toEqual({ b2: lib.b2 })
    expect(libraryCodec.split(lib, 100_000)).toEqual([lib])
    expect(libraryCodec.split(lib, 10).map((p) => Object.keys(p))).toEqual([['b1'], ['b2']])
    expect(libraryCodec.split({}, 10)).toEqual([])
    expect(libraryCodec.parse(JSON.parse(JSON.stringify(lib)))).toEqual(lib)
    expect(libraryCodec.parse({ b1: { ...lib.b1, boardId: 'other' } })).toBeNull()
    expect(libraryCodec.parse({ b1: 5 })).toBeNull()
    expect(libraryCodec.parse([])).toBeNull()
    expect(libraryCodec.parse(null)).toBeNull()
    expect(parseLibraryRecord(lib.b1)).toEqual(lib.b1)
  })

  it('library: a bigger activity time is a newer token, so a merge that only raised it is pushed', () => {
    const a = entry('b1')
    const b = { b1: { ...a.b1!, lastActivityAt: a.b1!.lastActivityAt + 1 } }
    expect(libraryCodec.index(b).b1! > libraryCodec.index(a).b1!).toBe(true)
  })

  const map: StampedMap = { locale: { value: 'fr', stamp: at(5) }, name: { value: 'Ada', stamp: at(7, 'd2') } }
  it('settings and identity: a token per key, parse keeps value and stamp only', () => {
    expect(stampedCodec.index(map)).toEqual({ locale: `${'5'.padStart(16, '0')}:d1`, name: `${'7'.padStart(16, '0')}:d2` })
    expect(stampedCodec.pick(map, ['name'])).toEqual({ name: map.name })
    expect(stampedCodec.split(map, 20).length).toBe(2)
    expect(stampedCodec.split(map, 10_000)).toEqual([map])
    expect(stampedCodec.parse({ a: { value: 1, stamp: { at: 1, device: 'x', extra: 1 } } })).toEqual({ a: { value: 1, stamp: at(1, 'x') } })
    for (const bad of [null, [], { a: 1 }, { a: { value: 1 } }, { a: { stamp: at(1) } }, { a: { value: 1, stamp: { at: 'x', device: 'd' } } }, { a: { value: 1, stamp: { at: 1, device: 2 } } }]) expect(stampedCodec.parse(bad), JSON.stringify(bad)).toBeNull()
    expect(Object.keys(stampedCodec.parse(JSON.parse('{"__proto__":{"value":1,"stamp":{"at":1,"device":"d"}}}'))!)).toEqual(['__proto__'])
  })

  const team = { id: 't1', name: 'Alpha', emoji: '🚀', color: '#fff' }
  const retro = { boardId: 'b1', teamId: 't1', project: null, title: 'T', at: 9, actions: [] }
  const ws: WorkspaceDoc = { teams: { t1: { value: team, stamp: at(3) } }, retros: [retro], owners: ['Ada', 'Bob'] }
  it('workspace: items for teams, retros and owners, picked and split by key', () => {
    const idx = workspaceCodec.index(ws)
    expect(Object.keys(idx).sort()).toEqual(['o:Ada', 'o:Bob', 'r:b1', 't:t1'])
    expect(workspaceCodec.pick(ws, ['t:t1', 'o:Bob'])).toEqual({ teams: ws.teams, retros: [], owners: ['Bob'] })
    expect(workspaceCodec.pick(ws, ['r:b1'])).toEqual({ teams: {}, retros: [retro], owners: [] })
    expect(workspaceCodec.split(ws, 100_000)).toEqual([ws])
    const parts = workspaceCodec.split(ws, 50)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.flatMap((p) => p.owners).sort()).toEqual(['Ada', 'Bob'])
    expect(workspaceCodec.parse(JSON.parse(JSON.stringify(ws)))).toEqual(ws)
    const newer = { ...retro, at: 10 }
    expect(workspaceCodec.index({ ...ws, retros: [newer] })['r:b1']! > idx['r:b1']!).toBe(true)
  })

  it('workspace: parse refuses a shape that is not one', () => {
    const bad: unknown[] = [null, {}, { teams: [], retros: [], owners: [] }, { ...ws, retros: [{ boardId: 'b' }] }, { ...ws, owners: [1] }, { ...ws, teams: { t2: ws.teams.t1 } },
      { ...ws, teams: { t1: { value: { id: 't1' }, stamp: at(1) } } }, { ...ws, teams: { t1: { value: team } } }, { ...ws, retros: [{ ...retro, project: 5 }] }, { ...ws, retros: [{ ...retro, actions: 'x' }] }]
    for (const b of bad) expect(workspaceCodec.parse(b), JSON.stringify(b)).toBeNull()
    expect(workspaceCodec.parse({ ...ws, retros: [{ ...retro, project: 'P' }] })).not.toBeNull()
  })
})
