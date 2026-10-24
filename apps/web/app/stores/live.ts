import { CURSOR_STALE_MS, type CursorFrame, type FocusFrame, NOTE_COLOR_COUNT, type PresenceStatus, presenceStatus, type TimedCursor, visibleCursors } from '@retroboard/domain'

export interface LiveCursor extends TimedCursor { readonly name: string | null; readonly color: number }
export interface LiveFocus extends FocusFrame { readonly name: string | null; readonly color: number; readonly at: number }

/** Stable colour per connection, from the board palette (theme tokens). */
export const peerColor = (conn: string): number => {
  let h = 0
  for (let i = 0; i < conn.length; i++) h = (h * 31 + conn.charCodeAt(i)) >>> 0
  return h % NOTE_COLOR_COUNT
}

/**
 * Live presence of the other participants: cursors and focus. Memory only, never stored,
 * never exported. Kept outside the board snapshot so pointer moves do not re-render the board.
 */
export const useLiveStore = defineStore('live', () => {
  const cursors = shallowRef(new Map<string, LiveCursor>())
  const focus = shallowRef(new Map<string, LiveFocus>())
  /** Ticks every few seconds so stale cursors fade without new frames. */
  const now = ref(Date.now())
  /** Last cursor or focus change per connection, for "idle". */
  const active = new Map<string, number>()

  function setCursor(c: CursorFrame, name: string | null) {
    const next = new Map(cursors.value)
    next.set(c.conn, { ...c, name, color: peerColor(c.conn), at: Date.now() })
    cursors.value = next
    active.set(c.conn, Date.now())
  }
  function setFocus(f: FocusFrame, name: string | null) {
    const next = new Map(focus.value)
    const prev = next.get(f.conn)
    if (!prev || prev.column !== f.column || prev.note !== f.note || prev.typing !== f.typing) active.set(f.conn, Date.now())
    next.set(f.conn, { ...f, name, color: peerColor(f.conn), at: Date.now() })
    focus.value = next
  }
  function drop(conn: string) {
    active.delete(conn)
    if (cursors.value.has(conn)) { const next = new Map(cursors.value); next.delete(conn); cursors.value = next }
    if (focus.value.has(conn)) { const next = new Map(focus.value); next.delete(conn); focus.value = next }
  }
  function reset() {
    active.clear()
    cursors.value = new Map()
    focus.value = new Map()
  }

  const visible = computed(() => visibleCursors(cursors.value.values(), now.value) as LiveCursor[])
  /** Who is on a note (editing or dragging it), for markers on touch screens and on the note itself. */
  const onNote = computed(() => {
    const map = new Map<string, LiveFocus[]>()
    for (const f of focus.value.values()) if (f.note && now.value - f.at < CURSOR_STALE_MS * 6) map.set(f.note, [...(map.get(f.note) ?? []), f])
    return map
  })
  /** Who is in a column (viewing it on a phone, or typing in it). */
  const inColumn = computed(() => {
    const map = new Map<string, LiveFocus[]>()
    for (const f of focus.value.values()) if (f.column) map.set(f.column, [...(map.get(f.column) ?? []), f])
    return map
  })

  /** Status in the participants menu; a peer not seen moving yet is simply online. */
  function status(conn: string | undefined): { status: PresenceStatus; column: string | null } {
    if (!conn) return { status: 'online', column: null }
    const f = focus.value.get(conn)
    const at = active.get(conn)
    void cursors.value
    return { status: at === undefined && !f?.typing ? 'online' : presenceStatus(f, at ?? now.value, now.value), column: f?.typing ? f.column : null }
  }

  return { cursors, focus, now, visible, status, onNote, inColumn, setCursor, setFocus, drop, reset }
})
