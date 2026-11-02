import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createIdbVault, createSessionVault, createVault, openVaultDb } from '../app/adapters/passcode-vault'

const memoryStorage = (): Storage => {
  const m = new Map<string, string>()
  return { get length() { return m.size }, clear: () => m.clear(), getItem: (k) => m.get(k) ?? null, key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => { m.delete(k) }, setItem: (k, v) => { m.set(k, String(v)) } }
}

describe('passcode vault', () => {
  it('seals the code: the stored record does not contain it', async () => {
    const factory = new IDBFactory()
    const vault = createIdbVault(openVaultDb(factory))
    await vault.set('room-a', 'kofbe2-Zyxpaw-myhgub')
    expect(await vault.get('room-a')).toBe('kofbe2-Zyxpaw-myhgub')
    expect(await vault.get('room-b')).toBeNull()
    const db = await openVaultDb(factory)
    const raw = await new Promise<unknown[]>((resolve) => { const r = db.transaction('codes').objectStore('codes').getAll(); r.onsuccess = () => resolve(r.result) })
    expect(JSON.stringify(raw, (_k, v) => (v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? Array.from(new Uint8Array(v as ArrayBuffer)) : v))).not.toContain('kofbe2')
  })

  it('binds the code to its room and forgets on delete and purge', async () => {
    const clock = { t: 1_000 }
    const vault = createIdbVault(openVaultDb(new IDBFactory()), () => clock.t)
    await vault.set('old', 'one')
    clock.t = 50_000
    await vault.set('fresh', 'two')
    expect(await vault.purge(10_000)).toBe(1)
    expect(await vault.get('old')).toBeNull()
    expect(await vault.get('fresh')).toBe('two')
    await vault.delete('fresh')
    expect(await vault.get('fresh')).toBeNull()
  })

  it('keeps the code in the tab only when asked, and still reads an older durable code', async () => {
    const durable = createIdbVault(openVaultDb(new IDBFactory()))
    const session = createSessionVault(memoryStorage())
    let tab = false
    const vault = createVault(durable, session, () => tab)
    await vault.set('r1', 'durable-code')
    tab = true
    await vault.set('r2', 'tab-code')
    expect(await durable.get('r2')).toBeNull()
    expect(await session.get('r2')).toBe('tab-code')
    expect(await vault.get('r1')).toBe('durable-code')
    await vault.delete('r1')
    expect(await vault.get('r1')).toBeNull()
  })

  it('works with the tab store alone', async () => {
    const vault = createVault(null, createSessionVault(memoryStorage()), () => false)
    await vault.set('r', 'x')
    expect(await vault.get('r')).toBe('x')
  })
})
