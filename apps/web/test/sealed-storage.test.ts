import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalSealer, resetDeviceKeyCache } from '../app/adapters/device-key'
import { createSealedStorage, forgetDrafts } from '../app/adapters/sealed-storage'
import { createIdbReplicaStore, openReplicaDb } from '../app/adapters/replica-idb'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

describe('sealed storage (drafts at rest)', () => {
  beforeEach(() => resetDeviceKeyCache())
  const sealer = () => createLocalSealer(openReplicaDb(new IDBFactory()))

  it('keeps the text out of the storage and reads it back', async () => {
    const mem = new MemStorage()
    const s = createSealedStorage(sealer(), mem)
    await s.write('retroboard:drafts:r', [{ id: 'a', text: 'my private thought' }])
    expect(mem.getItem('retroboard:drafts:r')).not.toContain('private')
    expect(await s.read('retroboard:drafts:r', [])).toEqual([{ id: 'a', text: 'my private thought' }])
  })

  it('migrates a clear entry on first read: returned once, sealed afterwards', async () => {
    const mem = new MemStorage()
    mem.setItem('retroboard:drafts:r', JSON.stringify([{ id: 'a', text: 'old clear draft' }]))
    const s = createSealedStorage(sealer(), mem)
    expect(await s.read('retroboard:drafts:r', [])).toEqual([{ id: 'a', text: 'old clear draft' }])
    expect(mem.getItem('retroboard:drafts:r')).not.toContain('clear draft')
    expect(await s.read('retroboard:drafts:r', [])).toEqual([{ id: 'a', text: 'old clear draft' }])
  })

  it('falls back on missing, foreign or unreadable data', async () => {
    const mem = new MemStorage()
    const s = createSealedStorage(sealer(), mem)
    expect(await s.read('nothing', ['x'])).toEqual(['x'])
    mem.setItem('bad', 'not json {')
    expect(await s.read('bad', ['x'])).toEqual(['x'])
  })

  it('is memory only without a key (private mode): nothing read, nothing written', async () => {
    const mem = new MemStorage()
    mem.setItem('k', JSON.stringify(['clear']))
    const s = createSealedStorage(null, mem)
    await s.write('other', ['secret'])
    expect(mem.getItem('other')).toBeNull()
    expect(await s.read('k', [])).toEqual([])
  })

  it('forgets the drafts of purged rooms with their board (retention sweep)', async () => {
    const clock = { t: 1_000 }
    const mem = new MemStorage()
    const s = createSealedStorage(sealer(), mem)
    const db = openReplicaDb(new IDBFactory())
    const replica = createIdbReplicaStore(db, () => clock.t)
    await replica.append('old', [{ id: '1', data: 'x' }])
    clock.t = 50_000
    await replica.append('fresh', [{ id: '1', data: 'y' }])
    for (const room of ['old', 'fresh']) { await s.write(`retroboard:drafts:${room}`, ['d']); await s.write(`retroboard:compose:${room}`, { c: 't' }) }
    // A later tab (start-up sweep): nothing it opened yet is in use.
    forgetDrafts(await createIdbReplicaStore(db, () => clock.t).purge(10_000), mem)
    expect(mem.getItem('retroboard:drafts:old')).toBeNull()
    expect(mem.getItem('retroboard:compose:old')).toBeNull()
    expect(mem.getItem('retroboard:drafts:fresh')).not.toBeNull()
    expect(mem.getItem('retroboard:compose:fresh')).not.toBeNull()
  })
})
