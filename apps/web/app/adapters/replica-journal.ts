/**
 * Write-ahead journal of the durable replica (change replica-write-ahead). An IndexedDB commit is asynchronous
 * (about 16 ms, much longer while the page paints) and a tab that goes away in between drops the transaction, so an action
 * the page already shows would be missing from this browser's copy. The journal keeps the ciphertext envelopes of such
 * writes in localStorage, synchronously, until the store has committed them; `load` returns them and the next page
 * start commits whatever a closed tab left. Same ciphertext as the replica: nothing is readable, nothing leaves the device.
 */
import type { ReplicaRecord, ReplicaStorePort } from '@retroboard/application'

const PREFIX = 'retroboard:rep-wal:'

export function withJournal(store: ReplicaStorePort, storage: Storage): ReplicaStorePort {
  const read = (room: string): ReplicaRecord[] => {
    try { const v = JSON.parse(storage.getItem(PREFIX + room) ?? '[]') as unknown; return Array.isArray(v) ? (v as ReplicaRecord[]) : [] } catch { return [] }
  }
  const save = (room: string, rows: ReplicaRecord[]) => {
    try { if (rows.length) storage.setItem(PREFIX + room, JSON.stringify(rows)); else storage.removeItem(PREFIX + room) } catch { /* best effort */ }
  }
  const forget = (room: string, done: readonly ReplicaRecord[]) => {
    const ids = new Set(done.map((r) => r.id))
    save(room, read(room).filter((r) => !ids.has(r.id)))
  }
  /** Commits what a previous page left in the journal of `room`, then drops it from the journal. */
  const drain = async (room: string) => {
    const rows = read(room)
    if (!rows.length) return
    await store.append(room, rows)
    forget(room, rows)
  }
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(PREFIX)) void drain(key.slice(PREFIX.length)).catch(() => { /* stays in the journal for the next start */ })
    }
  } catch { /* no usable storage: the store alone */ }
  return {
    stage(roomId, records) {
      const have = new Map(read(roomId).map((r) => [r.id, r]))
      for (const r of records) have.set(r.id, { id: r.id, data: r.data })
      save(roomId, [...have.values()])
    },
    async load(roomId) {
      // The journal first: a record committed between the two reads is then in the store, never in neither.
      const staged = read(roomId)
      const rows = await store.load(roomId)
      const seen = new Set(rows.map((r) => r.id))
      return [...rows, ...staged.filter((r) => !seen.has(r.id))]
    },
    async append(roomId, records) {
      await store.append(roomId, records)
      forget(roomId, records)
    },
    purge: (before) => store.purge(before),
    async delete(roomId) {
      save(roomId, [])
      await store.delete(roomId)
    },
  }
}
