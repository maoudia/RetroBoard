/**
 * Device key: a non-extractable AES-GCM key created once and kept in IndexedDB (a CryptoKey
 * can be stored there without ever being exported). Seals small local secrets, such as the
 * links of recent boards, so they are not readable as plain text in browser storage.
 */
import { fromBase64Url, fromUtf8, randomBytes, toBase64Url, utf8 } from '@retroboard/crypto'
import { openReplicaDb } from './replica-idb'

let cached: Promise<CryptoKey> | null = null

async function deviceKey(db: Promise<IDBDatabase>): Promise<CryptoKey> {
  const d = await db
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const r = d.transaction('keys', 'readonly').objectStore('keys').get('device')
    r.onsuccess = () => resolve(r.result as CryptoKey | undefined)
    r.onerror = () => reject(r.error)
  })
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction('keys', 'readwrite')
    tx.objectStore('keys').put(key, 'device')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return key
}

const AAD = utf8('rb/local/v1')

export function createLocalSealer(db: Promise<IDBDatabase> = openReplicaDb()) {
  const key = () => (cached ??= deviceKey(db))
  return {
    async seal(text: string): Promise<string> {
      const iv = randomBytes(12)
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, await key(), utf8(text)))
      return `${toBase64Url(iv)}.${toBase64Url(ct)}`
    },
    async open(sealed: string): Promise<string | null> {
      const [iv, ct] = sealed.split('.').map(fromBase64Url)
      if (!iv || !ct) return null
      try {
        return fromUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: AAD }, await key(), ct)))
      } catch { return null }
    },
  }
}

/** Test seam: forget the cached key (another fake IndexedDB). */
export const resetDeviceKeyCache = () => { cached = null }
