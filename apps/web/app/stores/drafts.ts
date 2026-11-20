import { NOTE_COLOR_COUNT } from '@retroboard/domain'
import { createLocalSealer } from '~/adapters/device-key'
import { createSealedStorage } from '~/adapters/sealed-storage'
import { randomId } from '~/utils/storage'

export interface Draft { id: string; columnId: string; text: string; color: number }

/** Private notes. They live in this browser only, sealed with the device key, and never reach the server until published. */
export const useDraftsStore = defineStore('drafts', () => {
  // No IndexedDB (private modes, prerendering): no key, so drafts stay in memory only.
  const storage = createSealedStorage(import.meta.client && typeof indexedDB !== 'undefined' ? createLocalSealer() : null, import.meta.client ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })
  // Writes go one after the other, after the room has been read, and take the value as it is then: an older value never
  // lands over a newer one, and what was stored is never overwritten by what was typed while it loaded.
  let writes: Promise<void> = Promise.resolve()
  let loading: Promise<void> = Promise.resolve()
  const write = (k: string, value: () => unknown, only: string | null = room.value) => { writes = writes.then(() => loading).then(() => (only === null || room.value === only ? storage.write(k, value()) : undefined)) }
  const room = ref('')
  const drafts = ref<Draft[]>([])
  const key = () => `retroboard:drafts:${room.value}`
  const composeKey = () => `retroboard:compose:${room.value}`
  /** Text being typed in each column composer: survives switching fields and reloads, never leaves this browser. */
  const composing = ref<Record<string, string>>({})
  const compose = (columnId: string) => composing.value[columnId] ?? ''
  function setCompose(columnId: string, text: string) {
    const next = { ...composing.value }
    if (text) next[columnId] = text; else Reflect.deleteProperty(next, columnId)
    composing.value = next
    if (room.value) write(composeKey(), () => composing.value)
  }

  /** Opens the room's drafts: what is stored is read (and migrated) without losing what was typed while it loaded. */
  function load(roomId: string) {
    room.value = roomId
    drafts.value = []
    composing.value = {}
    return (loading = read(roomId))
  }
  async function read(roomId: string) {
    const [stored, typed] = await Promise.all([storage.read<Draft[]>(`retroboard:drafts:${roomId}`, []), storage.read<Record<string, string>>(`retroboard:compose:${roomId}`, {})])
    if (room.value !== roomId) return
    const known = new Set(drafts.value.map((d) => d.id))
    drafts.value = [...stored.filter((d) => !known.has(d.id)), ...drafts.value]
    composing.value = { ...typed, ...composing.value }
  }
  function persist() { if (room.value) write(key(), () => drafts.value) }

  function add(columnId: string, text: string, color?: number) {
    const t = text.trim()
    if (!t) return null
    const d: Draft = { id: randomId(6), columnId, text: t, color: color ?? Math.floor(Math.random() * NOTE_COLOR_COUNT) }
    drafts.value = [...drafts.value, d]
    persist()
    return d
  }
  /** Back to drafts (undo publish), keeping column, text and colour. */
  function restore(items: { columnId: string; text: string; color: number }[]) {
    if (!items.length) return
    drafts.value = [...drafts.value, ...items.map((i) => ({ id: randomId(6), ...i }))]
    persist()
  }
  /** Forgets every local draft and typed text of the current room (board destroyed). */
  function clear() {
    drafts.value = []
    composing.value = {}
    if (room.value) { const k = [key(), composeKey()]; writes = writes.then(() => loading).then(() => k.forEach(storage.remove)) }
  }
  function remove(id: string) { drafts.value = drafts.value.filter((d) => d.id !== id); persist() }
  function removeMany(ids: string[]) { const s = new Set(ids); drafts.value = drafts.value.filter((d) => !s.has(d.id)); persist() }
  function prune(columnIds: string[]) {
    const keep = new Set(columnIds)
    const next = drafts.value.filter((d) => keep.has(d.columnId))
    if (next.length !== drafts.value.length) { drafts.value = next; persist() }
  }
  /** Keeps my drafts and typed text in another room too (the team moved to a fresh link). The current room's copy stays. */
  function copyTo(roomId: string) {
    if (drafts.value.length) { const d = drafts.value; write(`retroboard:drafts:${roomId}`, () => d, null) }
    if (Object.keys(composing.value).length) { const c = composing.value; write(`retroboard:compose:${roomId}`, () => c, null) }
  }
  const forColumn = (columnId: string) => drafts.value.filter((d) => d.columnId === columnId)
  const count = computed(() => drafts.value.length)

  return { drafts, composing, compose, setCompose, clear, copyTo, load, add, restore, remove, removeMany, prune, forColumn, count }
})
