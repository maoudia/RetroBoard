import { describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import { type MemoryTarget, createMemoryTarget } from '@retroboard/testkit'
import { COMPACT_SEGMENTS, RETIRE_AFTER_MS, VaultError, boardStream } from '../src'
import { INFO, fleet } from './vault-helpers'

const CANARIES = ['CANARY-title-7f3a', 'CANARY-note-91bc', 'CANARY-name-c04e', 'CANARY-team-5d21', 'CANARY-setting-a8f6']

async function started(target: MemoryTarget = createMemoryTarget()) {
  const f = await fleet(target)
  const a = f.device('aaaaaaaaaaaaa')
  const b = f.device('bbbbbbbbbbbbb')
  await a.engine.publishInfo(INFO)
  await b.engine.publishInfo(INFO).catch(() => undefined)
  return { ...f, a, b }
}

describe('two devices on one target', () => {
  it('a device sees what the other wrote, and a first pass writes a manifest', async () => {
    const { a, b, target } = await started()
    a.local.set('library', 'board-1', 'Retro of May', '0001')
    const report = await a.sync()
    expect(report.pushed).toBe(1)
    expect([...target.objects().keys()].filter((p) => p.startsWith('m/'))).toEqual(['m/aaaaaaaaaaaaa.rbm'])
    const seen = await b.sync()
    expect(seen.pulled).toBe(1)
    expect(b.local.get('library')).toEqual(a.local.get('library'))
    expect(seen.devices.map((d) => [d.device, d.self])).toEqual([['bbbbbbbbbbbbb', true], ['aaaaaaaaaaaaa', false]])
    expect(seen.streams).toEqual(['library'])
  })

  it('does not push twice what the target holds, and does not rewrite a manifest that did not change', async () => {
    const { a, b } = await started()
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const again = await a.sync()
    expect(again.pushed).toBe(0)
    await b.sync()
    expect((await b.sync()).pushed).toBe(0)
    expect(b.local.applied).toHaveLength(1)
  })

  for (const order of [['a', 'b'], ['b', 'a']] as const) {
    it(`two devices that edit offline end with the same state whichever syncs first (${order.join(' then ')})`, async () => {
      const { a, b } = await started()
      const devices = { a, b }
      a.local.set('library', 'shared', 'from a', '0010-a')
      b.local.set('library', 'shared', 'from b', '0010-b')
      a.local.set('library', 'only-a', 'a', '0001')
      b.local.set('settings', 'locale', 'fr', '0002')
      for (const round of [0, 1, 2]) for (const who of order) await devices[who].sync().catch((e: unknown) => { throw new Error(`round ${round}: ${String(e)}`) })
      expect(a.local.get('library')).toEqual(b.local.get('library'))
      expect(a.local.get('settings')).toEqual(b.local.get('settings'))
      expect(a.local.get('library').shared?.value).toBe('from b')
      expect(Object.keys(a.local.get('library')).sort()).toEqual(['only-a', 'shared'])
    })
  }

  it('survives a lost put response: the segment is adopted, not written twice', async () => {
    const target = createMemoryTarget()
    const f = await fleet(target)
    let lose = true
    const lossy = { ...target, capabilities: target.capabilities, list: target.list, get: target.get, delete: target.delete, stat: target.stat,
      put: async (path: string, bytes: Uint8Array, opts?: { ifMatch?: string }) => {
        const r = await target.put(path, bytes, opts)
        if (lose && path.startsWith('s/')) { lose = false; throw new TargetError('unreachable') }
        return r
      } }
    const a = f.device('aaaaaaaaaaaaa', { target: lossy as never })
    await a.engine.publishInfo(INFO)
    a.local.set('library', 'k', 'v', '0001')
    await expect(a.sync()).rejects.toThrow('unreachable')
    expect(a.memory.current?.pending).toHaveLength(1)
    const report = await a.sync()
    expect(report.pushed).toBe(0)
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbs'))).toHaveLength(1)
    const b = f.device('bbbbbbbbbbbbb')
    await b.sync()
    expect(b.local.get('library')).toEqual({ k: { value: 'v', token: '0001' } })
  })

  it('writes again when the lost put never reached the target', async () => {
    const target = createMemoryTarget()
    const f = await fleet(target)
    const a = f.device('aaaaaaaaaaaaa')
    await a.engine.publishInfo(INFO)
    a.local.set('library', 'k', 'v', '0001')
    target.failNext('unreachable') // the info.json listing of the pass
    await expect(a.sync()).rejects.toThrow()
    const report = await a.sync()
    expect(report.pushed).toBe(1)
  })

  it('a segment the manifest names but the target lost is skipped and retried with a backoff, then applied when it comes back', async () => {
    const { a, b, target, clock } = await started()
    a.local.set('library', 'one', '1', '0001')
    await a.sync()
    a.local.set('library', 'two', '2', '0002')
    await a.sync()
    const segments = [...target.objects()].filter(([p]) => p.endsWith('.rbs'))
    const [lostPath, lostBytes] = segments[0]!
    await target.delete(lostPath)
    const first = await b.sync()
    expect(first.waiting.map((w) => w.path)).toEqual([lostPath])
    expect(Object.keys(b.local.get('library'))).toEqual(['two'])
    await target.put(lostPath, lostBytes)
    expect((await b.sync()).pulled).toBe(0) // still backing off
    clock.now += 60_000
    const later = await b.sync()
    expect(later.pulled).toBe(1)
    expect(later.waiting).toEqual([])
    expect(Object.keys(b.local.get('library')).sort()).toEqual(['one', 'two'])
  })

  it('an empty file, a file of another size than its manifest says and a file that does not authenticate are not ready', async () => {
    const { a, b, target, clock } = await started()
    a.local.set('library', 'one', '1', '0001')
    await a.sync()
    const [path, bytes] = [...target.objects()].find(([p]) => p.endsWith('.rbs'))!
    for (const broken of [new Uint8Array(0), bytes.slice(0, bytes.length - 1), bytes.map((x, i) => (i === bytes.length - 3 ? x ^ 1 : x))]) {
      await target.put(path, broken)
      const report = await b.sync()
      expect(report.waiting.map((w) => w.path)).toEqual([path])
      expect(b.local.get('library')).toEqual({})
      clock.now += 20 * 60_000
    }
    expect([...target.objects().keys()]).toContain(path) // nothing is deleted because it looked partial
    await target.put(path, bytes)
    clock.now += 20 * 60_000
    await b.sync()
    expect(Object.keys(b.local.get('library'))).toEqual(['one'])
  })

  it('never lets a plaintext canary reach the target: not in a path, a manifest, a segment, a checkpoint or info.json', async () => {
    const { a, b, target } = await started()
    const [title, note, name, team, setting] = CANARIES as [string, string, string, string, string]
    a.local.set('library', 'board-1', title, '0001')
    a.local.set('settings', 'locale', setting, '0001')
    a.local.eagerStreams = ['library', 'settings', 'identity', 'workspace', boardStream('b1')]
    a.local.set('identity', 'name', name, '0001')
    a.local.set('workspace', 'team-1', team, '0001')
    a.local.data.set(boardStream('b1'), [{ id: 'e1', data: `sealed:${note}`.split('').reverse().join('') }])
    for (let i = 0; i < COMPACT_SEGMENTS + 2; i++) { a.local.set('library', `k${i}`, title, `1${String(i).padStart(4, '0')}`); await a.sync() }
    b.local.eagerStreams = a.local.eagerStreams
    await b.sync()
    expect(target.objects().size).toBeGreaterThan(10)
    expect([...target.objects().keys()].some((p) => p.endsWith('.rbc'))).toBe(true)
    expect(() => target.assertNoPlaintext(CANARIES)).not.toThrow()
    for (const path of target.objects().keys()) expect(path).toMatch(/^(info\.json|m\/[a-z0-9]+\.rbm|s\/[a-z2-7]{26}\/([a-z0-9]+-[0-9a-f]{8}-[0-9a-f]{8}\.rbs|c-[0-9a-f]{8}\.rbc))$/)
  })
})

describe('info.json in a pass', () => {
  it('refuses a vault that needs a newer reader and a vault of another id', async () => {
    const { a, target } = await started()
    const text = new TextDecoder().decode((await target.get('info.json'))!.bytes)
    await target.put('info.json', new TextEncoder().encode(text.replace('"minReader":1', '"minReader":9')))
    await expect(a.sync()).rejects.toMatchObject({ code: 'min-reader' })
    await target.put('info.json', new TextEncoder().encode(text.replace('vault-test', 'another')))
    await expect(a.sync()).rejects.toMatchObject({ code: 'wrong-vault' })
    expect(new VaultError('missing').code).toBe('missing')
  })

  it('a vault that vanished from the folder is "missing", not recreated', async () => {
    const { a, target } = await started()
    await target.delete('info.json')
    await expect(a.sync()).rejects.toMatchObject({ code: 'missing' })
    expect(target.objects().has('info.json')).toBe(false)
  })

  it('merges a property changed on another device and writes the merge back', async () => {
    const { a, b, target } = await started()
    await a.sync()
    const bumped = { ...INFO, settings: { colour: { value: 'blue', updatedTime: 5 } } }
    await target.put('info.json', new TextEncoder().encode(JSON.stringify(bumped)))
    const report = await b.sync()
    expect(report.infoChanged).toBe(true)
    expect(report.info.settings).toEqual({ colour: { value: 'blue', updatedTime: 5 } })
    const stored = JSON.parse(new TextDecoder().decode((await target.get('info.json'))!.bytes)) as typeof INFO
    expect(stored.settings).toEqual(report.info.settings)
  })

  it('refuses a rollback to an older info.json, keeps the newer copy and writes it back', async () => {
    const { a, target } = await started()
    const newer = { ...INFO, settings: { colour: { value: 'blue', updatedTime: 50 } } }
    await target.put('info.json', new TextEncoder().encode(JSON.stringify(newer)))
    await a.sync()
    await target.put('info.json', new TextEncoder().encode(JSON.stringify(INFO)))
    const report = await a.sync()
    expect(report.warnings).toContain('rollback')
    expect(report.info.settings.colour?.updatedTime).toBe(50)
    const healed = JSON.parse(new TextDecoder().decode((await target.get('info.json'))!.bytes)) as typeof INFO
    expect(healed.settings.colour?.updatedTime).toBe(50)
  })

  it('merges a conflict copy of info.json and deletes only that copy', async () => {
    const { a, target } = await started()
    await a.sync()
    const copy = { ...INFO, settings: { extra: { value: true, updatedTime: 9 } } }
    await target.put('info.copy-0a1b2c3d.json', new TextEncoder().encode(JSON.stringify(copy)))
    await target.put('info.copy-ffffffff.json', new Uint8Array(0))
    const report = await a.sync()
    expect(report.info.settings.extra?.value).toBe(true)
    expect(target.objects().has('info.copy-0a1b2c3d.json')).toBe(false)
    expect(target.objects().has('info.copy-ffffffff.json')).toBe(true) // empty: not ready, left alone
    expect(JSON.parse(new TextDecoder().decode((await target.get('info.json'))!.bytes))).toMatchObject({ settings: { extra: { value: true } } })
  })

  it('writes info.json again on a precondition failure after another device wrote it between read and write', async () => {
    const { a, target } = await started()
    await a.sync()
    a.memory.current!.info = { ...INFO, settings: { x: { value: 0, updatedTime: 3 } } }
    await target.put('info.json', new TextEncoder().encode(JSON.stringify({ ...INFO, settings: { n: { value: 1, updatedTime: 7 } } })))
    const real = target.put.bind(target)
    let raced = false
    target.put = async (path, bytes, opts) => {
      if (path === 'info.json' && !raced) {
        raced = true
        await real('info.json', new TextEncoder().encode(JSON.stringify({ ...INFO, settings: { n: { value: 1, updatedTime: 7 }, m: { value: 2, updatedTime: 8 } } })))
        throw new TargetError('precondition-failed')
      }
      return real(path, bytes, opts)
    }
    await a.engine.sync()
    expect(Object.keys(JSON.parse(new TextDecoder().decode((await target.get('info.json'))!.bytes)).settings)).toEqual(['m', 'n', 'x'])
  })
})

describe('streams and checkpoints', () => {
  it('a board is fetched only when opened or mirrored, from then on on every pass', async () => {
    const { a, b, target } = await started()
    a.local.eagerStreams = ['library', boardStream('b1')]
    a.local.addEvents('b1', 'e1', 'e2')
    a.local.set('library', 'b1', 'Board', '0001')
    await a.sync()
    const before = target.seenPaths.length
    await b.sync()
    expect(b.local.events('b1')).toEqual([])
    expect(target.seenPaths.slice(before).filter((p) => p.startsWith('s/')).length).toBe(1) // the library segment only
    const opened = await b.sync({ open: [boardStream('b1')] })
    expect(b.local.events('b1')).toEqual(['e1', 'e2'])
    expect(opened.streams).toEqual([boardStream('b1'), 'library'].sort())
    a.local.addEvents('b1', 'e3')
    await a.sync()
    await b.sync()
    expect(b.local.events('b1')).toEqual(['e1', 'e2', 'e3'])
  })

  it('a library of 200 boards fetches no board stream', async () => {
    const { a, b, target } = await started()
    for (let i = 0; i < 200; i++) a.local.set('library', `board-${i}`, `Board ${i}`, `0${String(i).padStart(4, '0')}`)
    a.local.eagerStreams = ['library', ...Array.from({ length: 200 }, (_, i) => boardStream(`board-${i}`))]
    for (let i = 0; i < 200; i++) a.local.addEvents(`board-${i}`, `event-${i}`)
    await a.sync()
    const mark = target.seenPaths.length
    await b.sync()
    const fetched = target.seenPaths.slice(mark).filter((p) => p.startsWith('s/'))
    expect(fetched.length).toBe(1)
    expect(Object.keys(b.local.get('library'))).toHaveLength(200)
  })

  it('unions board events by id from two devices', async () => {
    const { a, b } = await started()
    a.local.eagerStreams = b.local.eagerStreams = [boardStream('b1')]
    a.local.addEvents('b1', 'e1', 'e2')
    b.local.addEvents('b1', 'e2', 'e3')
    await a.sync(); await b.sync(); await a.sync()
    expect(a.local.events('b1')).toEqual(['e1', 'e2', 'e3'])
    expect(b.local.events('b1')).toEqual(['e1', 'e2', 'e3'])
  })

  it('splits a change that is too big for one segment', async () => {
    const f = await fleet(createMemoryTarget({ capabilities: { maxObjectBytes: 8 * 1024 } }))
    const a = f.device('aaaaaaaaaaaaa')
    await a.engine.publishInfo(INFO)
    for (let i = 0; i < 40; i++) a.local.set('library', `k${i}`, 'x'.repeat(300), `0${String(i).padStart(4, '0')}`)
    const report = await a.sync()
    expect(report.pushed).toBeGreaterThan(2)
    const b = f.device('bbbbbbbbbbbbb')
    await b.sync()
    expect(Object.keys(b.local.get('library'))).toHaveLength(40)
  })

  async function manySegments(a: Awaited<ReturnType<typeof started>>['a'], count: number, from = 0) {
    for (let i = from; i < from + count; i++) { a.local.set('library', `k${i}`, `v${i}`, `1${String(i).padStart(4, '0')}`); await a.sync() }
  }

  it('compacts its own segments into a checkpoint, keeps them 24 hours, then deletes them and the manifest stops naming them', async () => {
    const { a, b, target, clock } = await started()
    await manySegments(a, COMPACT_SEGMENTS + 1)
    const objects = () => [...target.objects().keys()]
    expect(objects().filter((p) => p.endsWith('.rbc'))).toHaveLength(1)
    expect(objects().filter((p) => p.endsWith('.rbs'))).toHaveLength(COMPACT_SEGMENTS + 1) // retired, still there
    clock.now += RETIRE_AFTER_MS - 1
    await a.sync()
    expect(objects().filter((p) => p.endsWith('.rbs'))).toHaveLength(COMPACT_SEGMENTS + 1)
    clock.now += 2
    await a.sync()
    expect(objects().filter((p) => p.endsWith('.rbs'))).toHaveLength(0)
    expect(a.memory.current?.own.segments).toEqual([])
    await b.sync()
    expect(Object.keys(b.local.get('library'))).toHaveLength(COMPACT_SEGMENTS + 1)
  })

  it('a new device reads the checkpoint and only the segments after it', async () => {
    const { a, target, clock, device } = await started()
    await manySegments(a, COMPACT_SEGMENTS + 1)
    clock.now += RETIRE_AFTER_MS + 1
    await manySegments(a, 3, 100)
    const fresh = device('ccccccccccccc')
    const mark = target.seenPaths.length
    await fresh.sync()
    const reads = target.seenPaths.slice(mark).filter((p) => p.startsWith('s/'))
    expect(reads.filter((p) => p.endsWith('.rbc'))).toHaveLength(1)
    expect(reads.filter((p) => p.endsWith('.rbs'))).toHaveLength(3)
    expect(Object.keys(fresh.local.get('library'))).toHaveLength(COMPACT_SEGMENTS + 4)
  })

  it('keeps the previous checkpoint beside the new one and deletes the one before', async () => {
    const { a, target, clock } = await started()
    for (let round = 0; round < 3; round++) { await manySegments(a, COMPACT_SEGMENTS + 1, round * 100); clock.now += RETIRE_AFTER_MS + 1; await a.sync() }
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbc'))).toHaveLength(2)
    expect(a.memory.current?.own.checkpoints).toHaveLength(2)
  })

  it('compaction while another device reads: the reader falls back to the checkpoint, nothing is lost', async () => {
    const { a, b, target, clock } = await started()
    await manySegments(a, 5)
    await b.sync() // b has read the manifest and part of the stream
    await manySegments(a, COMPACT_SEGMENTS, 5)
    clock.now += RETIRE_AFTER_MS + 1
    await a.sync() // the 21 segments the checkpoint covers are gone from the target, the 4 after it stay
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbs'))).toHaveLength(4)
    const report = await b.sync()
    expect(report.waiting).toEqual([])
    expect(Object.keys(b.local.get('library'))).toHaveLength(COMPACT_SEGMENTS + 5)
  })

  it('compacts a board when asked, and skips a stream another device has unapplied files in', async () => {
    const { a, b, target } = await started()
    a.local.eagerStreams = b.local.eagerStreams = [boardStream('b1')]
    a.local.addEvents('b1', 'e1')
    await a.sync()
    b.local.addEvents('b1', 'e2')
    await b.sync()
    await a.sync({ compact: [boardStream('b1')] })
    expect([...target.objects().keys()].filter((p) => p.endsWith('.rbc'))).toHaveLength(1)
    const fresh = await started()
    fresh.a.local.eagerStreams = [boardStream('b2')]
    fresh.a.local.addEvents('b2', 'e1')
    await fresh.a.sync()
    fresh.b.local.eagerStreams = [boardStream('b2')]
    fresh.b.local.addEvents('b2', 'e9')
    await fresh.b.sync()
    // a has not read b's segment yet: the checkpoint would not cover it, so a does not write one before it has.
    fresh.a.local.addEvents('b2', 'e4')
    const report = await fresh.a.sync({ compact: [boardStream('b2')] })
    expect(report.pulled).toBe(1)
    expect([...fresh.target.objects().keys()].filter((p) => p.endsWith('.rbc'))).toHaveLength(1)
  })

  it('deleting a stream removes its files for every device and nothing else', async () => {
    const { a, target } = await started()
    a.local.eagerStreams = ['library', boardStream('b1')]
    a.local.addEvents('b1', 'e1')
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    const before = target.objects().size
    await a.engine.deleteStream(boardStream('b1'))
    expect(target.objects().size).toBe(before - 1)
    expect(a.memory.current?.own.segments.every((s) => s.stream === 'library')).toBe(true)
  })

  it('deleting the vault removes every vault file and forgets what the engine remembered', async () => {
    const { a, target } = await started()
    a.local.set('library', 'k', 'v', '0001')
    await a.sync()
    await a.engine.deleteVault()
    expect(target.objects().size).toBe(0)
    expect(a.memory.current?.seq).toBe(0)
  })
})
