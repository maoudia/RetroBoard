import type { AttentionEvent } from './policy'

/** visible -> hiddenIdle -> hiddenWithItems -> visibleWithDigest -> visible (change attention-and-notifications). */
export type AttentionPhase = 'visible' | 'hiddenIdle' | 'hiddenWithItems' | 'visibleWithDigest'

export interface AttentionState {
  phase: AttentionPhase
  /** Raised and unread: the favicon, title and badge count. */
  items: AttentionEvent[]
  /** Kept for the digest only. */
  kept: AttentionEvent[]
  dnd: boolean
}

export type AttentionSignal =
  | { type: 'hidden' }
  | { type: 'visible' }
  | { type: 'event'; raised: readonly AttentionEvent[]; kept: readonly AttentionEvent[] }
  | { type: 'dismiss' }
  | { type: 'dnd'; on: boolean }

export const initialAttention = (visible = true): AttentionState => ({ phase: visible ? 'visible' : 'hiddenIdle', items: [], kept: [], dnd: false })

/** The count shown on the tab: the favicon caps it at 9+, the title and the badge show it whole. */
export const attentionCount = (s: AttentionState): number => s.items.length
export const faviconLabel = (n: number): string => (n > 9 ? '9+' : String(n))

export function attentionReduce(s: AttentionState, sig: AttentionSignal): AttentionState {
  switch (sig.type) {
    case 'hidden':
      return s.phase === 'visible' || s.phase === 'visibleWithDigest' ? { ...s, phase: 'hiddenIdle' } : s
    case 'visible':
      if (s.phase !== 'hiddenIdle' && s.phase !== 'hiddenWithItems') return s
      return s.items.length || s.kept.length ? { ...s, phase: 'visibleWithDigest' } : { ...s, phase: 'visible' }
    case 'event': {
      // Focus rule: events while visible are not recorded (the toast and the live region already tell the person).
      if (s.phase === 'visible' || s.phase === 'visibleWithDigest') return s
      const items = [...s.items, ...sig.raised]
      const kept = [...s.kept, ...sig.kept]
      return { ...s, items, kept, phase: items.length ? 'hiddenWithItems' : s.phase }
    }
    case 'dismiss':
      return s.phase === 'visibleWithDigest' ? { ...s, phase: 'visible', items: [], kept: [] } : { ...s, items: [], kept: [], phase: s.phase === 'hiddenWithItems' ? 'hiddenIdle' : s.phase }
    case 'dnd':
      return { ...s, dnd: sig.on }
  }
}

/** Counts per category of everything the digest lists, in the order of first appearance. */
export function digestCounts(s: AttentionState): { category: AttentionEvent['category']; count: number }[] {
  const m = new Map<AttentionEvent['category'], number>()
  for (const e of [...s.items, ...s.kept]) m.set(e.category, (m.get(e.category) ?? 0) + 1)
  return [...m].map(([category, count]) => ({ category, count }))
}
