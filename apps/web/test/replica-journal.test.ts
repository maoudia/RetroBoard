import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import type { ReplicaStorePort } from '@retroboard/application'
import { createIdbReplicaStore, openReplicaDb } from '../app/adapters/replica-idb'
import { withJournal } from '../app/adapters/replica-journal'
import { createSessionReplicaStore, withSessionFallback } from '../app/adapters/replica-session'

class MemStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

describe('replica write-ahead journal', () => {
  it('returns a staged record before the store has committed it, and drops it once it has', async () => {
    const storage = new MemStorage()
    const store = withJournal(createIdbReplicaStore(openReplicaDb(new IDBFactory())), storage)
    store.stage?.('room', [{ id: 'a', data: '1' }])
    // The tab goes away here: nothing was appended, a reader still finds the record.
    expect(await store.load('room')).toEqual([{ id: 'a', data: '1' }])
    await store.append('room', [{ id: 'a', data: '1' }])
    expect(storage.length).toBe(0)
    expect(await store.load('room')).toEqual([{ id: 'a', data: '1' }])
  })

  it('commits what a closed tab left in the journal when the next page starts', async () => {
    const storage = new MemStorage()
    const db = openReplicaDb(new IDBFactory())
    withJournal(createIdbReplicaStore(db), storage).stage?.('room', [{ id: 'a', data: '1' }, { id: 'b', data: '2' }])
    // A new page: the journal is drained into the store, and the plain store alone now holds the records.
    const next = withJournal(createIdbReplicaStore(db), storage)
    await vi.waitFor(() => expect(storage.length).toBe(0))
    expect((await createIdbReplicaStore(db).load('room')).map((r) => r.id).sort()).toEqual(['a', 'b'])
    expect((await next.load('room')).map((r) => r.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps the journal when the store cannot commit, and does not duplicate a record on load', async () => {
    const storage = new MemStorage()
    const failing: ReplicaStorePort = {
      load: async () => [{ id: 'a', data: '1' }], append: () => Promise.reject(new Error('quota')),
      purge: async () => 0, delete: async () => {},
    }
    const store = withJournal(failing, storage)
    store.stage?.('room', [{ id: 'a', data: '1' }, { id: 'b', data: '2' }])
    await expect(store.append('room', [{ id: 'b', data: '2' }])).rejects.toThrow('quota')
    expect((await store.load('room')).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('forgets the journal of a deleted room, and survives a storage that throws', async () => {
    const storage = new MemStorage()
    const store = withJournal(createIdbReplicaStore(openReplicaDb(new IDBFactory())), storage)
    store.stage?.('room', [{ id: 'a', data: '1' }])
    await store.delete('room')
    expect(await store.load('room')).toEqual([])
    const full = Object.assign(new MemStorage(), { setItem: () => { throw new Error('QuotaExceededError') } })
    const noisy = withJournal(createIdbReplicaStore(openReplicaDb(new IDBFactory())), full)
    expect(() => noisy.stage?.('room', [{ id: 'a', data: '1' }])).not.toThrow()
    await noisy.append('room', [{ id: 'a', data: '1' }])
    expect(await noisy.load('room')).toHaveLength(1)
  })

  it('stages through the session fallback too', async () => {
    const session = new MemStorage()
    const journal = new MemStorage()
    const store = withSessionFallback(withJournal(createIdbReplicaStore(openReplicaDb(new IDBFactory())), journal), createSessionReplicaStore(session))
    store.stage?.('room', [{ id: 'a', data: '1' }])
    expect(journal.length).toBe(1)
    expect(session.length).toBeGreaterThan(0)
    expect(await store.load('room')).toEqual([{ id: 'a', data: '1' }])
  })
})
