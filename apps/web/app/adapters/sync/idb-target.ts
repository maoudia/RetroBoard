/**
 * `SyncTargetPort` over IndexedDB (change user-drive-storage, "Local storage and migration"): the browser's own copy of
 * a vault, and the offline cache of every later target. It stores bytes the vault layer already sealed, like any other
 * target, and never sees a key. One `vault` object store, keyed by path; an etag per write makes `ifMatch` and 'absent'
 * work inside one transaction, so two tabs cannot both win a create-only write.
 */
import {
  type ObjectInfo, type ObjectPath, type PutOptions, type SyncTargetPort, type TargetCapabilities, TargetError, isObjectPath, isObjectPrefix,
} from '@retroboard/application'
import { openReplicaDb } from '../replica-idb'

interface Row { path: string; bytes: Uint8Array; etag: string; modifiedAt: number }

const CAPABILITIES: TargetCapabilities = { conditionalPut: 'etag', atomicPut: true, listsModifiedTime: true, maxObjectBytes: 32 * 1024 * 1024 }

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) })

/** Maps what IndexedDB throws to the one error the engine understands. Nothing about the data goes into it. */
export function mapIdbError(e: unknown): TargetError {
  if (e instanceof TargetError) return e
  const name = (e as { name?: string } | null)?.name
  if (name === 'QuotaExceededError') return new TargetError('target-full', { cause: e })
  if (name === 'SecurityError' || name === 'NotAllowedError') return new TargetError('permission-needed', { cause: e })
  return new TargetError('unreachable', { cause: e })
}

const etagOf = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('')

export function createIdbTarget(db: Promise<IDBDatabase> = openReplicaDb(), now: () => number = Date.now): SyncTargetPort {
  const guard = async <T>(op: () => Promise<T>): Promise<T> => {
    try { return await op() } catch (e) { throw mapIdbError(e) }
  }
  const valid = (path: string, prefix = false) => { if (!(prefix ? isObjectPrefix(path) : isObjectPath(path))) throw new TargetError('unsupported') }
  const store = async (mode: IDBTransactionMode) => {
    const tx = (await db).transaction('vault', mode)
    return { tx, rows: tx.objectStore('vault') }
  }
  const info = (r: Row): ObjectInfo => ({ path: r.path, size: r.bytes.length, etag: r.etag, modifiedAt: r.modifiedAt })

  return {
    kind: 'idb',
    capabilities: CAPABILITIES,
    async *list(prefix: ObjectPath) {
      valid(prefix, true)
      const found = await guard(async () => {
        const { rows } = await store('readonly')
        return (await req(rows.getAll(IDBKeyRange.bound(prefix, `${prefix}￿`)))) as Row[]
      })
      for (const row of found.sort((a, b) => (a.path < b.path ? -1 : 1))) yield info(row)
    },
    get: (path) => guard(async () => {
      valid(path)
      const row = (await req((await store('readonly')).rows.get(path))) as Row | undefined
      return row ? { bytes: row.bytes.slice(), etag: row.etag } : null
    }),
    put: (path, bytes, opts: PutOptions = {}) => guard(async () => {
      valid(path)
      if (bytes.length > CAPABILITIES.maxObjectBytes) throw new TargetError('too-large')
      const { tx, rows } = await store('readwrite')
      const current = (await req(rows.get(path))) as Row | undefined
      if (opts.ifMatch !== undefined && (opts.ifMatch === 'absent' ? current : current?.etag !== opts.ifMatch)) {
        tx.abort()
        throw new TargetError('precondition-failed')
      }
      const etag = etagOf()
      rows.put({ path, bytes: bytes.slice(), etag, modifiedAt: now() } satisfies Row)
      await done(tx)
      return { etag }
    }),
    delete: (path) => guard(async () => {
      valid(path)
      const { tx, rows } = await store('readwrite')
      rows.delete(path)
      await done(tx)
    }),
    stat: (path) => guard(async () => {
      valid(path)
      const row = (await req((await store('readonly')).rows.get(path))) as Row | undefined
      return row ? info(row) : null
    }),
  }
}
