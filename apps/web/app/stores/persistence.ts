import { requestPersistence } from '~/adapters/replica-idb'
import { safeStorage } from '~/utils/storage'

const PROPOSED = 'retroboard:board-file-proposed'
const KEPT = 50

/**
 * Whether the browser agreed to keep the boards of this device (`navigator.storage.persist()`), and the one-time proposal
 * of a board file when it did not (change local-data-durability). Device state: never synced with the settings.
 * `null` is "not known": no storage API, or the question was not asked yet.
 */
export const usePersistenceStore = defineStore('persistence', () => {
  const persisted = ref<boolean | null>(null)

  /** Asks the browser to keep the boards, and remembers its answer. */
  async function request() {
    if (!navigator.storage?.persist) return
    persisted.value = await requestPersistence()
  }
  /** One proposal per board, ever: true the first time a board asks, false afterwards. */
  function propose(roomId: string): boolean {
    const seen = safeStorage.get<string[]>(PROPOSED, [])
    if (seen.includes(roomId)) return false
    safeStorage.set(PROPOSED, [...seen, roomId].slice(-KEPT))
    return true
  }
  return { persisted, request, propose }
})
