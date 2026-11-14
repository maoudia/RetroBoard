import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type LibraryStorePort, getEntry, libraryEntries, saveEntry } from '@retroboard/application'
import { formatInvite, parseInvite } from '@retroboard/domain'
import { randomKey } from '@retroboard/crypto'
import { createLocalSealer, resetDeviceKeyCache } from '../app/adapters/device-key'
import { openReplicaDb } from '../app/adapters/replica-idb'
import { createIdbTarget } from '../app/adapters/sync/idb-target'
import { LEGACY_RECENTS_KEY, LEGACY_SOLO_KEY, migrateLegacyLibrary, readLegacyRecents } from '../app/adapters/sync/library-migration'
import { createLibraryStore, createLocalVault, toLibrary } from '../app/adapters/sync/local-vault'
import { deviceId } from '../app/utils/device-id'

;(globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v) }, removeItem: (k) => { m.delete(k) }, clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size } }
}

/** Every stored byte of the `vault` object store, as the browser holds it. */
async function rawVault(db: IDBDatabase): Promise<{ path: string; text: string }[]> {
  const rows = await new Promise<{ path: string; bytes: Uint8Array }[]>((resolve) => { const r = db.transaction('vault').objectStore('vault').getAll(); r.onsuccess = () => resolve(r.result) })
  return rows.map((r) => ({ path: r.path, text: `${r.path}\n${new TextDecoder('latin1').decode(r.bytes)}` }))
}

const ring = (n: number) => ({ roomId: `room${String(n).padStart(18, '0')}`, roomKey: `key${String(n).padStart(19, '0')}`, facilitatorSecret: `fac${String(n).padStart(19, '0')}` })
const link = (n: number, role: 'facilitator' | 'participant', passcode = false) => `#${formatInvite({ ...ring(n), ...(passcode ? { passcode: true } : {}) }, role)}`

describe('local vault', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); resetDeviceKeyCache() })

  it('keeps the library sealed: no title, link or id is readable in what IndexedDB holds', async () => {
    const factory = new IDBFactory()
    const db = openReplicaDb(factory)
    const sealer = createLocalSealer(db)
    const store = createLibraryStore(createLocalVault(createIdbTarget(db), () => sealer.derive('local-vault/v1')))
    await store.update((l) => saveEntry(l, { boardId: 'room-CANARY-id-91bc', title: 'CANARY-title-7f3a', role: 'facilitator', origin: 'created', fragment: '#r=CANARY-fragment-2e8d', hasPasscode: false }, 1000, 'dev'))
    const rows = await rawVault(await db)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.path).toMatch(/^s\/[a-z2-7]{26}\/local\.rbs$/)
    for (const canary of ['CANARY-title-7f3a', 'room-CANARY-id-91bc', 'CANARY-fragment-2e8d', 'canary']) expect(rows[0]!.text.toLowerCase()).not.toContain(canary.toLowerCase())
    expect(getEntry(await store.load(), 'room-CANARY-id-91bc')?.title).toBe('CANARY-title-7f3a')
    // A new page load, same database and device key.
    resetDeviceKeyCache()
    const again = createLocalSealer(openReplicaDb(factory))
    const reopened = createLibraryStore(createLocalVault(createIdbTarget(openReplicaDb(factory)), () => again.derive('local-vault/v1')))
    expect(getEntry(await reopened.load(), 'room-CANARY-id-91bc')?.title).toBe('CANARY-title-7f3a')
  })

  it('derives the same key for a purpose and a different one for another, never exporting the device key', async () => {
    const sealer = createLocalSealer(openReplicaDb(new IDBFactory()))
    const a = await sealer.derive('local-vault/v1')
    expect(a).toHaveLength(32)
    expect(await sealer.derive('local-vault/v1')).toEqual(a)
    expect(await sealer.derive('other')).not.toEqual(a)
  })

  it('applies concurrent writes from several tabs without losing one', async () => {
    const db = openReplicaDb(new IDBFactory())
    const key = randomKey()
    const tabs = [1, 2, 3, 4].map(() => createLibraryStore(createLocalVault(createIdbTarget(db), async () => key)))
    await Promise.all(tabs.flatMap((store, t) => [0, 1].map((i) => store.update((l) => saveEntry(l, { boardId: `b${t}${i}`, title: 't', role: 'facilitator', origin: 'created', fragment: '#x', hasPasscode: false }, 1, `d${t}`)))))
    expect(libraryEntries(await tabs[0]!.load()).map((e) => e.boardId).sort()).toEqual(['b00', 'b01', 'b10', 'b11', 'b20', 'b21', 'b30', 'b31'])
  })

  it('treats an object it cannot open as empty and replaces it on the next write', async () => {
    const db = openReplicaDb(new IDBFactory())
    const wrongKey = createLibraryStore(createLocalVault(createIdbTarget(db), async () => randomKey()))
    await wrongKey.update((l) => saveEntry(l, { boardId: 'old', title: 't', role: 'facilitator', origin: 'created', fragment: '#x', hasPasscode: false }, 1, 'd'))
    const rightKey = createLibraryStore(createLocalVault(createIdbTarget(db), async () => randomKey()))
    expect(await rightKey.load()).toEqual({})
    await rightKey.update((l) => saveEntry(l, { boardId: 'new', title: 't', role: 'facilitator', origin: 'created', fragment: '#x', hasPasscode: false }, 1, 'd'))
    expect(Object.keys(await rightKey.load())).toEqual(['new'])
  })

  it('gives up after repeated precondition failures instead of looping', async () => {
    const real = createIdbTarget(openReplicaDb(new IDBFactory()))
    const target = { ...real, put: () => Promise.reject(Object.assign(new Error('precondition-failed'), { code: 'precondition-failed', name: 'TargetError' })) }
    const store = createLibraryStore(createLocalVault({ ...target, get: real.get, list: real.list, delete: real.delete, stat: real.stat, kind: 'idb', capabilities: real.capabilities } as never, async () => randomKey()))
    await expect(store.update((l) => l)).rejects.toBeDefined()
  })

  it('reads a stored library defensively', () => {
    expect(toLibrary(null)).toEqual({})
    expect(toLibrary({ v: 1 })).toEqual({})
    expect(toLibrary({ v: 1, records: 5 })).toEqual({})
    const good = saveEntry({}, { boardId: 'a', title: 't', role: 'facilitator', origin: 'created', fragment: '#x', hasPasscode: false }, 1, 'd')
    const bad = { v: 1, records: { a: good.a, b: good.a, c: { nonsense: true } } }
    expect(Object.keys(toLibrary(bad))).toEqual(['a'])
  })

  it('has a stable device id of 13 base32 characters', () => {
    const id = deviceId()
    expect(id).toMatch(/^[a-z2-7]{13}$/)
    expect(deviceId()).toBe(id)
    localStorage.setItem('retroboard:device', JSON.stringify('bad'))
    expect(deviceId()).toMatch(/^[a-z2-7]{13}$/)
  })
})

describe('migration of recents and solo marks', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); resetDeviceKeyCache() })

  async function legacyFixture() {
    const factory = new IDBFactory()
    const db = openReplicaDb(factory)
    const sealer = createLocalSealer(db)
    const sealed = async (n: number, title: string, hash: string, at: number) => ({ id: ring(n).roomId, themeId: 'slate', at, sealed: await sealer.seal(JSON.stringify({ title, hash })) })
    localStorage.setItem(LEGACY_RECENTS_KEY, JSON.stringify([
      await sealed(1, 'CANARY-created-board', link(1, 'facilitator', true), 3000),
      await sealed(2, 'Joined retro', link(2, 'participant'), 2000),
      { id: ring(3).roomId, themeId: 'paper', at: 1000, title: 'Clear text board', hash: link(3, 'facilitator') },
      { id: 'tampered', themeId: 'x', at: 1, sealed: 'garbage' },
      { id: 4, themeId: 'x', at: 'later' },
    ]))
    localStorage.setItem(LEGACY_SOLO_KEY, JSON.stringify([ring(1).roomId]))
    const store = createLibraryStore(createLocalVault(createIdbTarget(db), () => sealer.derive('local-vault/v1')))
    return { store, sealer, db }
  }

  it('imports the legacy list once, with roles, solo marks and times, and leaves the old keys', async () => {
    const { store, sealer, db } = await legacyFixture()
    expect(await migrateLegacyLibrary(store, (s) => sealer.open(s), 9000, 'dev')).toBe(3)
    const lib = await store.load()
    expect(libraryEntries(lib).map((e) => e.title)).toEqual(['CANARY-created-board', 'Joined retro', 'Clear text board'])
    expect(getEntry(lib, ring(1).roomId)).toMatchObject({ role: 'facilitator', origin: 'created', hasPasscode: true, solo: true, themeId: 'slate', lastActivityAt: 3000, createdAt: 3000, keepOffline: true, fragment: link(1, 'facilitator', true) })
    expect(getEntry(lib, ring(2).roomId)).toMatchObject({ role: 'participant', origin: 'joined', hasPasscode: false, solo: false, keepOffline: false })
    expect(parseInvite(getEntry(lib, ring(2).roomId)!.fragment, () => false)).not.toBeNull()
    expect(localStorage.getItem(LEGACY_RECENTS_KEY)).not.toBeNull()
    expect(localStorage.getItem(LEGACY_SOLO_KEY)).not.toBeNull()
    const text = (await rawVault(await db)).map((r) => r.text).join('\n')
    for (const readable of ['CANARY-created-board', 'Joined retro', ring(1).roomKey, ring(2).roomId, 'Clear text board']) expect(text).not.toContain(readable)
  })

  it('is idempotent, and a board forgotten afterwards is not imported again', async () => {
    const { store, sealer } = await legacyFixture()
    await migrateLegacyLibrary(store, (s) => sealer.open(s), 9000, 'dev')
    const first = await store.load()
    expect(await migrateLegacyLibrary(store, (s) => sealer.open(s), 9500, 'dev')).toBe(0)
    expect(await store.load()).toEqual(first)
    const forget = (id: string): LibraryStorePort['update'] extends (fn: infer F) => unknown ? F : never => ((l: Record<string, unknown>) => ({ ...l, [id]: { boardId: id, forgotten: true, lastActivityAt: 1, stamp: { at: 99999, device: 'dev' } } })) as never
    await store.update(forget(ring(2).roomId))
    expect(await migrateLegacyLibrary(store, (s) => sealer.open(s), 20_000, 'dev')).toBe(0)
    expect(getEntry(await store.load(), ring(2).roomId)).toBeUndefined()
  })

  it('does nothing when there is nothing to import', async () => {
    const { store, sealer } = await legacyFixture()
    localStorage.removeItem(LEGACY_RECENTS_KEY)
    expect(await migrateLegacyLibrary(store, (s) => sealer.open(s), 1, 'd')).toBe(0)
    expect(await store.load()).toEqual({})
    localStorage.setItem(LEGACY_RECENTS_KEY, JSON.stringify({ not: 'a list' }))
    expect(await readLegacyRecents(async () => null)).toEqual([])
  })
})
