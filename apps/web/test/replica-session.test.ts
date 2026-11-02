import { describe, expect, it } from 'vitest'
import type { ReplicaStorePort } from '@retroboard/application'
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

const broken: ReplicaStorePort = {
  load: () => Promise.reject(new Error('no idb')), append: () => Promise.reject(new Error('no idb')),
  purge: () => Promise.reject(new Error('no idb')), delete: () => Promise.reject(new Error('no idb')),
}

describe('session replica (private modes)', () => {
  it('keeps envelopes per room, idempotently, and forgets on delete', async () => {
    const s = createSessionReplicaStore(new MemStorage())
    await s.append('r1', [{ id: 'a', data: '1' }, { id: 'b', data: '2' }])
    await s.append('r1', [{ id: 'b', data: '2' }, { id: 'c', data: '3' }])
    expect((await s.load('r1')).map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(await s.load('r2')).toEqual([])
    await s.delete('r1')
    expect(await s.load('r1')).toEqual([])
  })

  it('purges rooms not used since the limit', async () => {
    const clock = { t: 1_000 }
    const s = createSessionReplicaStore(new MemStorage(), () => clock.t)
    await s.append('old', [{ id: 'a', data: '1' }])
    clock.t = 50_000
    await s.append('fresh', [{ id: 'a', data: '1' }])
    expect(await s.purge(10_000)).toBe(1)
    expect(await s.load('old')).toEqual([])
    expect(await s.load('fresh')).toHaveLength(1)
  })

  it('falls back to the tab copy when the durable store fails, and reads merge both', async () => {
    const store = withSessionFallback(broken, createSessionReplicaStore(new MemStorage()))
    await store.append('r1', [{ id: 'a', data: '1' }])
    expect((await store.load('r1')).map((r) => r.id)).toEqual(['a'])
    expect(await withSessionFallback(null, createSessionReplicaStore(new MemStorage())).load('r1')).toEqual([])
  })
})
