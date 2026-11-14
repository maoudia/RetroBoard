import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import { type ContractFault, runSyncTargetContract } from '@retroboard/testkit'
import { createIdbTarget, mapIdbError } from '../app/adapters/sync/idb-target'
import { openReplicaDb } from '../app/adapters/replica-idb'

// The adapter uses the browser's global key range; node has none.
;(globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange

const FAULTS: Partial<Record<ContractFault, string>> = { 'permission-revoked': 'SecurityError', 'quota-full': 'QuotaExceededError', offline: 'InvalidStateError' }

/** The database with a switch that makes its next transaction fail the way a browser would. */
function faulty(real: Promise<IDBDatabase>) {
  let next: DOMException | null = null
  const db = real.then((d) => new Proxy(d, {
    get(t, p) {
      if (p === 'transaction') return (...a: Parameters<IDBDatabase['transaction']>) => { if (next) { const e = next; next = null; throw e } return t.transaction(...a) }
      const v = Reflect.get(t, p) as unknown
      return typeof v === 'function' ? v.bind(t) : v
    },
  }))
  return { db, fail: (name: string) => { next = new DOMException('simulated', name) } }
}

runSyncTargetContract('IndexedDB (fake-indexeddb)', () => {
  const f = faulty(openReplicaDb(new IDBFactory()))
  return {
    target: createIdbTarget(f.db),
    faults: ['permission-revoked', 'quota-full', 'offline'],
    inject: (fault) => f.fail(FAULTS[fault]!),
  }
})

describe('IndexedDB target', () => {
  it('maps what the browser throws, and keeps the message free of data', () => {
    expect(mapIdbError(new DOMException('x', 'QuotaExceededError')).code).toBe('target-full')
    expect(mapIdbError(new DOMException('x', 'SecurityError')).code).toBe('permission-needed')
    expect(mapIdbError(new DOMException('x', 'NotAllowedError')).code).toBe('permission-needed')
    expect(mapIdbError(new DOMException('x', 'UnknownError')).code).toBe('unreachable')
    expect(mapIdbError(new Error('boom')).code).toBe('unreachable')
    expect(mapIdbError(null).code).toBe('unreachable')
    const own = new TargetError('forbidden')
    expect(mapIdbError(own)).toBe(own)
    expect(mapIdbError(new Error('secret title')).message).toBe('unreachable')
  })
  it('holds exactly the bytes it was given and lists with sizes and modified times', async () => {
    const t = createIdbTarget(openReplicaDb(new IDBFactory()), () => 777)
    const bytes = new Uint8Array([9, 8, 7])
    const { etag } = await t.put('s/aaa/local.rbs', bytes)
    bytes[0] = 0
    expect((await t.get('s/aaa/local.rbs'))?.bytes).toEqual(new Uint8Array([9, 8, 7]))
    expect(await t.stat('s/aaa/local.rbs')).toEqual({ path: 's/aaa/local.rbs', size: 3, etag, modifiedAt: 777 })
    expect(t.capabilities).toMatchObject({ conditionalPut: 'etag', atomicPut: true })
  })
  it('lets only one of two racing create-only writes win', async () => {
    const t = createIdbTarget(openReplicaDb(new IDBFactory()))
    const results = await Promise.allSettled([t.put('info.json', new Uint8Array(1), { ifMatch: 'absent' }), t.put('info.json', new Uint8Array(2), { ifMatch: 'absent' })])
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
  })
  it('is added to a database made by the previous version without touching its data', async () => {
    const factory = new IDBFactory()
    await new Promise<void>((resolve, reject) => {
      const old = factory.open('retroboard-replica', 1)
      old.onupgradeneeded = () => {
        const db = old.result
        db.createObjectStore('envelopes', { keyPath: ['room', 'id'] }).createIndex('room', 'room')
        db.createObjectStore('rooms', { keyPath: 'room' })
        db.createObjectStore('keys')
        old.transaction!.objectStore('rooms').put({ room: 'r1', usedAt: 5 })
      }
      old.onsuccess = () => { old.result.close(); resolve() }
      old.onerror = () => reject(old.error)
    })
    const db = await openReplicaDb(factory)
    expect([...db.objectStoreNames].sort()).toEqual(['envelopes', 'keys', 'rooms', 'vault'])
    const row = await new Promise((resolve) => { const r = db.transaction('rooms').objectStore('rooms').get('r1'); r.onsuccess = () => resolve(r.result) })
    expect(row).toEqual({ room: 'r1', usedAt: 5 })
  })
})
