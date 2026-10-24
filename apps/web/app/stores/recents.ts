import { safeStorage } from '~/utils/storage'

/** `hash` is the full link fragment (keys included): it stays in this browser only. */
export interface RecentBoard { id: string; title: string; themeId: string; at: number; hash?: string }
const KEY = 'retroboard:recents'
const MAX = 12

/** Boards this browser opened recently. Stored locally only: the server never lists boards. */
export const useRecentsStore = defineStore('recents', () => {
  const items = ref<RecentBoard[]>(safeStorage.get<RecentBoard[]>(KEY, []))
  const save = () => safeStorage.set(KEY, items.value)

  function touch(id: string, title: string, themeId: string, hash?: string) {
    items.value = [{ id, title, themeId, at: Date.now(), hash }, ...items.value.filter((r) => r.id !== id)].slice(0, MAX)
    save()
  }
  function remove(id: string) { items.value = items.value.filter((r) => r.id !== id); save() }
  function clear() { items.value = []; save() }
  return { items, touch, remove, clear }
})
