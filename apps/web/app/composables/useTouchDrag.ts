/** A press this long, without moving, lifts the note or cluster under a finger. */
const LONG_PRESS_MS = 350
/** Moving further than this before the press is long enough is a scroll or a swipe, not a drag. */
const SLOP_PX = 8
/** A finger this close to an edge scrolls the board (sideways) or the column (up and down). */
const EDGE_PX = 64
const SCROLL_PX = 14

/** Taps on these keep their own meaning (vote, menu, link) and never start a drag. */
const OWN_TAP = 'button, a[href], input, textarea, select, [role="menuitem"]'

const fire = (target: Element, type: 'dragover' | 'dragleave' | 'drop') => target.dispatchEvent(new Event(type, { bubbles: false, cancelable: true }))

/**
 * Touch drag and drop (change responsive-and-i18n-hardening, task 3.2). Native HTML5 drag and drop does not start from a
 * finger on every browser, so a long press lifts the card and a ghost follows the finger. The drop targets are the
 * elements marked `data-drop` (a note, a cluster, a column): they receive the same `dragover`, `dragleave` and `drop`
 * events a mouse drag sends, so grouping, merging and moving have one implementation. The "Group with..." menu stays
 * the way to do it without dragging (WCAG 2.5.7).
 */
export function useTouchDrag(el: Ref<HTMLElement | null>, opts: { enabled: () => boolean; begin: () => void; end: () => void }) {
  let pressed = false
  let active = false
  let pointerId = -1
  let x0 = 0
  let y0 = 0
  let x = 0
  let y = 0
  let grabX = 0
  let grabY = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  let ghost: HTMLElement | null = null
  let target: HTMLElement | null = null

  const keepStill = (e: Event) => e.preventDefault()

  function hit(): HTMLElement | null {
    const found = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]') ?? null
    return found === el.value ? null : found
  }
  function aim(next: HTMLElement | null) {
    if (next === target) return
    if (target) fire(target, 'dragleave')
    target = next
    if (target) fire(target, 'dragover')
  }
  function track() {
    if (!active) return
    if (ghost) ghost.style.transform = `translate(${x - grabX}px, ${y - grabY}px) rotate(2deg)`
    const column = document.elementFromPoint(x, y)?.closest<HTMLElement>('.notes')
    const board = el.value?.closest<HTMLElement>('.board')
    if (board) board.scrollLeft += x < EDGE_PX ? -SCROLL_PX : x > window.innerWidth - EDGE_PX ? SCROLL_PX : 0
    if (column) {
      const r = column.getBoundingClientRect()
      column.scrollTop += y < r.top + EDGE_PX ? -SCROLL_PX : y > r.bottom - EDGE_PX ? SCROLL_PX : 0
    }
    aim(hit())
    frame = requestAnimationFrame(track)
  }

  function lift() {
    const node = el.value
    if (!node || !opts.enabled()) return release()
    active = true
    opts.begin()
    const r = node.getBoundingClientRect()
    grabX = x0 - r.left
    grabY = y0 - r.top
    ghost = node.cloneNode(true) as HTMLElement
    // The copy is only a picture: no second note for a test, a screen reader or a tab stop.
    for (const a of [ghost, ...ghost.querySelectorAll('*')]) for (const n of ['data-testid', 'data-source-id', 'data-anchor', 'data-drop', 'id']) a.removeAttribute(n)
    ghost.className += ' touch-ghost'
    ghost.setAttribute('inert', '')
    ghost.style.width = `${r.width}px`
    ghost.style.height = `${r.height}px`
    document.body.append(ghost)
    node.setAttribute('data-lifted', '')
    // A finger that keeps moving must drag the card, not scroll the page.
    document.addEventListener('touchmove', keepStill, { passive: false })
    frame = requestAnimationFrame(track)
  }

  /** Stops listening and puts everything back; a click that follows a drag on the same card is swallowed. */
  function release() {
    const wasActive = active
    clearTimeout(timer)
    cancelAnimationFrame(frame)
    for (const type of ['pointermove', 'pointerup', 'pointercancel'] as const) window.removeEventListener(type, onEvent)
    for (const type of ['contextmenu', 'selectstart'] as const) document.removeEventListener(type, keepStill)
    document.removeEventListener('touchmove', keepStill)
    ghost?.remove()
    ghost = null
    el.value?.removeAttribute('data-lifted')
    if (wasActive) {
      const swallow = (e: Event) => e.stopPropagation()
      el.value?.addEventListener('click', swallow, { capture: true, once: true })
    }
    pressed = false
    active = false
    target = null
    pointerId = -1
  }

  function onEvent(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    x = e.clientX
    y = e.clientY
    if (e.type === 'pointermove') {
      if (!active && Math.hypot(x - x0, y - y0) > SLOP_PX) release()
      return
    }
    if (active) {
      const over = target
      if (over && e.type === 'pointerup') fire(over, 'drop')
      else if (over) fire(over, 'dragleave')
      opts.end()
    }
    release()
  }

  function down(e: PointerEvent) {
    if (e.pointerType !== 'touch' || !e.isPrimary || pressed || !opts.enabled()) return
    const own = (e.target as Element | null)?.closest(OWN_TAP)
    if (own && own !== el.value) return
    pressed = true
    pointerId = e.pointerId
    x0 = x = e.clientX
    y0 = y = e.clientY
    for (const type of ['pointermove', 'pointerup', 'pointercancel'] as const) window.addEventListener(type, onEvent)
    // The browser's own long-press (text selection, context menu) would steal the gesture.
    for (const type of ['contextmenu', 'selectstart'] as const) document.addEventListener(type, keepStill)
    timer = setTimeout(lift, LONG_PRESS_MS)
  }

  watch(el, (node, old) => {
    old?.removeEventListener('pointerdown', down)
    node?.addEventListener('pointerdown', down)
  }, { immediate: true, flush: 'post' })
  onBeforeUnmount(() => {
    el.value?.removeEventListener('pointerdown', down)
    if (active) opts.end()
    release()
  })

  /** A finger is down on the card: the browser's own drag must not start next to ours. */
  return { touching: () => pressed }
}
