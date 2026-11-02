/**
 * Fallback replica for browsers where IndexedDB is unavailable or refuses to open (some private
 * modes): ciphertext envelopes kept in sessionStorage. A reload, back and forward in the same tab
 * reopen the board from here; closing the tab forgets it (change board-recovery). Nothing leaves the device.
 */
import type { ReplicaRecord, ReplicaStorePort } from '@retroboard/application'

const PREFIX = 'retroboard:rep:'
const USED = 'retroboard:rep-used:'

export function createSessionReplicaStore(storage: Storage, now: () => number = Date.now): ReplicaStorePort {
  const read = (room: string): ReplicaRecord[] => {
    try { const v = JSON.parse(storage.getItem(PREFIX + room) ?? '[]') as unknown; return Array.isArray(v) ? (v as ReplicaRecord[]) : [] } catch { return [] }
  }
  return {
    async load(roomId) { return read(roomId) },
    async append(roomId, records) {
      const have = new Map(read(roomId).map((r) => [r.id, r]))
      for (const r of records) if (!have.has(r.id)) have.set(r.id, { id: r.id, data: r.data })
      storage.setItem(PREFIX + roomId, JSON.stringify([...have.values()]))
      storage.setItem(USED + roomId, String(now()))
    },
    async purge(before) {
      let n = 0
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i)
        if (!key?.startsWith(USED)) continue
        const room = key.slice(USED.length)
        if (Number(storage.getItem(key)) < before) { storage.removeItem(PREFIX + room); storage.removeItem(key); n++ }
      }
      return n
    },
    async delete(roomId) { storage.removeItem(PREFIX + roomId); storage.removeItem(USED + roomId) },
  }
}

/**
 * The durable store first; when it cannot open or write, the tab keeps the board in sessionStorage.
 * Reads merge both, so a board written before the failure is still found.
 */
export function withSessionFallback(primary: ReplicaStorePort | null, session: ReplicaStorePort): ReplicaStorePort {
  if (!primary) return session
  const ids = (rs: ReplicaRecord[]) => new Set(rs.map((r) => r.id))
  return {
    async load(roomId) {
      const [a, b] = await Promise.all([primary.load(roomId).catch(() => [] as ReplicaRecord[]), session.load(roomId).catch(() => [] as ReplicaRecord[])])
      const seen = ids(a)
      return [...a, ...b.filter((r) => !seen.has(r.id))]
    },
    async append(roomId, records) {
      try { await primary.append(roomId, records) } catch { await session.append(roomId, records) }
    },
    async purge(before) {
      const [a, b] = await Promise.all([primary.purge(before).catch(() => 0), session.purge(before).catch(() => 0)])
      return a + b
    },
    async delete(roomId) { await Promise.all([primary.delete(roomId).catch(() => undefined), session.delete(roomId).catch(() => undefined)]) },
  }
}
