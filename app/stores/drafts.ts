import { NOTE_COLOR_COUNT } from '@retroboard/domain'
import { randomId, safeStorage } from '~/utils/storage'

export interface Draft { id: string; columnId: string; text: string; color: number }

/** Private notes. They live in this browser only and never reach the server until published. */
export const useDraftsStore = defineStore('drafts', () => {
  const room = ref('')
  const drafts = ref<Draft[]>([])
  const key = () => `retroboard:drafts:${room.value}`

  function load(roomId: string) {
    room.value = roomId
    drafts.value = safeStorage.get<Draft[]>(key(), [])
  }
  function persist() { if (room.value) safeStorage.set(key(), drafts.value) }

  function add(columnId: string, text: string) {
    const t = text.trim()
    if (!t) return null
    const d: Draft = { id: randomId(6), columnId, text: t, color: Math.floor(Math.random() * NOTE_COLOR_COUNT) }
    drafts.value = [...drafts.value, d]
    persist()
    return d
  }
  function remove(id: string) { drafts.value = drafts.value.filter((d) => d.id !== id); persist() }
  function removeMany(ids: string[]) { const s = new Set(ids); drafts.value = drafts.value.filter((d) => !s.has(d.id)); persist() }
  function prune(columnIds: string[]) {
    const keep = new Set(columnIds)
    const next = drafts.value.filter((d) => keep.has(d.columnId))
    if (next.length !== drafts.value.length) { drafts.value = next; persist() }
  }
  const forColumn = (columnId: string) => drafts.value.filter((d) => d.columnId === columnId)
  const count = computed(() => drafts.value.length)

  return { drafts, load, add, remove, removeMany, prune, forColumn, count }
})
