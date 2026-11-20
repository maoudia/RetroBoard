/**
 * Browser storage whose values are sealed with the device key (change local-data-durability). Private drafts and typed
 * text pass through it, so they are never readable as plain text in localStorage. Without a sealer (no IndexedDB: private
 * modes) nothing is read or written: the caller keeps its data in memory only.
 */
type Sealer = { seal(text: string): Promise<string>; open(sealed: string): Promise<string | null> }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface SealedStorage {
  /** The value under `key`; a clear JSON value of an earlier version is read once and sealed in place. */
  read<T>(key: string, fallback: T): Promise<T>
  write(key: string, value: unknown): Promise<void>
  remove(key: string): void
}

export function createSealedStorage(sealer: Sealer | null, storage: Store): SealedStorage {
  return {
    async read<T>(key: string, fallback: T): Promise<T> {
      if (!sealer) return fallback
      try {
        const raw = storage.getItem(key)
        if (raw === null) return fallback
        const opened = await sealer.open(raw)
        if (opened !== null) return JSON.parse(opened) as T
        // Not sealed: a clear entry written before sealing. Seal it now so it does not stay readable.
        const legacy = JSON.parse(raw) as T
        storage.setItem(key, await sealer.seal(raw))
        return legacy
      } catch { return fallback }
    },
    async write(key, value) {
      if (!sealer) return
      try { storage.setItem(key, await sealer.seal(JSON.stringify(value))) } catch { /* quota, blocked storage, no key: kept in memory */ }
    },
    remove(key) { try { storage.removeItem(key) } catch { /* ignore */ } },
  }
}

/** Removes the drafts and the typed text kept for rooms whose local copy was deleted. */
export function forgetDrafts(roomIds: readonly string[], storage: Pick<Storage, 'removeItem'> = localStorage): void {
  for (const id of roomIds) { try { storage.removeItem(`retroboard:drafts:${id}`); storage.removeItem(`retroboard:compose:${id}`) } catch { /* ignore */ } }
}
