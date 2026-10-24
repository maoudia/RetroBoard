import { safeStorage } from '~/utils/storage'
import { createLocalSealer } from '~/adapters/device-key'

/** A recent board as shown. `hash` is the full link fragment (keys included). */
export interface RecentBoard { id: string; title: string; themeId: string; at: number; hash: string }
/**
 * What is persisted: title and link are sealed with the device key (they hold board content and
 * keys). Entries written by older versions may still have them in clear; they are resealed on use.
 */
interface StoredRecent { id: string; themeId: string; at: number; sealed?: string; title?: string; hash?: string }
const KEY = 'retroboard:recents'
const MAX = 12

/** Boards this browser opened recently. Stored locally only: the server never lists boards. */
export const useRecentsStore = defineStore('recents', () => {
  let stored = safeStorage.get<StoredRecent[]>(KEY, [])
  const items = ref<RecentBoard[]>([])
  const sealer = import.meta.client && typeof indexedDB !== 'undefined' ? createLocalSealer() : null

  async function refresh() {
    const out: RecentBoard[] = []
    for (const r of stored) {
      if (r.sealed && sealer) {
        const plain = await sealer.open(r.sealed)
        const v = plain ? (JSON.parse(plain) as { title: string; hash: string }) : null
        if (v) out.push({ id: r.id, themeId: r.themeId, at: r.at, title: v.title, hash: v.hash })
      } else if (r.title) {
        out.push({ id: r.id, themeId: r.themeId, at: r.at, title: r.title, hash: r.hash ?? `#${r.id}` })
      }
    }
    items.value = out
  }
  const save = () => { safeStorage.set(KEY, stored); void refresh() }

  async function touch(id: string, title: string, themeId: string, hash: string) {
    const entry: StoredRecent = sealer
      ? { id, themeId, at: Date.now(), sealed: await sealer.seal(JSON.stringify({ title, hash })) }
      // No IndexedDB (private mode): remember nothing secret.
      : { id, themeId, at: Date.now() }
    stored = [entry, ...stored.filter((r) => r.id !== id)].slice(0, MAX)
    save()
  }
  function remove(id: string) { stored = stored.filter((r) => r.id !== id); save() }
  function clear() { stored = []; save() }
  if (import.meta.client) void refresh()
  return { items, touch, remove, clear }
})
