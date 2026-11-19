/** The vault engine at its edges: each limit, order and guard of a pass pinned with a target that records what the engine asks of it. */
import { describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import { type MemoryTarget, createMemoryTarget } from '@retroboard/testkit'
import {
  BACKOFF_BASE_MS, BACKOFF_MAX_MS, COMPACT_BYTES, COMPACT_SEGMENTS, type EngineMemory, KEPT_CHECKPOINTS, type Manifest, RETIRE_AFTER_MS, type SegmentRef,
  type VaultCrypto, type VaultTarget, boardStream, checkpointPath,
} from '../src'
import { type Device, type Fleet, INFO, type Item, type Kv, fleet } from './vault-helpers'

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v))
const A = 'aaaaaaaaaaaaa'
const B = 'bbbbbbbbbbbbb'
const X = 'xxxxxxxxxxxxx'
const Y = 'yyyyyyyyyyyyy'
const item = (value: string, token: string): Item => ({ value, token })
const kv = (entries: Record<string, [string, string]>): Kv => Object.fromEntries(Object.entries(entries).map(([k, [v, t]]) => [k, item(v, t)]))

interface Spy {
  readonly target: VaultTarget
  readonly lists: string[]
  readonly gets: string[]
  readonly puts: { path: string; ifMatch?: string }[]
  readonly deletes: string[]
  readonly capabilities: { conditionalPut: 'etag' | 'none'; maxObjectBytes: number }
  /** Called before every put; a rejection stands for the put failing. */
  beforePut?: (path: string, bytes: Uint8Array) => Promise<void> | void
  /** Changes what a listing reports. */
  listed?: (o: { path: string; size: number; etag: string; modifiedAt?: number }) => { path: string; size: number; etag: string; modifiedAt?: number }
  /** Replaces what a get returns. */
  fetched?: (path: string, got: { bytes: Uint8Array; etag: string } | null) => { bytes: Uint8Array; etag: string } | null
  reverse: boolean
}

/** A target that records what it is asked, and can be made to misbehave. */
function spy(inner: MemoryTarget): Spy {
  const s: Spy = {
    lists: [], gets: [], puts: [], deletes: [], reverse: false,
    capabilities: { conditionalPut: inner.capabilities.conditionalPut as 'etag' | 'none', maxObjectBytes: inner.capabilities.maxObjectBytes },
    target: null as never,
  }
  const target: VaultTarget = {
    capabilities: s.capabilities,
    async *list(prefix) {
      s.lists.push(prefix)
      const all: { path: string; size: number; etag: string; modifiedAt?: number }[] = []
      for await (const o of inner.list(prefix)) all.push(s.listed ? s.listed(o) : o)
      for (const o of s.reverse ? all.reverse() : all) yield o
    },
    async get(path) {
      s.gets.push(path)
      const got = await inner.get(path)
      return s.fetched ? s.fetched(path, got) : got
    },
    async put(path, bytes, opts) {
      s.puts.push(opts?.ifMatch === undefined ? { path } : { path, ifMatch: opts.ifMatch })
      await s.beforePut?.(path, bytes)
      return inner.put(path, bytes, opts)
    },
    async delete(path) { s.deletes.push(path); await inner.delete(path) },
    stat: (path) => inner.stat(path),
  }
  ;(s as { target: VaultTarget }).target = target
  return s
}

/** A fleet on a fresh target with `info.json` in place. */
async function boot(capabilities?: Parameters<typeof createMemoryTarget>[0]) {
  const target = createMemoryTarget(capabilities)
  const f = await fleet(target)
  await target.put('info.json', enc(INFO))
  return { f, target, spy: spy(target), clock: f.clock }
}

const sidOf = (f: Fleet, stream: string) => f.sealer.streamId(stream)
const memoryOf = (d: Device): EngineMemory => d.memory.current!

async function putCheckpoint(f: Fleet, stream: string, rand: string, state: unknown, covers: Record<string, number> = {}, body?: string) {
  const sid = await sidOf(f, stream)
  const path = checkpointPath(sid, rand)
  const bytes = await f.sealer.seal('chk', sid, body ?? JSON.stringify({ v: 1, stream, state, covers }))
  await f.target.put(path, bytes)
  return { path, size: bytes.length }
}

const segRef = (stream: string, p: { path: string; size: number }, seq: number, at: number): SegmentRef => ({ path: p.path, stream, size: p.size, seq, at })
const manifestOf = (f: Fleet, device: string, doc: Partial<Manifest> = {}) => f.putManifest(`m/${device}.rbm`, { device, ...doc })

describe('info.json in a pass, edge by edge', () => {
  it('rebuilds a missing info.json from a conflict copy, create-only, and removes the copy', async () => {
    const { f, target, spy: s } = await boot()
    await target.delete('info.json')
    await target.put('info.copy-0a1b2c3d.json', enc({ ...INFO, settings: { extra: { value: 1, updatedTime: 4 } } }))
    const a = f.device(A, { target: s.target })
    const report = await a.sync()
    expect(report.info.settings.extra?.value).toBe(1)
    expect(s.puts.filter((p) => p.path === 'info.json')).toEqual([{ path: 'info.json', ifMatch: 'absent' }])
    expect([...target.objects().keys()].filter((p) => p.startsWith('info'))).toEqual(['info.json'])
  })

  it('writes info.json against the etag it read, and without a condition on a target that has none', async () => {
    const stale = async (cap: Parameters<typeof createMemoryTarget>[0]) => {
      const { f, target, spy: s } = await boot(cap)
      const a = f.device(A, { target: s.target })
      await a.sync()
      memoryOf(a).info = { ...INFO, settings: { x: { value: 0, updatedTime: 3 } } }
      delete memoryOf(a).infoEtag
      const etag = (await target.stat('info.json'))!.etag
      s.puts.length = 0
      await a.sync()
      return { puts: s.puts.filter((p) => p.path === 'info.json'), etag }
    }
    const withEtag = await stale({ capabilities: { conditionalPut: 'etag' } })
    expect(withEtag.puts).toEqual([{ path: 'info.json', ifMatch: withEtag.etag }])
    expect((await stale({ capabilities: { conditionalPut: 'none' } })).puts).toEqual([{ path: 'info.json' }])
  })

  it('creates files create-only on a target that supports it, and unconditionally on one that does not', async () => {
    for (const conditionalPut of ['etag', 'none'] as const) {
      const target = createMemoryTarget({ capabilities: { conditionalPut } })
      const f = await fleet(target)
      const s = spy(target)
      const a = f.device(A, { target: s.target })
      await a.engine.publishInfo(INFO)
      a.local.set('library', 'k', 'v', '0001')
      await a.sync()
      await a.sync({ compact: ['library'] })
      const expected = conditionalPut === 'etag' ? 'absent' : undefined
      const created = s.puts.filter((p) => p.path === 'info.json' || p.path.endsWith('.rbs') || p.path.endsWith('.rbc'))
      expect(created.map((p) => p.path.replace(/.*\./, ''))).toEqual(['json', 'rbs', 'rbc'])
      for (const p of created) expect(p.ifMatch).toBe(expected)
      for (const p of s.puts.filter((q) => q.path.startsWith('m/'))) expect(p.ifMatch).toBeUndefined()
    }
  })

  it('does not fetch info.json again while its etag is the one it remembers, and does not write it when nothing changed', async () => {
    const { f, target, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    await a.sync()
    s.gets.length = 0
    const idle = await a.sync()
    expect(s.gets).not.toContain('info.json')
    expect([idle.infoChanged, idle.warnings, idle.pushed, idle.pulled]).toEqual([false, [], 0, 0])
    // The same bytes under a new etag: read again, merged to the same document, so not written back.
    await target.put('info.json', enc(INFO))
    s.gets.length = 0
    s.puts.length = 0
    const again = await a.sync()
    expect(s.gets).toContain('info.json')
    expect(s.puts.filter((p) => p.path === 'info.json')).toEqual([])
    expect([again.infoChanged, again.warnings]).toEqual([false, []])
  })

  it('names a rollback once however many copies are old, and a document of the same time is not one', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    await target.put('info.json', enc({ ...INFO, settings: { colour: { value: 'blue', updatedTime: 50 } } }))
    await a.sync()
    await target.put('info.json', enc(INFO))
    await target.put('info.copy-0a1b2c3d.json', enc(INFO))
    const report = await a.sync()
    expect(report.warnings).toEqual(['rollback'])
    await target.delete('info.copy-0a1b2c3d.json')
    await target.put('info.json', enc({ ...INFO, settings: { colour: { value: 'blue', updatedTime: 50 } } }))
    expect((await a.sync()).warnings).toEqual([])
  })

  it('refuses a document of another vault even when it is also old', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    await target.put('info.json', enc({ ...INFO, settings: { colour: { value: 'blue', updatedTime: 50 } } }))
    await a.sync()
    await target.put('info.json', enc({ ...INFO, vaultId: 'another' }))
    await expect(a.sync()).rejects.toMatchObject({ code: 'wrong-vault' })
  })

  it('reads the same pass again after a lost race, three times at most', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    await a.sync()
    memoryOf(a).info = { ...INFO, settings: { x: { value: 0, updatedTime: 3 } } }
    delete memoryOf(a).infoEtag
    s.beforePut = (path) => { if (path === 'info.json') throw new TargetError('precondition-failed') }
    s.puts.length = 0
    await expect(a.sync()).rejects.toMatchObject({ code: 'precondition-failed' })
    expect(s.puts.filter((p) => p.path === 'info.json')).toHaveLength(3)
  })

  it('does not retry an error that is not a lost race', async () => {
    for (const thrown of [new TargetError('unreachable'), undefined, null]) {
      const { f, spy: s } = await boot()
      const a = f.device(A, { target: s.target })
      await a.sync()
      memoryOf(a).info = { ...INFO, settings: { x: { value: 0, updatedTime: 3 } } }
      delete memoryOf(a).infoEtag
      s.beforePut = (path) => { if (path === 'info.json') throw thrown }
      s.puts.length = 0
      const failure = await a.sync().then(() => 'resolved', (e: unknown) => e)
      expect(failure).toBe(thrown)
      expect(s.puts.filter((p) => p.path === 'info.json')).toHaveLength(1)
    }
  })

  it('lists only what it needs: info and the manifests, never the streams', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    await a.sync()
    expect([...new Set(s.lists)].sort()).toEqual(['info', 'm/'])
  })

  it('publishInfo remembers the newest time of the document and forgets the etag; updateInfo folds a document in', async () => {
    const { f, target } = await boot()
    await target.delete('info.json')
    const a = f.device(A)
    await a.engine.publishInfo({ ...INFO, settings: { s: { value: 1, updatedTime: 7 } } })
    expect(memoryOf(a).highestInfoTime).toBe(7)
    expect(memoryOf(a).infoEtag).toBeUndefined()
    await a.engine.updateInfo({ ...INFO, settings: { t: { value: 2, updatedTime: 9 } } })
    expect(Object.keys((memoryOf(a).info as typeof INFO).settings)).toEqual(['s', 't'])
    expect(memoryOf(a).highestInfoTime).toBe(7)
    await a.engine.publishInfo({ ...INFO, settings: {} }).catch(() => undefined)
    expect(memoryOf(a).highestInfoTime).toBe(7)
  })
})

describe('info.json that cannot be read', () => {
  it('writes the device copy back when the listed document is gone by the time it is fetched', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    s.fetched = (path, got) => (path === 'info.json' ? null : got)
    const report = await a.sync()
    expect(report.info).toEqual(INFO)
    expect(s.puts.some((p) => p.path === 'info.json')).toBe(true)
  })

  it('folds a document into the one the engine was started with when none was remembered yet', async () => {
    const { f } = await boot()
    const a = f.device(A)
    await a.engine.updateInfo({ ...INFO, settings: { t: { value: 2, updatedTime: 9 } } })
    expect(Object.keys((memoryOf(a).info as typeof INFO).settings)).toEqual(['t'])
  })
})

describe('manifests of the other devices', () => {
  it('forgets a manifest that left the target, and never fetches its own or one it already holds', async () => {
    const { f, target, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    await manifestOf(f, X)
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    expect(Object.keys(memoryOf(a).manifests)).toEqual([`m/${X}.rbm`])
    s.gets.length = 0
    await a.sync()
    expect(s.gets).toEqual([])
    await target.delete(`m/${X}.rbm`)
    const report = await a.sync()
    expect(memoryOf(a).manifests).toEqual({})
    expect(report.devices.map((d) => d.device)).toEqual([A])
  })

  it('reads a conflict copy of its own manifest as a copy, and does not take it for another device', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const seg = await f.putSegment('library', A, 9, kv({ ghost: ['x', '9'] }))
    await f.putManifest(`m/${A}.copy-0a0a0a0a.rbm`, { device: A, seq: 99, segments: [segRef('library', seg, 9, 1)] })
    s.gets.length = 0
    const report = await a.sync()
    expect(s.gets).toEqual([`m/${A}.copy-0a0a0a0a.rbm`])
    expect(Object.keys(memoryOf(a).manifests)).toEqual([`m/${A}.copy-0a0a0a0a.rbm`])
    expect(report.devices.map((d) => [d.device, d.self])).toEqual([[A, true]])
    expect(report.streams).toEqual([])
    expect(a.local.get('library').ghost).toBeUndefined()
  })

  it('does not trust a manifest it cannot read: it is "not ready", named once, and retried with a backoff', async () => {
    const { f, target, spy: s, clock } = await boot()
    const a = f.device(A, { target: s.target })
    const bad = [`m/${X}.rbm`, `m/${Y}.rbm`]
    for (const p of bad) await target.put(p, new Uint8Array(40).fill(7))
    const first = await a.sync()
    expect(first.warnings).toEqual(['unreadable-manifest'])
    expect(first.waiting.map((w) => w.path)).toEqual(bad)
    expect(Object.values(memoryOf(a).waiting).map((w) => [w.tries, w.nextAt - clock.now])).toEqual([[1, BACKOFF_BASE_MS], [1, BACKOFF_BASE_MS]])
    const t0 = clock.now
    s.gets.length = 0
    clock.now = t0 + BACKOFF_BASE_MS - 1
    await a.sync()
    expect(s.gets).toEqual([])
    clock.now = t0 + BACKOFF_BASE_MS
    await a.sync()
    expect(s.gets).toEqual(bad)
    expect(Object.values(memoryOf(a).waiting).map((w) => w.tries)).toEqual([2, 2])
    // The file is repaired: it is read, and nothing waits any more.
    await manifestOf(f, X)
    clock.now += 60 * 60_000
    const healed = await a.sync()
    expect(healed.waiting.map((w) => w.path)).toEqual([`m/${Y}.rbm`])
    expect(memoryOf(a).waiting[`m/${X}.rbm`]).toBeUndefined()
    expect(healed.devices.map((d) => d.device)).toEqual([A, X])
  })

  it('refuses a manifest whose size is not the listed one, one that vanished, and one that names another device', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    await manifestOf(f, X)
    await manifestOf(f, Y, { device: 'zzzzzzzzzzzzz' })
    s.listed = (o) => (o.path === `m/${X}.rbm` ? { ...o, size: o.size + 1 } : o)
    const sized = await a.sync()
    expect(sized.warnings).toEqual(['unreadable-manifest'])
    expect(sized.waiting.map((w) => w.path)).toEqual([`m/${X}.rbm`, `m/${Y}.rbm`])
    expect(sized.devices.map((d) => d.device)).toEqual([A])
    delete s.listed
    const b = f.device(B, { target: s.target })
    s.fetched = (path, got) => (path === `m/${X}.rbm` ? null : got)
    const gone = await b.sync()
    expect(gone.waiting.map((w) => w.path)).toEqual([`m/${X}.rbm`, `m/${Y}.rbm`])
  })

  it('keeps the newest manifest of a device that has several, names the duplicate once, and keeps the first of two equal ones', async () => {
    for (const [mainSeq, copySeq, other, expected] of [[3, 5, 7, 'Copy'], [5, 3, 1, 'Main'], [4, 4, 4, 'Copy']] as const) {
      const { f } = await boot()
      const a = f.device(A)
      await f.putManifest(`m/${X}.rbm`, { device: X, seq: mainSeq, name: 'Main' })
      await f.putManifest(`m/${X}.copy-0000000a.rbm`, { device: X, seq: copySeq, name: 'Copy' })
      await f.putManifest(`m/${X}.copy-0000000b.rbm`, { device: X, seq: other, name: 'Other' })
      const report = await a.sync()
      expect(report.warnings).toEqual(['duplicate-manifest'])
      expect(report.devices.map((d) => d.name)).toEqual([`Device ${A}`, expected === 'Copy' && other === 7 ? 'Other' : expected])
      expect(Object.keys(memoryOf(a).manifests)).toHaveLength(1)
    }
  })

  it('does not warn about a device with one manifest', async () => {
    const { f } = await boot()
    const a = f.device(A)
    await manifestOf(f, X)
    await manifestOf(f, Y)
    expect((await a.sync()).warnings).toEqual([])
  })

  it('opens manifests with no stream, and streams with their own', async () => {
    const { f } = await boot()
    const calls: [string, string][] = []
    const real = f.sealer
    const crypto: VaultCrypto = {
      streamId: (n) => real.streamId(n),
      seal: (c, s, t) => { calls.push([c, s]); return real.seal(c, s, t) },
      open: (c, s, b) => { calls.push([c, s]); return real.open(c, s, b) },
    }
    const a = f.device(A, { crypto })
    const b = f.device(B, { crypto })
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    await b.sync()
    const sid = await real.streamId('library')
    for (const [c, s] of calls) expect(s).toBe(c === 'man' ? '' : sid)
    expect(calls.map(([c]) => c)).toContain('man')
    expect(calls.map(([c]) => c)).toContain('seg')
  })
})

describe('pulling a stream, edge by edge', () => {
  it('applies the newest checkpoint only, the higher path first when two are equally new, and the newer first when paths run the other way', async () => {
    const cases: [string, { rand: string; at: number; state: Kv }[], string][] = [
      ['newer first', [{ rand: 'aaaaaaaa', at: 10, state: kv({ k: ['old', '1'] }) }, { rand: 'bbbbbbbb', at: 20, state: kv({ k: ['new', '2'] }) }], 'new'],
      ['newer first, with the path running the other way', [{ rand: 'bbbbbbbb', at: 10, state: kv({ k: ['old', '1'] }) }, { rand: 'aaaaaaaa', at: 20, state: kv({ k: ['new', '2'] }) }], 'new'],
      ['equally new, the higher path first', [{ rand: 'aaaaaaaa', at: 10, state: kv({ k: ['low', '1'] }) }, { rand: 'bbbbbbbb', at: 10, state: kv({ k: ['high', '2'] }) }], 'high'],
      ['equally new, listed the other way', [{ rand: 'bbbbbbbb', at: 10, state: kv({ k: ['high', '2'] }) }, { rand: 'aaaaaaaa', at: 10, state: kv({ k: ['low', '1'] }) }], 'high'],
    ]
    for (const [why, cps, expected] of cases) {
      const { f } = await boot()
      const b = f.device(B)
      const refs = []
      for (const c of cps) refs.push({ ...(await putCheckpoint(f, 'library', c.rand, c.state)), stream: 'library', at: c.at, covers: {} })
      await manifestOf(f, X, { checkpoints: refs })
      const report = await b.sync()
      expect(b.local.get('library').k?.value, why).toBe(expected)
      expect(b.local.applied, why).toHaveLength(1)
      expect(report.pulled, why).toBe(1)
    }
  })

  it('falls back to the checkpoint before when the newest one cannot be used', async () => {
    const good = kv({ k: ['good', '1'] })
    const bodies: [string, (f: Fleet) => Promise<{ path: string; size: number }>][] = [
      ['not authentic', async (f) => { const c = await putCheckpoint(f, 'library', 'cccccccc', good); await f.target.put(c.path, new Uint8Array(c.size).fill(1)); return c }],
      ['another version', (f) => putCheckpoint(f, 'library', 'cccccccc', good, {}, JSON.stringify({ v: 2, stream: 'library', state: good, covers: {} }))],
      ['another stream', (f) => putCheckpoint(f, 'library', 'cccccccc', good, {}, JSON.stringify({ v: 1, stream: 'settings', state: good, covers: {} }))],
      ['not an object', (f) => putCheckpoint(f, 'library', 'cccccccc', good, {}, '[]')],
      ['null', (f) => putCheckpoint(f, 'library', 'cccccccc', good, {}, 'null')],
      ['a state that is not one', (f) => putCheckpoint(f, 'library', 'cccccccc', 'x')],
      ['no covers', (f) => putCheckpoint(f, 'library', 'cccccccc', good, {}, JSON.stringify({ v: 1, stream: 'library', state: good }))],
    ]
    for (const [why, make] of bodies) {
      const { f } = await boot()
      const b = f.device(B)
      const older = await putCheckpoint(f, 'library', 'aaaaaaaa', good, { [X]: 2 })
      const newest = await make(f)
      await manifestOf(f, X, { checkpoints: [{ ...older, stream: 'library', at: 10, covers: { [X]: 2 } }, { ...newest, stream: 'library', at: 20, covers: { [X]: 4 } }] })
      const report = await b.sync()
      expect(b.local.get('library'), why).toEqual(good)
      expect(report.pulled, why).toBe(1)
      expect(memoryOf(b).streams.library?.checkpoint, why).toBe(older.path)
      expect(memoryOf(b).streams.library?.covers, why).toEqual({ [X]: 2 })
    }
  })

  it('ignores the checkpoints of other streams, reads a checkpoint once, and keeps the highest cover it has seen', async () => {
    const { f, spy: s } = await boot()
    const b = f.device(B, { target: s.target })
    const lib = await putCheckpoint(f, 'library', 'aaaaaaaa', kv({ k: ['v', '1'] }), { [X]: 3, [Y]: 7 })
    const other = await putCheckpoint(f, 'settings', 'aaaaaaaa', kv({ s: ['v', '1'] }))
    await manifestOf(f, X, { checkpoints: [{ ...lib, stream: 'library', at: 10, covers: { [X]: 3, [Y]: 7 } }, { ...other, stream: 'settings', at: 99, covers: {} }] })
    await b.sync() // creates the memory
    s.gets.length = 0
    memoryOf(b).streams.library = { covers: { [X]: 10 }, applied: [] }
    delete memoryOf(b).streams.library!.checkpoint
    const report = await b.sync()
    expect(s.gets).toEqual([lib.path])
    expect(report.waiting).toEqual([])
    expect(memoryOf(b).streams.library?.covers).toEqual({ [X]: 10, [Y]: 7 })
    s.gets.length = 0
    expect((await b.sync()).pulled).toBe(0)
    expect(s.gets).toEqual([])
    expect(b.local.applied).toHaveLength(3) // the library twice (its memory was reset) and the settings once
  })

  it('skips the segments a checkpoint covers up to and including its sequence, and fetches the next one', async () => {
    const { f, spy: s } = await boot()
    const b = f.device(B, { target: s.target })
    const cp = await putCheckpoint(f, 'library', 'aaaaaaaa', kv({ a: ['1', '1'] }), { [X]: 3 })
    const covered = await f.putSegment('library', X, 3, kv({ c: ['3', '3'] }))
    const next = await f.putSegment('library', X, 4, kv({ d: ['4', '4'] }))
    await manifestOf(f, X, { checkpoints: [{ ...cp, stream: 'library', at: 10, covers: { [X]: 3 } }], segments: [segRef('library', covered, 3, 11), segRef('library', next, 4, 12)] })
    const report = await b.sync()
    expect(s.gets).toContain(next.path)
    expect(s.gets).not.toContain(covered.path)
    expect(Object.keys(b.local.get('library')).sort()).toEqual(['a', 'd'])
    expect(report.pulled).toBe(2)
  })

  it('applies segments oldest first, equally old ones by path, and does not apply one twice', async () => {
    const { f } = await boot()
    const b = f.device(B)
    const s1 = await f.putSegment('library', X, 1, kv({ one: ['1', '1'] }))
    const s2 = await f.putSegment('library', X, 2, kv({ two: ['2', '2'] }))
    const s3 = await f.putSegment('library', X, 3, kv({ three: ['3', '3'] }))
    await manifestOf(f, X, { segments: [segRef('library', s1, 1, 20), segRef('library', s3, 3, 10), segRef('library', s2, 2, 10)] })
    await b.sync()
    expect(b.local.applied.map((a) => Object.keys(a.delta as Kv)[0])).toEqual(['two', 'three', 'one'])
    await b.sync()
    expect(b.local.applied).toHaveLength(3)
    // The same, listed the other way round.
    const c = f.device('ccccccccccccc')
    await manifestOf(f, X, { segments: [segRef('library', s2, 2, 10), segRef('library', s3, 3, 10), segRef('library', s1, 1, 20)] })
    await c.sync()
    expect(c.local.applied.map((a) => Object.keys(a.delta as Kv)[0])).toEqual(['two', 'three', 'one'])
  })

  it('ignores a file under m/ that is not a manifest', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    await target.put('m/readme.txt', new Uint8Array(10))
    const report = await a.sync()
    expect(report.warnings).toEqual([])
    expect(report.waiting).toEqual([])
  })

  it('reads a checkpoint again once it is repaired, and nothing waits for it any more', async () => {
    const { f, target, clock } = await boot()
    const b = f.device(B)
    const cp = await putCheckpoint(f, 'library', 'aaaaaaaa', kv({ k: ['v', '1'] }), { [X]: 1 })
    const good = (await target.get(cp.path))!.bytes
    await target.put(cp.path, new Uint8Array(cp.size).fill(3))
    await manifestOf(f, X, { checkpoints: [{ ...cp, stream: 'library', at: 1, covers: { [X]: 1 } }] })
    expect((await b.sync()).waiting.map((w) => w.path)).toEqual([cp.path])
    await target.put(cp.path, good)
    clock.now += 60 * 60_000
    const healed = await b.sync()
    expect(healed.waiting).toEqual([])
    expect(b.local.get('library').k?.value).toBe('v')
  })

  it('forgets the segments it applied once the manifest stops naming them', async () => {
    const { f, clock } = await boot()
    const a = f.device(A)
    const b = f.device(B)
    for (let i = 0; i < 3; i++) { a.local.set('library', `k${i}`, 'v', `000${i}`); await a.sync() }
    await b.sync()
    expect(memoryOf(b).streams.library?.applied).toHaveLength(3)
    a.local.set('library', 'k3', 'v', '0003')
    await a.sync({ compact: ['library'] })
    clock.now += RETIRE_AFTER_MS + 1
    await a.sync()
    await b.sync()
    expect(memoryOf(b).streams.library?.applied).toEqual([])
    expect(Object.keys(b.local.get('library')).sort()).toEqual(['k0', 'k1', 'k2', 'k3'])
  })

  it('does not apply a segment that is not what the manifest says, and tries it again later, once per pass', async () => {
    const bodies: [string, string | ((f: Fleet) => Promise<{ path: string; size: number }>)][] = [
      ['another version', JSON.stringify({ v: 2, stream: 'library', device: X, seq: 1, delta: kv({ k: ['v', '1'] }) })],
      ['another stream', JSON.stringify({ v: 1, stream: 'settings', device: X, seq: 1, delta: kv({ k: ['v', '1'] }) })],
      ['not an object', '[]'],
      ['null', 'null'],
      ['a delta that is not one', JSON.stringify({ v: 1, stream: 'library', device: X, seq: 1, delta: 'x' })],
      ['another size than the manifest says', async (f) => { const s = await f.putSegment('library', X, 1, kv({ k: ['v', '1'] })); return { ...s, size: s.size + 1 } }],
    ]
    for (const [why, body] of bodies) {
      const { f } = await boot()
      const b = f.device(B)
      const seg = typeof body === 'string' ? await f.putSegment('library', X, 1, null, { body }) : await body(f)
      await manifestOf(f, X, { segments: [segRef('library', seg, 1, 5)] })
      const report = await b.sync()
      expect(b.local.applied, why).toEqual([])
      expect(report.waiting.map((w) => w.path), why).toEqual([seg.path])
      expect(memoryOf(b).waiting[seg.path]?.tries, why).toBe(1)
    }
  })

  it('counts a file that is not there as one failure per pass, and backs off 5 s, 10 s, 20 s up to 10 minutes', async () => {
    const { f, spy: s, clock } = await boot()
    const b = f.device(B, { target: s.target })
    const seg = await f.putSegment('library', X, 1, kv({ k: ['v', '1'] }))
    await f.target.delete(seg.path)
    await manifestOf(f, X, { segments: [segRef('library', seg, 1, 5)] })
    const waits: number[] = []
    for (let i = 0; i < 12; i++) {
      s.gets.length = 0
      await b.sync()
      expect(s.gets.filter((p) => p === seg.path)).toHaveLength(1)
      const w = memoryOf(b).waiting[seg.path]!
      expect(w.tries).toBe(i + 1)
      waits.push(w.nextAt - clock.now)
      clock.now = w.nextAt - 1
      s.gets.length = 0
      await b.sync()
      expect(s.gets, `still backing off, try ${i + 1}`).not.toContain(seg.path)
      clock.now = w.nextAt
    }
    expect(waits).toEqual([5, 10, 20, 40, 80, 160, 320, 600, 600, 600, 600, 600].map((s) => s * 1000))
    expect(BACKOFF_MAX_MS).toBe(600_000)
  })

  it('a stream the app has no codec for is neither pulled nor pushed', async () => {
    const { f } = await boot()
    const a = f.device(A)
    a.local.codec = (stream: string) => (stream === 'ghost' ? null : (Object.getPrototypeOf(a.local) as { codec(s: string): unknown }).codec.call(a.local, stream)) as never
    a.local.eagerStreams = ['ghost', 'library']
    a.local.data.set('ghost', { x: 1 })
    a.local.set('library', 'k', 'v', '0001')
    const report = await a.sync({ open: ['ghost'] })
    expect(report.pushed).toBe(1)
    expect(report.pulled).toBe(0)
    expect(memoryOf(a).streams.ghost).toBeUndefined()
    expect(memoryOf(a).known.ghost).toBeUndefined()
  })

  it('opens a stream once however often it is asked for, and none when it is not', async () => {
    const { f } = await boot()
    const a = f.device(A)
    await a.sync()
    expect(memoryOf(a).opened).toEqual([])
    await a.sync({ open: [boardStream('b1'), boardStream('b1')] })
    await a.sync({ open: [boardStream('b1'), boardStream('b2')] })
    expect(memoryOf(a).opened).toEqual([boardStream('b1'), boardStream('b2')])
  })

  it('keeps no trace of a stream whose apply failed halfway', async () => {
    const { f } = await boot()
    const b = f.device(B)
    const seg = await f.putSegment('library', X, 1, kv({ k: ['v', '1'] }))
    await manifestOf(f, X, { segments: [segRef('library', seg, 1, 5)] })
    b.local.apply = async () => { throw new Error('disk full') }
    await expect(b.sync()).rejects.toThrow('disk full')
    expect(memoryOf(b).streams.library).toEqual({ covers: {}, applied: [] })
  })

  it('remembers the highest token the target holds, so it neither pushes what is there nor forgets a newer one', async () => {
    const { f } = await boot()
    const a = f.device(A)
    const b = f.device(B)
    a.local.set('library', 'k', 'v1', '0001')
    await a.sync()
    await b.sync()
    a.local.set('library', 'k', 'v2', '0002')
    await a.sync()
    const pulled = await b.sync()
    expect([pulled.pulled, pulled.pushed]).toEqual([1, 0])
    expect(memoryOf(b).known.library).toEqual({ k: '0002' })
    // An older value of the same item arrives after a newer one went out: what the target holds is still the newer.
    b.local.set('library', 'j', 'newer', '0009')
    await b.sync()
    const older = await f.putSegment('library', X, 1, kv({ j: ['older', '0005'] }))
    await manifestOf(f, X, { segments: [segRef('library', older, 1, 5)] })
    const late = await b.sync()
    expect([late.pulled, late.pushed]).toEqual([1, 0])
    expect(b.local.get('library').j?.value).toBe('newer')
    expect(memoryOf(b).known.library?.j).toBe('0009')
  })
})

describe('pushing, edge by edge', () => {
  it('numbers its manifests one by one, writes one only when something changed, and again when the device is renamed', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    expect(memoryOf(a).own.manifestSeq).toBe(1)
    expect(memoryOf(a).own.dirty).toBe(false)
    await a.sync()
    await a.sync()
    expect(memoryOf(a).own.manifestSeq).toBe(1)
    expect(s.puts.filter((p) => p.path.startsWith('m/'))).toHaveLength(1)
    const renamed = f.device(A, { target: s.target, deviceName: 'Renamed', memory: a.memory })
    await renamed.sync()
    expect(memoryOf(a).own.manifestSeq).toBe(2)
    expect(memoryOf(a).own.name).toBe('Renamed')
    const b = f.device(B)
    const seen = await b.sync()
    expect(seen.devices.map((d) => d.name)).toEqual([`Device ${B}`, 'Renamed'])
    await renamed.sync()
    expect(memoryOf(a).own.manifestSeq).toBe(2)
  })

  it('names a stream to the target once, and not at all when it has nothing to push', async () => {
    const { f } = await boot()
    const ids: string[] = []
    const crypto: VaultCrypto = { streamId: (n) => { ids.push(n); return f.sealer.streamId(n) }, seal: (c, s, t) => f.sealer.seal(c, s, t), open: (c, s, b) => f.sealer.open(c, s, b) }
    const a = f.device(A, { crypto })
    await a.sync()
    expect(ids).toEqual([])
    a.local.set('library', 'k1', 'v', '0001')
    await a.sync()
    a.local.set('library', 'k2', 'v', '0002')
    await a.sync()
    expect(ids).toEqual(['library'])
    expect(memoryOf(a).seq).toBe(2)
  })

  it('a put that never reached the target is written again, and one whose size is not the pending one is not adopted', async () => {
    const { f, target, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    a.local.set('library', 'k', 'v', '0001')
    s.beforePut = (path) => { if (path.startsWith('s/')) { s.beforePut = undefined; throw new TargetError('unreachable') } }
    await expect(a.sync()).rejects.toThrow('unreachable')
    expect(memoryOf(a).pending).toHaveLength(1)
    const report = await a.sync()
    expect(report.pushed).toBe(1)
    expect(memoryOf(a).pending).toEqual([])
    expect(memoryOf(a).own.segments).toHaveLength(1)
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbs'))).toHaveLength(1)
    // A file of the pending name with another size is somebody else's: it is not adopted.
    const sid = await sidOf(f, 'library')
    const path = `s/${sid}/${A}-00000009-deadbeef.rbs`
    await target.put(path, new Uint8Array(2000))
    memoryOf(a).pending = [{ path, stream: 'library', seq: 9, size: 1024, at: 1, tokens: { ghost: '9' } }]
    memoryOf(a).seq = 9
    await a.sync()
    expect(memoryOf(a).own.segments.map((x) => x.path)).not.toContain(path)
    expect(memoryOf(a).known.library?.ghost).toBeUndefined()
    expect(memoryOf(a).pending).toEqual([])
    // The same file with the pending size is adopted.
    memoryOf(a).pending = [{ path, stream: 'library', seq: 10, size: 2000, at: 1, tokens: { ghost: '9' } }]
    await a.sync()
    expect(memoryOf(a).own.segments.map((x) => x.path)).toContain(path)
    expect(memoryOf(a).known.library?.ghost).toBe('9')
    expect(memoryOf(a).pending).toEqual([])
  })

  it('leaves nothing pending after a push', async () => {
    const { f } = await boot()
    const a = f.device(A)
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    expect(memoryOf(a).pending).toEqual([])
  })
})

describe('compaction, edge by edge', () => {
  const write = async (d: Device, stream: string, key: string, token = key) => { d.local.set(stream, key, 'v', token); await d.sync() }

  it('compacts past 20 live segments, not at 20, and a forced stream only when it has a live segment', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    const checkpoints = () => [...target.objects().keys()].filter((p) => p.endsWith('.rbc')).length
    for (let i = 0; i < COMPACT_SEGMENTS; i++) await write(a, 'library', `k${i}`, `1${String(i).padStart(4, '0')}`)
    expect(checkpoints()).toBe(0)
    await a.sync({ compact: ['settings'] }) // nothing of it to compact
    expect(checkpoints()).toBe(0)
    await write(a, 'library', 'k20', '20000')
    expect(checkpoints()).toBe(1)
    for (let i = 0; i < 3; i++) await a.sync()
    expect(checkpoints()).toBe(1) // retired segments do not count again
    await a.sync({ compact: ['library'] })
    expect(checkpoints()).toBe(1) // forced, but nothing live
    await write(a, 'library', 'k21', '21000')
    await a.sync({ compact: ['library'] })
    expect(checkpoints()).toBe(2)
  })

  it('compacts past 4 MiB of live segments, not at 4 MiB, and counts the sizes of all of them', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const seg = memoryOf(a).own.segments[0]!
    const checkpoints = () => [...target.objects().keys()].filter((p) => p.endsWith('.rbc')).length
    memoryOf(a).own.segments = [{ ...seg, size: COMPACT_BYTES }]
    await a.sync()
    expect(checkpoints()).toBe(0)
    memoryOf(a).own.segments = [{ ...seg, size: COMPACT_BYTES - 10 }, { ...seg, path: `${seg.path}x`, size: 11 }]
    await a.sync()
    expect(checkpoints()).toBe(1)
  })

  it('does not count the segments of another stream, nor compact a stream past a file it still waits for', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    a.local.eagerStreams = ['library', 'settings']
    for (let i = 0; i <= COMPACT_SEGMENTS; i++) await write(a, 'settings', `k${i}`, `1${String(i).padStart(4, '0')}`)
    const sidSettings = await sidOf(f, 'settings')
    const sidLibrary = await sidOf(f, 'library')
    const paths = () => [...target.objects().keys()].filter((p) => p.endsWith('.rbc'))
    expect(paths().every((p) => p.startsWith(`s/${sidSettings}/`))).toBe(true)
    expect(paths()).toHaveLength(1)
    expect(paths().some((p) => p.startsWith(`s/${sidLibrary}/`))).toBe(false)
  })

  it('writes no checkpoint while a file of the stream waits, but one while only another stream waits', async () => {
    for (const waitingFor of ['library', 'settings'] as const) {
      const { f, target } = await boot()
      const a = f.device(A)
      a.local.set('library', 'k', 'v', '0001')
      await a.sync()
      const lost = await f.putSegment(waitingFor, X, 1, kv({ z: ['v', '1'] }))
      await target.delete(lost.path)
      await manifestOf(f, X, { segments: [segRef(waitingFor, lost, 1, 5)] })
      a.local.eagerStreams = ['library', 'settings']
      await a.sync({ compact: ['library'] })
      const written = [...target.objects().keys()].filter((p) => p.endsWith('.rbc')).length
      expect(written, waitingFor).toBe(waitingFor === 'library' ? 0 : 1)
    }
  })

  it('writes no checkpoint while a checkpoint of the stream waits, but one while only another stream has a checkpoint waiting', async () => {
    for (const waitingFor of ['library', 'settings'] as const) {
      const { f, target } = await boot()
      const a = f.device(A)
      a.local.set('library', 'k', 'v', '0001')
      await a.sync()
      const cp = await putCheckpoint(f, waitingFor, 'aaaaaaaa', kv({ z: ['v', '1'] }))
      await target.delete(cp.path)
      await manifestOf(f, X, { checkpoints: [{ ...cp, stream: waitingFor, at: 1, covers: {} }] })
      a.local.eagerStreams = ['library', 'settings']
      await a.sync({ compact: ['library'] })
      expect(Object.keys(memoryOf(a).waiting), waitingFor).toEqual([cp.path])
      const written = [...target.objects().keys()].filter((p) => p.endsWith('.rbc')).length
      expect(written, waitingFor).toBe(waitingFor === 'library' ? 0 : 1)
    }
  })

  it('writes no checkpoint while another device has a segment of the stream this one has not applied, and one when it is covered', async () => {
    for (const [seq, covered, expected] of [[3, 3, 1], [4, 3, 0], [3, 2, 0]] as const) {
      const { f, target } = await boot()
      const a = f.device(A)
      a.local.set('library', 'k', 'v', '0001')
      await a.sync()
      const cp = await putCheckpoint(f, 'library', 'aaaaaaaa', kv({ c: ['v', '1'] }), { [X]: covered })
      const seg = await f.putSegment('library', X, seq, kv({ z: ['v', '1'] }))
      await target.delete(seg.path)
      await manifestOf(f, X, { checkpoints: [{ ...cp, stream: 'library', at: 1, covers: { [X]: covered } }], segments: [segRef('library', seg, seq, 5)] })
      await a.sync({ compact: ['library'] })
      const mine = [...target.objects().keys()].filter((p) => p.endsWith('.rbc') && p !== cp.path).length
      expect(mine, `seq ${seq}, covered ${covered}`).toBe(expected)
    }
  })

  it('does not wait for a segment of a stream it does not mirror, and compacts a stream it holds no state memory of', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const other = await f.putSegment(boardStream('zz'), X, 1, [{ id: 'e1', data: 'd' }])
    await manifestOf(f, X, { segments: [segRef(boardStream('zz'), other, 1, 5)] })
    delete memoryOf(a).streams.library
    a.local.eagerStreams = []
    await a.sync({ compact: ['library'] })
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbc'))).toHaveLength(1)
  })

  it('refuses to compact a stream another device has unapplied segments of when this device never read the stream', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const seg = await f.putSegment('library', X, 1, kv({ z: ['v', '1'] }))
    await target.delete(seg.path)
    await manifestOf(f, X, { segments: [segRef('library', seg, 1, 5)] })
    delete memoryOf(a).streams.library
    memoryOf(a).waiting = {}
    a.local.eagerStreams = []
    await a.sync({ compact: ['library'] })
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbc'))).toHaveLength(0)
  })

  async function open(f: Fleet, stream: string, bytes: Uint8Array) {
    return JSON.parse((await f.sealer.open('chk', await sidOf(f, stream), bytes))!) as { state: Kv; covers: Record<string, number> }
  }

  it('records in a checkpoint the highest sequence of each device in that stream, and keeps what an earlier checkpoint covered', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    const x = f.device(X)
    x.local.eagerStreams = ['library', 'settings']
    for (let i = 1; i <= 3; i++) { x.local.set('library', `x${i}`, 'v', `000${i}`); await x.sync() }
    x.local.set('settings', 's', 'v', '0001')
    await x.sync()
    x.local.set('settings', 's2', 'v', '0002')
    await x.sync()
    const earlier = await putCheckpoint(f, 'library', 'eeeeeeee', kv({ e: ['v', '1'] }), { [Y]: 5 })
    await manifestOf(f, Y, { checkpoints: [{ ...earlier, stream: 'library', at: 1, covers: { [Y]: 5 } }], segments: [segRef('library', { path: 's/gone', size: 1 }, 2, 1)] })
    a.local.set('library', 'own', 'v', '0001')
    await a.sync()
    a.local.set('library', 'own2', 'v', '0002')
    a.local.eagerStreams = ['library', 'settings']
    a.local.set('settings', 'mine', 'v', '0001')
    await a.sync({ compact: ['library'] })
    const written = [...target.objects()].filter(([p]) => p.endsWith('.rbc') && p.includes(`/c-`) && p !== earlier.path && p.startsWith(`s/${''}`))
    const cps = []
    for (const [p, bytes] of written) if (p.startsWith(`s/${await sidOf(f, 'library')}/`) && p !== earlier.path) cps.push(await open(f, 'library', bytes))
    expect(cps).toHaveLength(1)
    const mem = memoryOf(a)
    const libSegs = mem.own.segments.filter((s) => s.stream === 'library').map((s) => s.seq)
    expect(cps[0]!.covers).toEqual({ [A]: Math.max(...libSegs), [X]: 3, [Y]: 5 })
    expect(Math.max(...libSegs)).toBeLessThan(Math.max(...mem.own.segments.map((s) => s.seq)))
  })

  it('retires only the segments of the compacted stream that were live, and keeps the time they were retired at', async () => {
    const { f, clock } = await boot()
    const a = f.device(A)
    a.local.eagerStreams = ['library', 'settings']
    a.local.set('library', 'k', 'v', '0001')
    a.local.set('settings', 's', 'v', '0001')
    await a.sync()
    const t1 = clock.now
    await a.sync({ compact: ['library'] })
    const retired = () => Object.fromEntries(memoryOf(a).own.segments.map((s) => [s.stream, s.retiredAt]))
    expect(retired()).toEqual({ library: t1, settings: undefined })
    clock.now += 1000
    a.local.set('library', 'k2', 'v', '0002')
    await a.sync()
    const t2 = clock.now
    await a.sync({ compact: ['settings'] })
    const byStream = (stream: string) => memoryOf(a).own.segments.filter((s) => s.stream === stream).map((s) => s.retiredAt)
    expect(byStream('settings')).toEqual([t2])
    expect(byStream('library')).toEqual([t1, undefined])
    clock.now += 1000
    await a.sync({ compact: ['library'] })
    expect(byStream('library')).toEqual([t1, clock.now])
  })

  it('deletes a retired segment exactly 24 hours later, rewriting the manifest then and not before', async () => {
    const { f, target, clock, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const t0 = clock.now
    await a.sync({ compact: ['library'] })
    const seqAfterCompaction = memoryOf(a).own.manifestSeq
    clock.now = t0 + RETIRE_AFTER_MS - 1
    await a.sync()
    expect(memoryOf(a).own.manifestSeq).toBe(seqAfterCompaction)
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbs'))).toHaveLength(1)
    clock.now = t0 + RETIRE_AFTER_MS
    await a.sync()
    expect(memoryOf(a).own.manifestSeq).toBe(seqAfterCompaction + 1)
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbs'))).toHaveLength(0)
    expect(s.deletes.filter((p) => p.endsWith('.rbs'))).toHaveLength(1)
  })

  it('keeps the two newest checkpoints of the stream and deletes the older, whatever their names say, and touches no other stream', async () => {
    for (const [why, random] of [
      ['paths against the clock', (n: number) => `${(15 - n).toString(16)}0000000`],
      ['all at once', (n: number) => `${(15 - n).toString(16)}0000000`],
    ] as const) {
      const { f, target, clock } = await boot()
      let n = 0
      const a = f.device(A, { random: () => random(n++) })
      a.local.eagerStreams = ['library', 'settings']
      const paths = (stream: string) => sidOf(f, stream).then((sid) => [...target.objects().keys()].filter((p) => p.startsWith(`s/${sid}/c-`)))
      for (let i = 0; i < 3; i++) {
        a.local.set('settings', `s${i}`, 'v', `000${i}`)
        await a.sync({ compact: ['settings'] })
        if (why === 'paths against the clock') clock.now += 1000
      }
      const settings = await paths('settings')
      expect(settings, why).toHaveLength(KEPT_CHECKPOINTS)
      // The oldest is the first made (or, made at once, the lowest name) and is gone.
      const made = memoryOf(a).own.checkpoints.map((c) => c.path).sort()
      expect(settings.sort(), why).toEqual(made)
      a.local.set('library', 'l', 'v', '0001')
      await a.sync({ compact: ['library'] })
      expect(await paths('settings'), why).toHaveLength(KEPT_CHECKPOINTS)
      expect(await paths('library'), why).toHaveLength(1)
      expect(memoryOf(a).own.checkpoints, why).toHaveLength(KEPT_CHECKPOINTS + 1)
    }
  })

  it('drops the oldest checkpoint by time, even when its name sorts last, and by name when they are equally old', async () => {
    for (const [apart, ascending] of [[true, false], [false, false], [true, true], [false, true]] as const) {
      const { f, clock } = await boot()
      let n = 0
      // Every file takes the next lower name (the segment f, the checkpoint e, the segment d, the checkpoint c, and so on), or the next higher.
      const a = f.device(A, { random: () => `${(ascending ? n++ : 15 - n++).toString(16)}0000000` })
      a.local.eagerStreams = ['settings']
      for (let i = 0; i < 3; i++) {
        a.local.set('settings', `s${i}`, 'v', `000${i}`)
        await a.sync({ compact: ['settings'] })
        if (apart) clock.now += 1000
      }
      const kept = memoryOf(a).own.checkpoints.map((c) => c.path.replace(/.*c-/, '').replace('.rbc', '')).sort()
      // The oldest goes: the first made when they are apart, the lowest name when made at once.
      const expected = ascending ? ['30000000', '50000000'] : apart ? ['a0000000', 'c0000000'] : ['c0000000', 'e0000000']
      expect(kept, `${apart} ${ascending}`).toEqual(expected)
    }
  })

  it('writes no checkpoint that is bigger than the target takes, and one of exactly its size', async () => {
    const compacted = async (limit: (size: number) => number) => {
      const probe = await boot()
      const p = probe.f.device(A)
      p.local.set('library', 'k', 'v', '0001')
      await p.sync()
      await p.sync({ compact: ['library'] })
      const size = [...probe.target.objects()].find(([path]) => path.endsWith('.rbc'))![1].length
      const { f, target, spy: s } = await boot()
      const a = f.device(A, { target: s.target })
      a.local.set('library', 'k', 'v', '0001')
      await a.sync()
      s.capabilities.maxObjectBytes = limit(size)
      await a.sync({ compact: ['library'] })
      return [...target.objects().keys()].filter((path) => path.endsWith('.rbc')).length
    }
    expect(await compacted((size) => size)).toBe(1)
    expect(await compacted((size) => size - 1)).toBe(0)
  })
})

describe('what a pass reports', () => {
  it('lists the devices with this one first and the others by id whatever order the target gives them', async () => {
    const { f, spy: s } = await boot()
    const me = f.device('mmmmmmmmmmmmm', { target: s.target })
    for (const id of ['zzzzzzzzzzzzz', 'aaaaaaaaaaaaa', 'kkkkkkkkkkkkk', 'ccccccccccccc']) await manifestOf(f, id, { name: `Name ${id}`, updatedAt: 5 })
    const order = ['mmmmmmmmmmmmm', 'aaaaaaaaaaaaa', 'ccccccccccccc', 'kkkkkkkkkkkkk', 'zzzzzzzzzzzzz']
    expect((await me.sync()).devices.map((d) => d.device)).toEqual(order)
    s.reverse = true
    const report = await f.device('mmmmmmmmmmmmm', { target: s.target }).sync()
    expect(report.devices.map((d) => [d.device, d.self])).toEqual(order.map((id) => [id, id === 'mmmmmmmmmmmmm']))
    expect(report.devices[1]).toEqual({ device: 'aaaaaaaaaaaaa', name: 'Name aaaaaaaaaaaaa', updatedAt: 5, self: false })
    expect(report.devices[0]).toEqual({ device: 'mmmmmmmmmmmmm', name: 'Device mmmmmmmmmmmmm', updatedAt: f.clock.now, self: true })
  })

  it('lists the streams the other devices name once each, in order, and the files that wait by path', async () => {
    const { f, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    s.reverse = true
    const lib = await f.putSegment('library', X, 1, kv({ k: ['v', '1'] }))
    const stg = await f.putSegment('settings', X, 2, kv({ k: ['v', '1'] }))
    const brd = await f.putSegment(boardStream('b1'), Y, 1, [])
    await manifestOf(f, X, { segments: [segRef('library', lib, 1, 1), segRef('settings', stg, 2, 2)] })
    await manifestOf(f, Y, { segments: [segRef('library', lib, 1, 1), segRef(boardStream('b1'), brd, 1, 2)] })
    const report = await a.sync()
    expect(report.streams).toEqual([boardStream('b1'), 'library', 'settings'])
    // Four files that are not there, in an order that is neither their name's nor the reverse of it.
    const sid = await sidOf(f, 'library')
    const lost = ['w', 'y', 'x', 'z'].map((c, i) => ({ path: `s/${sid}/${c}${c}${c}${c}-00000001-aaaaaaaa.rbs`, size: 1, i }))
    await manifestOf(f, X, { segments: lost.map((l) => segRef('library', l, 1, 10 + l.i)) })
    const again = await a.sync()
    expect(again.waiting.map((w) => w.path)).toEqual(lost.map((l) => l.path).sort())
    expect(again.waiting.every((w) => typeof w.since === 'number')).toBe(true)
  })
})

describe('deleting', () => {
  it('forgets a stream entirely, its files, its checkpoints and what was remembered of it, and keeps the others', async () => {
    const { f, target } = await boot()
    const a = f.device(A)
    a.local.eagerStreams = ['library', boardStream('b1')]
    a.local.addEvents('b1', 'e1')
    a.local.set('library', 'k', 'v', '0001')
    await a.sync({ open: [boardStream('b1')] })
    await a.sync({ compact: [boardStream('b1'), 'library'] })
    expect(memoryOf(a).own.checkpoints).toHaveLength(2)
    await a.engine.deleteStream(boardStream('b1'))
    const mem = memoryOf(a)
    expect(mem.own.checkpoints.map((c) => c.stream)).toEqual(['library'])
    expect(mem.own.segments.length).toBeGreaterThan(0)
    expect(mem.own.segments.every((s) => s.stream === 'library')).toBe(true)
    expect(mem.known[boardStream('b1')]).toBeUndefined()
    expect(mem.streams[boardStream('b1')]).toBeUndefined()
    expect(mem.opened).toEqual([])
    expect(mem.known.library).toBeDefined()
    expect(mem.streams.library).toBeDefined()
    const sid = await sidOf(f, boardStream('b1'))
    expect([...target.objects().keys()].some((p) => p.startsWith(`s/${sid}/`))).toBe(false)
    expect([...target.objects().keys()].some((p) => p.endsWith('.rbc'))).toBe(true)
    await a.engine.deleteStream('never-there')
  })

  it('keeps the other streams that were opened when one is deleted', async () => {
    const { f } = await boot()
    const a = f.device(A)
    await a.sync({ open: [boardStream('b1'), boardStream('b2')] })
    await a.engine.deleteStream(boardStream('b1'))
    expect(memoryOf(a).opened).toEqual([boardStream('b2')])
  })

  it('deletes the vault by listing the segments, the manifests and info, copies included', async () => {
    const { f, target, spy: s } = await boot()
    const a = f.device(A, { target: s.target })
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    await target.put('info.copy-0a1b2c3d.json', enc(INFO))
    s.lists.length = 0
    await a.engine.deleteVault()
    expect(s.lists).toEqual(['s/', 'm/', 'info'])
    expect(target.objects().size).toBe(0)
    expect(memoryOf(a)).toEqual({
      v: 1, highestInfoTime: 0, seq: 0, own: { segments: [], checkpoints: [], manifestSeq: 0, dirty: false }, pending: [], known: {}, streams: {}, manifests: {}, opened: [], waiting: {},
    })
  })
})
