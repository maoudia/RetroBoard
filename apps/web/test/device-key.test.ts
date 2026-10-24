import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalSealer, resetDeviceKeyCache } from '../app/adapters/device-key'
import { openReplicaDb } from '../app/adapters/replica-idb'

describe('device key sealer', () => {
  beforeEach(() => resetDeviceKeyCache())

  it('seals and opens with a non-extractable key that survives a new sealer on the same database', async () => {
    const factory = new IDBFactory()
    const a = createLocalSealer(openReplicaDb(factory))
    const sealed = await a.seal('#r=room&k=secret-key')
    expect(sealed).not.toContain('secret')
    resetDeviceKeyCache()
    const b = createLocalSealer(openReplicaDb(factory))
    expect(await b.open(sealed)).toBe('#r=room&k=secret-key')
  })

  it('returns null for tampered or foreign data', async () => {
    const s = createLocalSealer(openReplicaDb(new IDBFactory()))
    const sealed = await s.seal('x')
    expect(await s.open(sealed.slice(0, -2) + 'AA')).toBeNull()
    expect(await s.open('garbage')).toBeNull()
  })
})
