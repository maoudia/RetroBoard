/**
 * Passcodes remembered on this device (change password-by-default), so the creator and returning
 * participants are not asked again. Each code is sealed with a non-extractable AES-GCM key kept in
 * IndexedDB: a copy of the database files alone does not reveal it. When IndexedDB or WebCrypto is
 * missing, or for "while the tab is open", the code lives in sessionStorage for the tab only.
 */
const DB = 'retroboard-vault'
const SESSION = 'retroboard:pass:'
const KEY_ID = 'wrap'

export interface PasscodeVault {
  get(room: string): Promise<string | null>
  set(room: string, code: string): Promise<void>
  delete(room: string): Promise<void>
  /** Forget codes not used since `before`. */
  purge(before: number): Promise<number>
}

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) })

export function openVaultDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const open = factory.open(DB, 1)
  open.onupgradeneeded = () => { open.result.createObjectStore('keys'); open.result.createObjectStore('codes', { keyPath: 'room' }) }
  return req(open)
}

interface Sealed { room: string; iv: Uint8Array; ct: ArrayBuffer; usedAt: number }

export function createIdbVault(db: Promise<IDBDatabase>, now: () => number = Date.now, subtle: SubtleCrypto = crypto.subtle): PasscodeVault {
  const key = async (): Promise<CryptoKey> => {
    const d = await db
    const have = await req(d.transaction('keys').objectStore('keys').get(KEY_ID)) as CryptoKey | undefined
    if (have) return have
    const fresh = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const tx = d.transaction('keys', 'readwrite'); tx.objectStore('keys').put(fresh, KEY_ID); await done(tx)
    return fresh
  }
  const aad = (room: string) => new TextEncoder().encode(`retroboard-passcode:${room}`)
  return {
    async get(room) {
      const d = await db
      const row = await req(d.transaction('codes').objectStore('codes').get(room)) as Sealed | undefined
      if (!row) return null
      try {
        const pt = await subtle.decrypt({ name: 'AES-GCM', iv: row.iv as BufferSource, additionalData: aad(room) }, await key(), row.ct)
        const tx = d.transaction('codes', 'readwrite'); tx.objectStore('codes').put({ ...row, usedAt: now() }); await done(tx)
        return new TextDecoder().decode(pt)
      } catch { return null }
    },
    async set(room, code) {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad(room) }, await key(), new TextEncoder().encode(code))
      const tx = (await db).transaction('codes', 'readwrite')
      tx.objectStore('codes').put({ room, iv, ct, usedAt: now() } satisfies Sealed)
      await done(tx)
    },
    async delete(room) {
      const tx = (await db).transaction('codes', 'readwrite'); tx.objectStore('codes').delete(room); await done(tx)
    },
    async purge(before) {
      const d = await db
      const rows = await req(d.transaction('codes').objectStore('codes').getAll()) as Sealed[]
      const stale = rows.filter((r) => r.usedAt < before)
      if (!stale.length) return 0
      const tx = d.transaction('codes', 'readwrite')
      for (const r of stale) tx.objectStore('codes').delete(r.room)
      await done(tx)
      return stale.length
    },
  }
}

/** Tab-only vault: sessionStorage, cleared when the tab closes. */
export function createSessionVault(storage: Storage): PasscodeVault {
  return {
    async get(room) { try { return storage.getItem(SESSION + room) } catch { return null } },
    async set(room, code) { try { storage.setItem(SESSION + room, code) } catch { /* no storage: memory only */ } },
    async delete(room) { try { storage.removeItem(SESSION + room) } catch { /* ignore */ } },
    async purge() { return 0 },
  }
}

/**
 * Durable vault with a tab fallback; `tabOnly()` (retention "while the tab is open") keeps everything in the tab.
 * Reads look in both, so a code kept before a change of retention is still found.
 */
export function createVault(durable: PasscodeVault | null, session: PasscodeVault, tabOnly: () => boolean): PasscodeVault {
  return {
    async get(room) { return (await session.get(room)) ?? (durable ? await durable.get(room).catch(() => null) : null) },
    async set(room, code) {
      if (!tabOnly() && durable) { try { await durable.set(room, code); return } catch { /* fall back to the tab */ } }
      await session.set(room, code)
    },
    async delete(room) { await Promise.all([session.delete(room), durable?.delete(room).catch(() => undefined)]) },
    async purge(before) { return durable ? durable.purge(before).catch(() => 0) : 0 },
  }
}
