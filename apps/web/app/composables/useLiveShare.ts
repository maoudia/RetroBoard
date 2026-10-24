import { anchorPoint, canSendCursor, CURSOR_INTERVAL_MS } from '@retroboard/domain'
import type { OwnCursor, OwnFocus } from '@retroboard/application'

const IDLE_FOCUS = JSON.stringify({ column: null, note: null, typing: false })

const anchorOf = (target: EventTarget | null, kind?: 'note' | 'column'): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>(kind ? `[data-anchor-kind="${kind}"]` : '[data-anchor]') : null

/**
 * Shares my pointer and focus with the other participants (live only, never stored).
 * Mouse and pen: the pointer, at most 4 frames per second while it moves.
 * Touch: no pointer (a finger only exists while it touches), only while dragging; the column in
 * view and the note being edited are shared as focus instead.
 */
export function useLiveShare(boardEl: Ref<HTMLElement | null>) {
  const board = useBoardStore()
  const ui = useUiStore()
  const settings = useSettingsStore()

  let lastSent: number | null = null
  let pending: OwnCursor | null = null
  let trailing: ReturnType<typeof setTimeout> | undefined
  let lastFocus = ''
  let viewColumn: string | null = null
  let observer: IntersectionObserver | null = null
  const ratios = new Map<string, number>()

  function flush() {
    trailing = undefined
    if (!pending) return
    board.sendCursor(pending)
    lastSent = Date.now()
    pending = null
  }

  function queue(c: OwnCursor) {
    pending = c
    const now = Date.now()
    if (canSendCursor(lastSent, now)) flush()
    else trailing ??= setTimeout(flush, CURSOR_INTERVAL_MS - (now - (lastSent ?? now)))
  }

  function point(target: EventTarget | null, x: number, y: number, drag: boolean) {
    if (!settings.s.shareCursor) return
    const el = anchorOf(target)
    if (!el?.dataset.anchor) return
    queue({ anchor: el.dataset.anchor, ...anchorPoint(el.getBoundingClientRect(), x, y), drag })
  }

  function onMove(e: PointerEvent) {
    const dragging = !!(ui.dragNoteId || ui.dragGroupId)
    if (e.pointerType === 'touch' && !dragging) return
    point(e.target, e.clientX, e.clientY, dragging)
  }
  // Native drag and drop fires dragover, not pointermove.
  const onDragOver = (e: DragEvent) => point(e.target, e.clientX, e.clientY, true)
  function onLeave(e: PointerEvent) {
    if (e.pointerType === 'touch' || !settings.s.shareCursor) return
    queue({ anchor: null, x: 0, y: 0, drag: false })
  }

  function focusNow(): OwnFocus {
    const active = document.activeElement
    const typing = !!active && boardEl.value?.contains(active) === true && (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)
    const note = ui.dragNoteId ?? (typing ? anchorOf(active, 'note')?.dataset.anchor ?? null : null)
    const column = (typing ? anchorOf(active, 'column')?.dataset.anchor : null) ?? viewColumn
    return { column: column ?? null, note, typing }
  }
  function sendFocus(force = false) {
    const f = focusNow()
    const key = JSON.stringify(f)
    if (!force && key === lastFocus) return
    lastFocus = key
    board.sendFocus(f)
  }
  const onFocusChange = () => setTimeout(() => sendFocus(), 0)

  /** On a phone one column fills the screen: the most visible one is "where I am". */
  function observeColumns() {
    observer?.disconnect()
    if (!boardEl.value || !matchMedia('(pointer: coarse)').matches) return
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.anchor
        if (id) ratios.set(id, e.intersectionRatio)
      }
      const best = [...ratios.entries()].sort((a, b) => b[1] - a[1])[0]
      viewColumn = best && best[1] > 0.5 ? best[0] : null
      sendFocus()
    }, { root: boardEl.value, threshold: [0, 0.5, 1] })
    for (const col of boardEl.value.querySelectorAll('[data-anchor-kind="column"]')) observer.observe(col)
  }

  let heartbeat: ReturnType<typeof setInterval> | undefined
  watch(boardEl, (el, old) => {
    old?.removeEventListener('pointermove', onMove)
    old?.removeEventListener('pointerleave', onLeave)
    old?.removeEventListener('dragover', onDragOver)
    old?.removeEventListener('focusin', onFocusChange)
    old?.removeEventListener('focusout', onFocusChange)
    if (!el) { observer?.disconnect(); return }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    el.addEventListener('dragover', onDragOver, { passive: true })
    el.addEventListener('focusin', onFocusChange)
    el.addEventListener('focusout', onFocusChange)
    nextTick(observeColumns)
  }, { immediate: true })
  // Columns added or removed: observe the new set.
  watch(() => board.columns.length, () => nextTick(observeColumns))
  watch(() => ui.dragNoteId, () => sendFocus())
  // Turned off: the others drop my pointer right away.
  watch(() => settings.s.shareCursor, (on) => { if (!on) { pending = null; board.sendCursor({ anchor: null, x: 0, y: 0, drag: false }) } })
  // Peers that join later learn my focus within a few seconds.
  watch(() => board.peers.length, () => sendFocus(true))

  // Focus can change without an event (an editor removed from the page): check every second,
  // and repeat a non-empty focus every 15 s so it does not expire for the others.
  let beats = 0
  onMounted(() => {
    heartbeat = setInterval(() => {
      beats = (beats + 1) % 15
      sendFocus(beats === 0 && lastFocus !== '' && lastFocus !== IDLE_FOCUS)
    }, 1_000)
  })
  onBeforeUnmount(() => {
    clearInterval(heartbeat)
    clearTimeout(trailing)
    observer?.disconnect()
  })
}
