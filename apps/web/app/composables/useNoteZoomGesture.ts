import type { Ref } from 'vue'
import { isDoubleTap, isTap, ZOOM_EXCLUDED, type Tap } from '~/utils/note-zoom-gesture'

/**
 * Double tap (touch, pen) or double click (mouse) on an element opens the note zoom (change note-zoom-on-double-tap, task 2.1).
 * The gesture only listens: it never prevents default and never delays the first tap, so drag, vote, menu and a single tap are unaffected.
 * `enabled` is false for a note being edited. Taps on controls, links and fields are ignored.
 *
 * `follow` is for a cluster stack, whose first tap already opens the cluster panel over it: the second tap may land on that panel,
 * so every tap of the document is watched and the pair counts when the first started on the stack.
 */
export function useNoteZoomGesture(el: Ref<HTMLElement | null>, opts: { enabled: () => boolean; zoom: () => void; follow?: boolean }) {
  let down: (Tap & { inside: boolean }) | null = null
  let last: Tap | null = null
  const inside = (e: Event) => {
    const t = e.target as Element | null
    const own = t?.closest(ZOOM_EXCLUDED)
    return !!t && !!el.value?.contains(t) && (!own || own === el.value)
  }
  const at = (e: PointerEvent): Tap => ({ x: e.clientX, y: e.clientY, at: e.timeStamp })

  function onDown(e: PointerEvent) { down = { ...at(e), inside: inside(e) } }
  function onUp(e: PointerEvent) {
    const started = down
    down = null
    // A mouse double click is the native `dblclick` (touch browsers differ, so touch and pen use the pointer pair).
    if (!started || !opts.enabled() || (e.pointerType === 'mouse' && !opts.follow)) return
    const up = at(e)
    if (!isTap(started, up)) { last = null; return }
    if (isDoubleTap(last, up)) { last = null; opts.zoom(); return }
    last = started.inside ? up : null
  }
  function onDblClick(e: MouseEvent) {
    if (!opts.enabled() || !inside(e)) return
    window.getSelection()?.removeAllRanges()
    opts.zoom()
  }
  function onCancel() { down = null; last = null }

  const target = (): EventTarget | null => (opts.follow ? document : el.value)
  onMounted(() => {
    const n = target()
    if (!n) return
    n.addEventListener('pointerdown', onDown as EventListener, true)
    n.addEventListener('pointerup', onUp as EventListener, true)
    n.addEventListener('pointercancel', onCancel, true)
    if (!opts.follow) n.addEventListener('dblclick', onDblClick as EventListener)
  })
  onBeforeUnmount(() => {
    const n = target()
    if (!n) return
    n.removeEventListener('pointerdown', onDown as EventListener, true)
    n.removeEventListener('pointerup', onUp as EventListener, true)
    n.removeEventListener('pointercancel', onCancel, true)
    n.removeEventListener('dblclick', onDblClick as EventListener)
  })
}
