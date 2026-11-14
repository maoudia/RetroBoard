import {
  type Library, type LibraryDeps, type LibraryEntry, type LibraryStorePort, type NewEntry, EMPTY_LIBRARY, archiveBoard, forgetBoard, libraryEntries,
  openLibraryBoard, recordBoardActivity, saveBoardToLibrary,
} from '@retroboard/application'
import { createIdbReplicaStore, openReplicaDb } from '~/adapters/replica-idb'
import { createLocalSealer } from '~/adapters/device-key'
import { createIdbTarget } from '~/adapters/sync/idb-target'
import { createLibraryStore, createLocalVault } from '~/adapters/sync/local-vault'
import { migrateLegacyLibrary } from '~/adapters/sync/library-migration'
import { deviceId } from '~/utils/device-id'

/** No IndexedDB (private mode, prerendering): the library lives for the session and nothing is written. */
function memoryStore(): LibraryStorePort {
  let library: Library = EMPTY_LIBRARY
  return { load: async () => library, update: async (fn) => (library = fn(library)) }
}

/**
 * The board library (change user-drive-storage): the boards the person created, and the ones they chose to save after
 * joining by link. Sealed in the browser's own vault (IndexedDB, key derived from the device key); a connected target
 * mirrors it from group 2 on. `stores/recents.ts` is a view of it.
 */
export const useLibraryStore = defineStore('library', () => {
  const records = shallowRef<Library>(EMPTY_LIBRARY)
  const ready = ref(false)
  const persistent = import.meta.client && typeof indexedDB !== 'undefined'
  const sealer = persistent ? createLocalSealer() : null
  const store = persistent ? createLibraryStore(createLocalVault(createIdbTarget(), () => sealer!.derive('local-vault/v1'))) : memoryStore()
  const deps: LibraryDeps = { store, clock: { now: Date.now }, device: import.meta.client ? deviceId() : '' }
  const replica = persistent ? createIdbReplicaStore(openReplicaDb()) : undefined
  // Other tabs of this browser write the same library: they say so, and this one reads again.
  const channel = persistent && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('retroboard-library') : null

  const entries = computed<LibraryEntry[]>(() => libraryEntries(records.value))
  const archived = computed<LibraryEntry[]>(() => libraryEntries(records.value, { archived: true }))
  const get = (boardId: string): LibraryEntry | undefined => entries.value.find((e) => e.boardId === boardId) ?? archived.value.find((e) => e.boardId === boardId)

  async function refresh() { records.value = await store.load() }
  async function changed<T>(work: Promise<T>): Promise<T> {
    const out = await work
    await refresh()
    channel?.postMessage('changed')
    return out
  }
  channel?.addEventListener('message', () => { void refresh() })

  async function load() {
    try {
      if (sealer && (await migrateLegacyLibrary(store, (s) => sealer.open(s), Date.now(), deps.device))) channel?.postMessage('changed')
      await refresh()
    } catch { /* a browser that refuses IndexedDB keeps an empty, session-long library */ }
    ready.value = true
  }
  if (import.meta.client) void load()

  return {
    records, ready, entries, archived, get, refresh,
    save: (input: NewEntry) => changed(saveBoardToLibrary(deps, input)),
    touch: (boardId: string, at?: number) => changed(recordBoardActivity(deps, boardId, at)),
    archive: (boardId: string, value = true) => changed(archiveBoard(deps, boardId, value)),
    forget: (boardId: string, opts: { deleteLocalCopy?: boolean } = {}) => changed(forgetBoard(deps, boardId, { ...(replica ? { replica } : {}), ...opts })),
    open: (boardId: string) => changed(openLibraryBoard({ ...deps, ...(replica ? { replica } : {}) }, boardId)),
  }
})
