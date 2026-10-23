/**
 * "Publish" animation: a draft flies from the private section to its new place in the column.
 * The draft rect is recorded at click time and consumed by the first matching published note.
 */
import { prefersReducedMotion } from '~/utils/fx'

interface Flight { columnId: string; text: string; rect: DOMRect }
const pending: Flight[] = []

export function useFlights() {
  function record(columnId: string, text: string, el: Element | null) {
    if (!el) return
    pending.push({ columnId, text: text.trim(), rect: el.getBoundingClientRect() })
    // Never keep stale flights around (e.g. the server rejected the publish).
    setTimeout(() => { const i = pending.findIndex((f) => f.text === text.trim() && f.columnId === columnId); if (i >= 0) pending.splice(i, 1) }, 4000)
  }
  function consume(columnId: string, text: string): DOMRect | null {
    const i = pending.findIndex((f) => f.columnId === columnId && f.text === text)
    return i < 0 ? null : pending.splice(i, 1)[0]!.rect
  }
  function fly(el: HTMLElement, from: DOMRect) {
    const to = el.getBoundingClientRect()
    if (typeof el.animate !== 'function' || prefersReducedMotion()) return
    const dx = from.left - to.left
    const dy = from.top - to.top
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}) rotate(-4deg)`, opacity: 0.85, offset: 0 },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 28}px) scale(1.06) rotate(3deg)`, opacity: 1, offset: 0.55 },
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, offset: 1 },
      ],
      { duration: 680, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    )
  }
  return { record, consume, fly }
}
