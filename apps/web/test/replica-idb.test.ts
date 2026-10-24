import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createIdbReplicaStore, openReplicaDb } from '../app/adapters/replica-idb'

const make = (clock: { t: number }) => createIdbReplicaStore(openReplicaDb(new IDBFactory()), () => clock.t)

describe('IndexedDB replica store', () => {
  it('appends idempotently and loads per room', async () => {
    const clock = { t: 1_000 }
    const store = make(clock)
    await store.append('room-a', [{ id: '1', data: 'x' }, { id: '2', data: 'y' }])
    await store.append('room-a', [{ id: '2', data: 'y' }, { id: '3', data: 'z' }])
    await store.append('room-b', [{ id: '1', data: 'other' }])
    expect((await store.load('room-a')).map((r) => r.id).sort()).toEqual(['1', '2', '3'])
    expect(await store.load('room-b')).toEqual([{ id: '1', data: 'other' }])
    expect(await store.load('room-c')).toEqual([])
  })

  it('purges rooms not used since the retention limit, keeps the others', async () => {
    const clock = { t: 1_000 }
    const store = make(clock)
    await store.append('old', [{ id: '1', data: 'x' }])
    clock.t = 50_000
    await store.append('fresh', [{ id: '1', data: 'y' }])
    expect(await store.purge(10_000)).toBe(1)
    expect(await store.load('old')).toEqual([])
    expect(await store.load('fresh')).toHaveLength(1)
    await store.delete('fresh')
    expect(await store.load('fresh')).toEqual([])
  })
})
