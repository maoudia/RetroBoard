/**
 * What this browser remembers of a sync connection (change user-drive-storage): the folder handle, the connection record,
 * the engine's memory and the stamps of synced preferences. One small IndexedDB database of its own, never synced and
 * never in `localStorage`: a handle can only live in IndexedDB, and none of this is data of the person's boards.
 */
const DB = 'retroboard-sync'
const STORE = 'state'

export interface SyncStateStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  /** Everything of this connection: what "disconnect and forget" removes. */
  clear(): Promise<void>
}

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) })

export function createSyncStateStore(factory: IDBFactory = indexedDB): SyncStateStore {
  const db = new Promise<IDBDatabase>((resolve, reject) => {
    const open = factory.open(DB, 1)
    open.onupgradeneeded = () => { open.result.createObjectStore(STORE) }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  const store = async (mode: IDBTransactionMode) => { const tx = (await db).transaction(STORE, mode); return { tx, rows: tx.objectStore(STORE) } }
  return {
    async get<T>(key: string) { return (await req((await store('readonly')).rows.get(key))) as T | undefined },
    async set(key, value) { const { tx, rows } = await store('readwrite'); rows.put(value, key); await done(tx) },
    async delete(key) { const { tx, rows } = await store('readwrite'); rows.delete(key); await done(tx) },
    async clear() { const { tx, rows } = await store('readwrite'); rows.clear(); await done(tx) },
  }
}

/** The connection record: nothing secret, nothing synced. A OneDrive connection has no handle: its sign-in lives in the sealed token store. */
export interface Connection {
  readonly kind: 'folder' | 'onedrive'
  /** The vault found or made in the folder: choosing the folder again must lead to the same one. */
  readonly vaultId: string
  readonly folderName: string
  /** The two acknowledgement boxes were ticked: the first sync may run. */
  readonly acknowledged: boolean
  readonly connectedAt: number
}
