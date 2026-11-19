import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  type InfoDoc, VaultError, boardCodec, boardOfStream, boardStream, checkpointPath, infoTime, isBoardStream, isDeviceId, isInfoCopy, isStreamId, manifestPath,
  mergeEvents, mergeInfo, parseInfo, parseManifestPath, sameInfo, segmentPath, streamPrefix,
} from '../src'
import { INFO } from './vault-helpers'

const timed = fc.record({ value: fc.oneof(fc.string({ maxLength: 4 }), fc.integer({ min: 0, max: 5 }), fc.boolean()), updatedTime: fc.integer({ min: 0, max: 5 }) })
const info: fc.Arbitrary<InfoDoc> = fc.record({
  version: fc.integer({ min: 1, max: 2 }), minReader: fc.integer({ min: 1, max: 2 }), vaultId: fc.constant('v'), cipher: fc.constant('aes-256-gcm'),
  activeKeyId: fc.record({ value: fc.string({ maxLength: 3 }), updatedTime: fc.integer({ min: 0, max: 5 }) }),
  wraps: fc.array(fc.record({ kind: fc.constantFrom('password', 'recovery'), updatedTime: fc.integer({ min: 0, max: 5 }), salt: fc.string({ maxLength: 3 }) }), { maxLength: 3 }),
  settings: fc.dictionary(fc.constantFrom('a', 'b', 'c', '__proto__'), timed),
})

describe('mergeInfo', () => {
  it('is commutative, associative and idempotent: devices converge whatever order the copies arrive in', () => {
    fc.assert(fc.property(info, info, info, (a, b, c) => {
      expect(sameInfo(mergeInfo(a, b), mergeInfo(b, a))).toBe(true)
      expect(sameInfo(mergeInfo(mergeInfo(a, b), c), mergeInfo(a, mergeInfo(b, c)))).toBe(true)
      expect(sameInfo(mergeInfo(a, a), mergeInfo(mergeInfo(a, a), a))).toBe(true)
    }))
  })

  it('takes each property from the side that changed it last, and the highest format versions', () => {
    const a = { ...INFO, settings: { x: { value: 'a', updatedTime: 5 }, y: { value: 'a', updatedTime: 1 } } }
    const b = { ...INFO, version: 2, minReader: 2, activeKeyId: { value: 'new', updatedTime: 9 }, wraps: [{ kind: 'password', updatedTime: 4 }, { kind: 'recovery', updatedTime: 2 }], settings: { x: { value: 'b', updatedTime: 2 }, y: { value: 'b', updatedTime: 3 } } }
    const m = mergeInfo(a, b)
    expect(m.settings).toEqual({ x: { value: 'a', updatedTime: 5 }, y: { value: 'b', updatedTime: 3 } })
    expect([m.version, m.minReader, m.activeKeyId.value]).toEqual([2, 2, 'new'])
    expect(m.wraps).toEqual([{ kind: 'password', updatedTime: 4 }, { kind: 'recovery', updatedTime: 2 }])
    expect(infoTime(m)).toBe(9)
  })

  it('does not merge two vaults', () => {
    expect(() => mergeInfo(INFO, { ...INFO, vaultId: 'other' })).toThrow(VaultError)
    expect(() => mergeInfo(INFO, { ...INFO, vaultId: 'other' })).toThrow('wrong-vault')
  })

  it('compares documents whatever order their fields are in', () => {
    expect(sameInfo(INFO, { settings: {}, wraps: INFO.wraps, activeKeyId: INFO.activeKeyId, cipher: INFO.cipher, vaultId: INFO.vaultId, minReader: 1, version: 1 })).toBe(true)
    expect(sameInfo(INFO, { ...INFO, version: 2 })).toBe(false)
  })
})

describe('parseInfo', () => {
  it('accepts a document and refuses what is not one: empty, half written, wrong shape', () => {
    expect(parseInfo(JSON.stringify(INFO))).toEqual(INFO)
    for (const bad of ['', '{"version":1', 'null', '[]', '{}', JSON.stringify({ ...INFO, version: '1' }), JSON.stringify({ ...INFO, wraps: [{}] }), JSON.stringify({ ...INFO, settings: { a: 1 } }), JSON.stringify({ ...INFO, activeKeyId: { value: 1, updatedTime: 1 } }), JSON.stringify({ ...INFO, settings: null }), JSON.stringify({ ...INFO, wraps: 'x' })]) {
      expect(parseInfo(bad), bad).toBeNull()
    }
  })
})

describe('names', () => {
  it('builds names that fit 64 characters, lowercase ASCII, with no user data', () => {
    const sid = 'abcdefghijklmnopqrstuvwxyz'.slice(0, 26).replace(/[01]/g, 'a')
    const path = segmentPath(sid, 'abcdefghijklm', 0xffffffff, 'deadbeef')
    expect(path).toBe(`s/${sid}/abcdefghijklm-ffffffff-deadbeef.rbs`)
    expect(path.length).toBeLessThanOrEqual(64)
    expect(checkpointPath(sid, 'deadbeef')).toBe(`s/${sid}/c-deadbeef.rbc`)
    expect(streamPrefix(sid)).toBe(`s/${sid}/`)
    expect(manifestPath('abcd1234')).toBe('m/abcd1234.rbm')
    expect(segmentPath(sid, 'dev1', 1, 'aaaaaaaa')).toContain('-00000001-')
  })

  it('recognises manifests and their conflict copies, and nothing else', () => {
    expect(parseManifestPath('m/abcd1234.rbm')).toEqual({ device: 'abcd1234', copy: false })
    expect(parseManifestPath('m/abcd1234.copy-0a1b2c3d.rbm')).toEqual({ device: 'abcd1234', copy: true })
    for (const bad of ['m/ab.rbm', 'm/abcd1234.copy-xyz.rbm', 'm/ABCD1234.rbm', 'x/abcd1234.rbm', 'm/abcd1234.rbm.tmp']) expect(parseManifestPath(bad), bad).toBeNull()
    expect(isInfoCopy('info.copy-0a1b2c3d.json')).toBe(true)
    expect(isInfoCopy('info.json')).toBe(false)
    expect(isInfoCopy('info.copy-0a1b2c3.json')).toBe(false)
    expect(isDeviceId('abcdefghijklm')).toBe(true)
    expect(isDeviceId('ab')).toBe(false)
    expect(isStreamId('a'.repeat(26))).toBe(true)
    expect(isStreamId('a'.repeat(25))).toBe(false)
  })
})

describe('board stream', () => {
  it('names streams and takes the board id back', () => {
    expect(boardStream('abc')).toBe('board:abc')
    expect(isBoardStream('board:abc')).toBe(true)
    expect(isBoardStream('library')).toBe(false)
    expect(boardOfStream('board:abc')).toBe('abc')
  })

  it('indexes by event id, picks, splits by size and parses untrusted input', () => {
    const events = [{ id: 'a', data: 'x'.repeat(100) }, { id: 'b', data: 'y'.repeat(100) }, { id: 'c', data: 'z' }]
    expect(boardCodec.index(events)).toEqual({ a: '1', b: '1', c: '1' })
    expect(boardCodec.pick(events, ['b', 'zz'])).toEqual([events[1]])
    expect(boardCodec.split(events, 4000)).toEqual([events])
    expect(boardCodec.split(events, 400).length).toBeGreaterThan(1)
    expect(boardCodec.split([], 400)).toEqual([])
    expect(boardCodec.parse(events)).toEqual(events)
    for (const bad of [null, {}, [{ id: 1, data: 'x' }], [{ id: 'a' }], [{ id: '', data: 'x' }], [null]]) expect(boardCodec.parse(bad), JSON.stringify(bad)).toBeNull()
  })

  it('merges by id without duplicates and keeps the first copy', () => {
    expect(mergeEvents([{ id: 'a', data: '1' }], [{ id: 'a', data: '2' }, { id: 'b', data: '3' }, { id: 'b', data: '4' }])).toEqual([{ id: 'a', data: '1' }, { id: 'b', data: '3' }])
  })
})
