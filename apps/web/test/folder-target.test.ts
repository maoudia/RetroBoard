import { describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import { type ContractFault, type FakeDirectory, createFakeDirectory, runSyncTargetContract } from '@retroboard/testkit'
import { MAX_FOLDER_PATH, createFolderTarget, isVaultName, mapFolderError, nameHash } from '../app/adapters/sync/folder-target'

const bytes = (...n: number[]) => new Uint8Array(n)
const SID = 'abcdefghijklmnopqrstuvwxyz'.replace(/[01]/g, 'a').slice(0, 26)

/** A directory whose next call fails the way the browser would: one operation, then it works again. */
function faulty(dir: FakeDirectory) {
  let next: string | null = null
  const wrap = <T extends object>(d: T): T => new Proxy(d, {
    get(t, p) {
      const v = Reflect.get(t, p) as unknown
      if (typeof v !== 'function') return v
      return (...a: unknown[]) => {
        if (next && ['getFileHandle', 'getDirectoryHandle', 'entries'].includes(String(p))) { const e = next; next = null; throw new DOMException('simulated', e) }
        const r = (v as (...x: unknown[]) => unknown).apply(t, a)
        return p === 'getDirectoryHandle' ? (r as Promise<object>).then(wrap) : r
      }
    },
  })
  return { dir: wrap(dir), fail: (name: string) => { next = name } }
}

const FAULTS: Partial<Record<ContractFault, string>> = { 'permission-revoked': 'NotAllowedError', 'quota-full': 'QuotaExceededError', offline: 'InvalidStateError' }

runSyncTargetContract('folder (fake directory handle)', () => {
  const f = faulty(createFakeDirectory())
  return { target: createFolderTarget(f.dir), faults: ['permission-revoked', 'quota-full', 'offline'], inject: (fault) => f.fail(FAULTS[fault]!) }
})

const collect = async (it: AsyncIterable<{ path: string; size: number; etag: string }>) => { const out = []; for await (const o of it) out.push(o); return out }

describe('folder target: what it reads and what it leaves alone', () => {
  it('lists only names of a vault, whatever else the person and their sync client put in the folder', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    await target.put(`s/${SID}/dev1-00000001-aaaaaaaa.rbs`, bytes(1))
    for (const junk of ['notes.txt', 'photo.jpg', 'x.tmp', 'a.crswap', '~$x.rbs', '.~lock.x#', '.syncthing.x.rbs.tmp', '.sb-1234', 'x.partial', 'x.crdownload', 'UPPER.rbs', 'a b.rbs', 'dev1-00000002-aaaaaaaa (conflicted copy 2026-01-01).rbs', 'dev1-00000003-aaaaaaaa-DESKTOP-1.rbs', 'dev1-00000004-aaaaaaaa.sync-conflict-20260101-120000-ABCDEFG.rbs', 'dev1-00000005-aaaaaaaa.sync-conflict-20260101-120000-abcdefg.rbs', '.dev1-00000006-aaaaaaaa.rbs.icloud', 'con.rbs', 'nul.rbs']) {
      dir.drop(`s/${SID}/${junk}`, bytes(9))
    }
    dir.drop('s/notes.txt', bytes(9))
    dir.drop('s/Mixed/x.rbs', bytes(9))
    dir.drop('stray.rbs/x.rbs', bytes(9))
    expect((await collect(target.list('s/'))).map((o) => o.path)).toEqual([`s/${SID}/dev1-00000001-aaaaaaaa.rbs`])
    expect((await collect(target.list(`s/${SID}/`))).map((o) => o.path)).toEqual([`s/${SID}/dev1-00000001-aaaaaaaa.rbs`])
    // Nothing is deleted: the folder still holds all of it.
    expect(dir.files().length).toBe(1 + 19 + 3)
  })

  it('lists a zero-byte file and a half file as they are: the engine decides they are not ready', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    dir.drop(`s/${SID}/dev1-00000001-aaaaaaaa.rbs`, new Uint8Array(0))
    dir.dropHalf(`s/${SID}/dev1-00000002-aaaaaaaa.rbs`, bytes(1, 2, 3, 4))
    expect((await collect(target.list(`s/${SID}/`))).map((o) => o.size)).toEqual([0, 2])
  })

  it('shows conflict copies of info.json and of a manifest under a name of its own, and deletes only the copy it is told to', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    await target.put('info.json', bytes(1))
    await target.put('m/abcd1234.rbm', bytes(2))
    const copies = ['info (conflicted copy 2026-01-01).json', 'info-DESKTOP-ABC.json', 'info.sync-conflict-20260101-120000-ABCDEFG.json', 'info (1).json']
    for (const c of copies) dir.drop(c, bytes(7))
    dir.drop('m/abcd1234 (conflicted copy).rbm', bytes(8))
    dir.drop('infotext.json', bytes(1))
    dir.drop('inf.json', bytes(1))
    const listed = (await collect(target.list('info'))).map((o) => o.path)
    // The prefix is a string prefix: `infotext.json` is a vault-shaped name that starts with it, and the engine skips it.
    expect(listed).toHaveLength(6)
    expect(listed).toContain('info.json')
    expect(listed).toContain('infotext.json')
    const synthetic = listed.filter((p) => p.startsWith('info.copy-'))
    expect(synthetic).toHaveLength(4)
    for (const p of synthetic) expect(p).toMatch(/^info\.copy-[0-9a-f]{8}\.json$/)
    expect((await target.get(synthetic[0]!))?.bytes).toEqual(bytes(7))
    expect((await collect(target.list('m/'))).map((o) => o.path)).toEqual([`m/abcd1234.copy-${nameHash('abcd1234 (conflicted copy).rbm')}.rbm`, 'm/abcd1234.rbm'].sort())
    await target.delete(synthetic[0]!)
    expect(dir.files().filter((f) => f.startsWith('info')).length).toBe(1 + 3 + 1) // info.json, the 3 other copies and infotext.json stay
    expect(dir.read('info.json')).toEqual(bytes(1))
    await target.delete('info.copy-00000000.json') // no such copy: nothing happens
    await expect(target.put(synthetic[1]!, bytes(1))).rejects.toMatchObject({ code: 'unsupported' })
  })

  it('does not hand out a manifest copy for another device or a bad name', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    dir.drop('m/ab (1).rbm', bytes(1))
    dir.drop('m/abcd1234.rbm.tmp', bytes(1))
    expect(await collect(target.list('m/'))).toEqual([])
    expect(await target.get('m/abcd1234.copy-0a0a0a0a.rbm')).toBeNull()
  })

  it('refuses names a file system or a sync client would mangle', async () => {
    const target = createFolderTarget(createFakeDirectory())
    for (const bad of ['s/aaaa/con.rbs', 's/aaaa/nul.rbs', 's/aaaa/com1.rbs', 's/aaaa/lpt9.rbm', 's/aaaa/x.txt', 's/aaaa/x.rbs.tmp', 's/aaaa/a-conflict-b.rbs', `s/${'a'.repeat(MAX_FOLDER_PATH)}.rbs`, 's/aaaa/x.', 'S/aaaa/x.rbs', 's/aaaa/é.rbs']) {
      await expect(target.put(bad, bytes(1)), bad).rejects.toMatchObject({ code: 'unsupported' })
    }
    expect(isVaultName('abc.rbs')).toBe(true)
    expect(isVaultName('abc.conflict.rbs')).toBe(false)
    expect(isVaultName('.abc.rbs')).toBe(false)
  })

  it('an evicted file (iCloud placeholder) reads as not there yet, and reading it asks for the download', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    dir.drop(`s/${SID}/.dev1-00000001-aaaaaaaa.rbs.icloud`, bytes(1))
    const before = dir.calls.getFile
    expect(await target.get(`s/${SID}/dev1-00000001-aaaaaaaa.rbs`)).toBeNull()
    expect(dir.calls.getFile).toBe(before + 1)
    expect(await target.stat(`s/${SID}/dev1-00000001-aaaaaaaa.rbs`)).toBeNull()
  })
})

describe('folder target: writes', () => {
  it('writes through a swap and checks the size after: the etag is size and time', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    const { etag } = await target.put('m/abcd1234.rbm', bytes(1, 2, 3))
    expect(etag).toMatch(/^3:\d+$/)
    expect(dir.calls.createWritable).toBe(1)
    const again = await target.put('m/abcd1234.rbm', bytes(1, 2, 3))
    expect(again.etag).not.toBe(etag)
    expect(await target.stat('m/abcd1234.rbm')).toMatchObject({ size: 3, etag: again.etag })
  })

  it('a write that did not keep every byte is an error, not a success', async () => {
    const dir = createFakeDirectory()
    const real = dir.getFileHandle.bind(dir)
    dir.getFileHandle = async (name, options) => {
      const h = await real(name, options)
      return { ...h, createWritable: async () => { const w = await h.createWritable(); return { ...w, write: async (d: Uint8Array) => w.write(d.slice(0, d.length - 1)) } } }
    }
    await expect(createFolderTarget(dir).put('info.json', bytes(1, 2, 3))).rejects.toMatchObject({ code: 'unreachable' })
  })

  it('a failed write leaves the old file whole', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    await target.put('info.json', bytes(1, 2, 3))
    dir.failNextWrite('QuotaExceededError')
    await expect(target.put('info.json', bytes(9, 9))).rejects.toMatchObject({ code: 'target-full' })
    expect(dir.read('info.json')).toEqual(bytes(1, 2, 3))
  })

  it('creates a missing sub folder on write and reads a missing one as empty', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    expect(await collect(target.list(`s/${SID}/`))).toEqual([])
    expect(await target.get(`s/${SID}/x-00000001-aaaaaaaa.rbs`)).toBeNull()
    await target.put(`s/${SID}/x-00000001-aaaaaaaa.rbs`, bytes(1))
    expect(dir.files()).toEqual([`s/${SID}/x-00000001-aaaaaaaa.rbs`])
  })

  it('create-only and ifMatch work as far as a folder can', async () => {
    const target = createFolderTarget(createFakeDirectory())
    const { etag } = await target.put('info.json', bytes(1), { ifMatch: 'absent' })
    await expect(target.put('info.json', bytes(2), { ifMatch: 'absent' })).rejects.toMatchObject({ code: 'precondition-failed' })
    await expect(target.put('info.json', bytes(2), { ifMatch: '9:9' })).rejects.toMatchObject({ code: 'precondition-failed' })
    await target.put('info.json', bytes(3), { ifMatch: etag })
    await expect(target.put('s/x/y.rbs', bytes(3), { ifMatch: etag })).rejects.toMatchObject({ code: 'precondition-failed' })
  })

  it('refuses an object over the limit', async () => {
    const target = createFolderTarget(createFakeDirectory())
    expect(target.capabilities).toEqual({ conditionalPut: 'none', atomicPut: true, listsModifiedTime: true, maxObjectBytes: 64 * 1024 * 1024 })
    await expect(target.put('info.json', { length: 64 * 1024 * 1024 + 1 } as Uint8Array)).rejects.toMatchObject({ code: 'too-large' })
  })

  it('a pass that lists m/ reads one file per manifest, not per segment', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    for (let i = 0; i < 50; i++) await target.put(`s/${SID}/dev1-${String(i).padStart(8, '0')}-aaaaaaaa.rbs`, bytes(i))
    await target.put('m/abcd1234.rbm', bytes(1))
    const before = dir.calls.getFile
    await collect(target.list('m/'))
    expect(dir.calls.getFile - before).toBe(1)
  })
})

describe('folder target: errors', () => {
  it('a folder that is gone is "not found", a revoked permission is "permission needed"', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    await target.put('info.json', bytes(1))
    dir.permission = 'denied'
    await expect(collect(target.list('info'))).rejects.toMatchObject({ code: 'permission-needed' })
    await expect(target.put('info.json', bytes(1))).rejects.toMatchObject({ code: 'permission-needed' })
    dir.permission = 'granted'
    dir.remove()
    await expect(collect(target.list('info'))).rejects.toMatchObject({ code: 'not-found' })
  })

  it('maps what a browser throws and keeps the message free of names', () => {
    const map = (name: string) => mapFolderError(new DOMException('secret-file-name.rbs', name))
    expect(map('NotAllowedError').code).toBe('permission-needed')
    expect(map('SecurityError').code).toBe('permission-needed')
    expect(map('NotFoundError').code).toBe('not-found')
    expect(map('QuotaExceededError').code).toBe('target-full')
    expect(map('TypeMismatchError').code).toBe('unsupported')
    expect(map('NoModificationAllowedError').code).toBe('unreachable')
    expect(mapFolderError(new TypeError('x')).code).toBe('unreachable')
    expect(mapFolderError(null).code).toBe('unreachable')
    expect(map('NotAllowedError').message).toBe('permission-needed')
    const existing = new TargetError('throttled')
    expect(mapFolderError(existing)).toBe(existing)
  })

  it('hashes a name the same way every time', () => {
    expect(nameHash('info (1).json')).toBe(nameHash('info (1).json'))
    expect(nameHash('a')).toMatch(/^[0-9a-f]{8}$/)
    expect(nameHash('a')).not.toBe(nameHash('b'))
  })

  it('a folder where a file should be is unsupported, and a file where a folder should be reads as absent', async () => {
    const dir = createFakeDirectory()
    const target = createFolderTarget(dir)
    dir.drop('s', bytes(1))
    expect(await target.get('s/aaaa/x.rbs')).toBeNull()
    await expect(target.put('s/aaaa/x.rbs', bytes(1))).rejects.toMatchObject({ code: 'unsupported' })
    expect(await collect(target.list('s/'))).toEqual([])
  })
})
