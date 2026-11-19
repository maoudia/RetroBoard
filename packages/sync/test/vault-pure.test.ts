/** The pure parts of the vault engine, pinned edge by edge: names, `info.json`, board segments and the manifest parser. */
import { describe, expect, it } from 'vitest'
import {
  BACKOFF_MAX_MS, type BoardEvent, type InfoDoc, MAX_SEGMENT_BYTES, RETIRE_AFTER_MS, VaultError, boardCodec, emptyMemory, isDeviceId, isInfoCopy, isStreamId,
  mergeInfo, parseInfo, parseManifest, parseManifestPath, sameInfo,
} from '../src'
import { INFO } from './vault-helpers'

describe('names', () => {
  it('a device id is 4 to 13 lowercase letters or digits and nothing around them', () => {
    for (const ok of ['abcd', 'a1b2c3d4e5f6g', '0000']) expect(isDeviceId(ok)).toBe(true)
    for (const bad of ['abc', 'a1b2c3d4e5f6gh', 'ABCD', '!abcd', 'abcd!', 'ab-cd', '']) expect(isDeviceId(bad)).toBe(false)
  })

  it('a stream id is 26 lowercase base32 characters and nothing around them', () => {
    expect(isStreamId('a2b3c4d5e6f7g2h3i4j5k6l7m2')).toBe(true)
    for (const bad of ['a2b3c4d5e6f7g2h3i4j5k6l781', 'a2b3c4d5e6f7g2h3i4j5k6l7m9']) expect(isStreamId(bad)).toBe(false)
    for (const bad of ['a2b3c4d5e6f7g2h3i4j5k6l7m', 'a2b3c4d5e6f7g2h3i4j5k6l7m2a', '!a2b3c4d5e6f7g2h3i4j5k6l7m2', 'a2b3c4d5e6f7g2h3i4j5k6l7m2!', 'A2b3c4d5e6f7g2h3i4j5k6l7m2']) expect(isStreamId(bad)).toBe(false)
  })

  it('a manifest path is m/<device>.rbm or a copy of it, and nothing around it', () => {
    expect(parseManifestPath('m/aaaaaaaaaaaaa.rbm')).toEqual({ device: 'aaaaaaaaaaaaa', copy: false })
    expect(parseManifestPath('m/aaaaaaaaaaaaa.copy-0a1b2c3d.rbm')).toEqual({ device: 'aaaaaaaaaaaaa', copy: true })
    for (const bad of ['x/m/aaaaaaaaaaaaa.rbm', 'm/aaaaaaaaaaaaa.rbm.bak', 'm/aaaaaaaaaaaaa.copy-0a1b2c3.rbm', 'm/aaaaaaaaaaaaa.copy-0a1b2c3dd.rbm', 'm/aaaaaaaaaaaaa.copy-0A1B2C3D.rbm', 'm/ab.rbm', 'm/aaaaaaaaaaaaaaaa.rbm']) {
      expect(parseManifestPath(bad)).toBeNull()
    }
  })

  it('a copy of info.json is info.copy-<8 hex>.json and nothing around it', () => {
    expect(isInfoCopy('info.copy-0a1b2c3d.json')).toBe(true)
    for (const bad of ['xinfo.copy-0a1b2c3d.json', 'info.copy-0a1b2c3d.json.tmp', 'info.copy-0a1b2c3.json', 'info.copy-0a1b2c3dd.json', 'info.copy-0A1B2C3D.json', 'info.json']) expect(isInfoCopy(bad)).toBe(false)
  })
})

describe('limits', () => {
  it('are the documented ones', () => {
    expect(RETIRE_AFTER_MS).toBe(86_400_000)
    expect(MAX_SEGMENT_BYTES).toBe(3 * 1024 * 1024)
    expect(BACKOFF_MAX_MS).toBe(600_000)
  })

  it('an empty memory has nothing in flight', () => {
    expect(emptyMemory()).toEqual({
      v: 1, highestInfoTime: 0, seq: 0, own: { segments: [], checkpoints: [], manifestSeq: 0, dirty: false },
      pending: [], known: {}, streams: {}, manifests: {}, opened: [], waiting: {},
    })
  })

  it('a vault error carries its code and its name', () => {
    const e = new VaultError('locked')
    expect([e.code, e.name, e.message, e instanceof Error]).toEqual(['locked', 'VaultError', 'locked', true])
  })
})

describe('parseInfo', () => {
  const doc = (over: Record<string, unknown>) => JSON.stringify({ ...INFO, ...over })

  it('reads a document and hands it back unchanged', () => {
    expect(parseInfo(JSON.stringify(INFO))).toEqual(INFO)
  })

  it('refuses what is not a document, each field on its own', () => {
    const bad: [string, string][] = [
      ['not json', 'not json'], ['null', 'null'], ['a number', '5'], ['a string', '"x"'], ['an array of nothing', '[]'],
      ['version', doc({ version: 1.5 })], ['version missing', doc({ version: undefined })], ['minReader', doc({ minReader: '1' })], ['minReader missing', doc({ minReader: undefined })],
      ['vaultId', doc({ vaultId: 3 })], ['cipher', doc({ cipher: 3 })],
      ['activeKeyId missing', doc({ activeKeyId: undefined })], ['activeKeyId null', doc({ activeKeyId: null })], ['activeKeyId text', doc({ activeKeyId: 'x' })],
      ['activeKeyId without a value', doc({ activeKeyId: { updatedTime: 1 } })], ['activeKeyId without a time', doc({ activeKeyId: { value: 'k' } })],
      ['activeKeyId time as text', doc({ activeKeyId: { value: 'k', updatedTime: '1' } })], ['activeKeyId time infinite', '{"activeKeyId":{"value":"k","updatedTime":1e999}}'],
      ['activeKeyId value a number', doc({ activeKeyId: { value: 3, updatedTime: 1 } })],
      ['wraps missing', doc({ wraps: undefined })], ['wraps an object', doc({ wraps: {} })], ['wraps with null', doc({ wraps: [null] })], ['wraps with text', doc({ wraps: ['password'] })],
      ['wraps without a kind', doc({ wraps: [{ updatedTime: 1 }] })], ['wraps with a kind number', doc({ wraps: [{ kind: 1, updatedTime: 1 }] })],
      ['wraps without a time', doc({ wraps: [{ kind: 'password' }] })], ['wraps with one good and one bad', doc({ wraps: [{ kind: 'password', updatedTime: 1 }, { kind: 'x' }] })],
      ['settings missing', doc({ settings: undefined })], ['settings null', doc({ settings: null })], ['settings text', doc({ settings: 'x' })],
      ['a setting null', doc({ settings: { a: null } })], ['a setting text', doc({ settings: { a: 'x' } })], ['a setting without a time', doc({ settings: { a: { value: 1 } } })],
      ['a setting without a value', doc({ settings: { a: { updatedTime: 1 } } })], ['a setting time as text', doc({ settings: { a: { value: 1, updatedTime: '1' } } })],
      ['one good setting and one bad', doc({ settings: { a: { value: 1, updatedTime: 1 }, b: null } })],
    ]
    for (const [why, text] of bad) expect(parseInfo(text), why).toBeNull()
  })

  it('keeps an extra field of a wrap as it found it', () => {
    const withSalt = { ...INFO, wraps: [{ kind: 'password', updatedTime: 1, salt: 'abc' }] }
    expect(parseInfo(JSON.stringify(withSalt))).toEqual(withSalt)
  })
})

describe('mergeInfo, edge by edge', () => {
  const t = (value: string, updatedTime: number) => ({ value, updatedTime })

  it('lists wraps and settings in key order whatever order they arrived in', () => {
    const a: InfoDoc = { ...INFO, wraps: [{ kind: 'recovery', updatedTime: 1 }, { kind: 'password', updatedTime: 1 }, { kind: 'device', updatedTime: 1 }], settings: { c: t('c', 1), a: t('a', 1) } }
    const b: InfoDoc = { ...INFO, wraps: [{ kind: 'zeta', updatedTime: 1 }], settings: { b: t('b', 1), d: t('d', 1) } }
    const m = mergeInfo(a, b)
    expect(m.wraps.map((w) => w.kind)).toEqual(['device', 'password', 'recovery', 'zeta'])
    expect(Object.keys(m.settings)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('on equal times the larger document wins, the same whichever side it is on', () => {
    const small = t('a', 5)
    const large = t('b', 5)
    for (const [x, y] of [[small, large], [large, small]] as const) {
      const m = mergeInfo({ ...INFO, activeKeyId: x }, { ...INFO, activeKeyId: y })
      expect(m.activeKeyId.value).toBe('b')
    }
  })

  it('on equal documents it keeps the left one, and a later time always wins', () => {
    const left = t('same', 5)
    const right = t('same', 5)
    expect(mergeInfo({ ...INFO, activeKeyId: left }, { ...INFO, activeKeyId: right }).activeKeyId).toBe(left)
    expect(mergeInfo({ ...INFO, activeKeyId: t('zzz', 4) }, { ...INFO, activeKeyId: t('aaa', 5) }).activeKeyId.value).toBe('aaa')
    expect(mergeInfo({ ...INFO, activeKeyId: t('aaa', 5) }, { ...INFO, activeKeyId: t('zzz', 4) }).activeKeyId.value).toBe('aaa')
  })

  it('compares documents by content, whatever order their keys are in, and tells different ones apart', () => {
    const a = { ...INFO, settings: { x: t('1', 1), y: t('2', 2), z: t('3', 3) } }
    const reordered = { ...INFO, settings: { z: t('3', 3), x: t('1', 1), y: t('2', 2) } }
    expect(sameInfo(a, reordered)).toBe(true)
    expect(sameInfo(a, { ...a, settings: { ...a.settings, z: t('3', 4) } })).toBe(false)
    expect(sameInfo({ ...INFO, wraps: [{ kind: 'a', updatedTime: 1 }, { kind: 'b', updatedTime: 1 }] }, { ...INFO, wraps: [{ kind: 'b', updatedTime: 1 }, { kind: 'a', updatedTime: 1 }] })).toBe(false)
    // An array is not an object with the same entries, and its text is not another value's.
    expect(sameInfo({ ...INFO, settings: { x: { value: ['a'] as never, updatedTime: 1 } } }, { ...INFO, settings: { x: { value: { 0: 'a' } as never, updatedTime: 1 } } })).toBe(false)
    expect(sameInfo({ ...INFO, settings: { x: { value: null as never, updatedTime: 1 } } }, { ...INFO, settings: { x: { value: 'null', updatedTime: 1 } } })).toBe(false)
    // Neighbours in an array or an object are told apart: [1, 2] is not [12].
    const withValue = (value: unknown) => ({ ...INFO, settings: { x: { value: value as never, updatedTime: 1 } } })
    expect(sameInfo(withValue([1, 2]), withValue([12]))).toBe(false)
    expect(sameInfo(withValue({ a: 1, b: 2 }), withValue({ a: 1, b: 2 }))).toBe(true)
    expect(sameInfo(withValue({ a: 1, b: { c: 2, d: 3 } }), withValue({ b: { d: 3, c: 2 }, a: 1 }))).toBe(true)
  })
})

describe('boardCodec', () => {
  const ev = (id: string, size: number): BoardEvent => ({ id, data: 'd'.repeat(size) })
  /** The cost of one event of this shape: its data, its id and 32 bytes of punctuation. */
  const cost = (e: BoardEvent) => e.data.length + e.id.length + 32
  const OVERHEAD = 512

  it('keeps events together up to the limit exactly, then starts a new part', () => {
    const [e1, e2, e3] = [ev('e1', 100), ev('e2', 100), ev('e3', 100)] as [BoardEvent, BoardEvent, BoardEvent]
    const exact = OVERHEAD + cost(e1) + cost(e2)
    expect(boardCodec.split([e1, e2, e3], exact)).toEqual([[e1, e2], [e3]])
    expect(boardCodec.split([e1, e2, e3], exact - 1)).toEqual([[e1], [e2], [e3]])
    expect(boardCodec.split([e1, e2, e3], exact + cost(e3))).toEqual([[e1, e2, e3]])
    expect(boardCodec.split([e1, e2, e3], exact + cost(e3) - 1)).toEqual([[e1, e2], [e3]])
  })

  it('never makes an empty part, however small the limit', () => {
    const big = ev('e1', 5000)
    expect(boardCodec.split([big], 10)).toEqual([[big]])
    expect(boardCodec.split([], 10)).toEqual([])
    expect(boardCodec.split([big, ev('e2', 1)], 10)).toEqual([[big], [ev('e2', 1)]])
  })
})

describe('parseManifest', () => {
  const seg = { path: 's/x/aaaa-00000001-aaaaaaaa.rbs', stream: 'library', size: 1024, seq: 1, at: 5 }
  const chk = { path: 's/x/c-aaaaaaaa.rbc', stream: 'library', size: 2048, at: 6, covers: { aaaa: 1 } }
  const good = { v: 1, device: 'aaaa', name: 'Laptop', seq: 3, updatedAt: 9, segments: [seg], checkpoints: [chk] }
  const text = (over: Record<string, unknown>) => JSON.stringify({ ...good, ...over })

  it('reads a manifest with what it names, a retired segment included', () => {
    expect(parseManifest(JSON.stringify(good))).toEqual(good)
    const retired = { ...seg, retiredAt: 7 }
    expect(parseManifest(text({ segments: [retired, seg] }))?.segments).toEqual([retired, seg])
    expect(parseManifest(text({ segments: [{ ...seg, retiredAt: 'x' }] }))?.segments).toEqual([seg])
    expect(parseManifest(text({ segments: [], checkpoints: [{ ...chk, covers: {} }] }))).toEqual({ ...good, segments: [], checkpoints: [{ ...chk, covers: {} }] })
  })

  it('refuses what is not a manifest, each field on its own', () => {
    const bad: [string, string][] = [
      ['not json', '{'], ['null', 'null'], ['an array', '[]'], ['text', '"x"'],
      ['v', text({ v: 2 })], ['device', text({ device: 1 })], ['name', text({ name: 1 })], ['seq text', text({ seq: '3' })], ['seq infinite', '{"v":1,"device":"a","name":"n","seq":1e999,"updatedAt":1,"segments":[],"checkpoints":[]}'],
      ['updatedAt text', text({ updatedAt: '9' })], ['updatedAt missing', text({ updatedAt: undefined })],
      ['segments missing', text({ segments: undefined })], ['segments an object', text({ segments: {} })], ['checkpoints missing', text({ checkpoints: undefined })], ['checkpoints an object', text({ checkpoints: {} })],
      ['a segment null', text({ segments: [null] })], ['a segment path', text({ segments: [{ ...seg, path: 1 }] })], ['a segment stream', text({ segments: [{ ...seg, stream: 1 }] })],
      ['a segment size', text({ segments: [{ ...seg, size: '1' }] })], ['a segment seq', text({ segments: [{ ...seg, seq: '1' }] })], ['a segment at', text({ segments: [{ ...seg, at: '5' }] })],
      ['a good segment and a bad one', text({ segments: [seg, { ...seg, at: null }] })],
      ['a checkpoint null', text({ checkpoints: [null] })], ['a checkpoint path', text({ checkpoints: [{ ...chk, path: 1 }] })], ['a checkpoint stream', text({ checkpoints: [{ ...chk, stream: 1 }] })],
      ['a checkpoint size', text({ checkpoints: [{ ...chk, size: '2' }] })], ['a checkpoint at', text({ checkpoints: [{ ...chk, at: '6' }] })],
      ['a checkpoint without covers', text({ checkpoints: [{ ...chk, covers: undefined }] })], ['a checkpoint with null covers', text({ checkpoints: [{ ...chk, covers: null }] })],
      ['a checkpoint with text covers', text({ checkpoints: [{ ...chk, covers: 'x' }] })], ['covers with a bad value', text({ checkpoints: [{ ...chk, covers: { aaaa: 1, bbbb: 'x' } }] })],
      ['a good checkpoint and a bad one', text({ checkpoints: [chk, { ...chk, size: null }] })],
    ]
    for (const [why, body] of bad) expect(parseManifest(body), why).toBeNull()
  })
})
