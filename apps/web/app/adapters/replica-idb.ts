/**
 * IndexedDB adapter of the replica port. Stores ciphertext envelopes only, plus a "last used"
 * time per room for retention. Also asks the browser to keep the data (storage.persist()).
 */
import type { ReplicaRecord, ReplicaStorePort } from '@retroboard/application'

const DB = 'retroboard-replica'
const VERSION = 1

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) })

export function openReplicaDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const open = factory.open(DB, VERSION)
  open.onupgradeneeded = () => {
    const db = open.result
    const envs = db.createObjectStore('envelopes', { keyPath: ['room', 'id'] })
    envs.createIndex('room', 'room')
    db.createObjectStore('rooms', { keyPath: 'room' })
    db.createObjectStore('keys')
  }
  return req(open)
}

export function createIdbReplicaStore(db: Promise<IDBDatabase>, now: () => number = Date.now): ReplicaStorePort {
  // Rooms opened in this tab are never purged by the start-up sweep (it runs while the board loads).
  const live = new Set<string>()
  return {
    async load(roomId) {
      live.add(roomId)
      const d = await db
      const rows = await req(d.transaction('envelopes', 'readonly').objectStore('envelopes').index('room').getAll(roomId)) as { id: string; data: string }[]
      // Retention counts from the last use, not from the last write: opening a board keeps its copy.
      if (rows.length) { try { const tx = d.transaction('rooms', 'readwrite'); tx.objectStore('rooms').put({ room: roomId, usedAt: now() }); await done(tx) } catch { /* best effort */ } }
      return rows.map(({ id, data }) => ({ id, data }))
    },
    async append(roomId, records: readonly ReplicaRecord[]) {
      live.add(roomId)
      const tx = (await db).transaction(['envelopes', 'rooms'], 'readwrite')
      const envs = tx.objectStore('envelopes')
      for (const r of records) envs.put({ room: roomId, id: r.id, data: r.data })
      tx.objectStore('rooms').put({ room: roomId, usedAt: now() })
      await done(tx)
    },
    async purge(before) {
      const d = await db
      const rooms = await req(d.transaction('rooms', 'readonly').objectStore('rooms').getAll()) as { room: string; usedAt: number }[]
      const stale = rooms.filter((r) => r.usedAt < before && !live.has(r.room)).map((r) => r.room)
      for (const room of stale) await this.delete(room)
      return stale.length
    },
    async delete(roomId) {
      const d = await db
      const tx = d.transaction(['envelopes', 'rooms'], 'readwrite')
      const envs = tx.objectStore('envelopes')
      const keys = await req(envs.index('room').getAllKeys(roomId))
      for (const k of keys) envs.delete(k)
      tx.objectStore('rooms').delete(roomId)
      await done(tx)
    },
  }
}

/** Best effort: reduces eviction of the replica under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}
