import type { Snapshot } from '@retroboard/domain'
import { activityBetween, presenceBetween } from '../activity/activity-log'
import type { TimerEvent } from '../timer/timer-events'
import type { AttentionEvent } from './policy'

export interface AttentionMe {
  /** Session id: the key of a talk turn. */
  cid?: string | null
  /** Display name: the owner of an action, the target of a mention. */
  name: string | null
  /** Columns I write in: a new idea there is "in my column" (empty: every column). */
  columnIds?: readonly string[]
}

const mentions = (text: string, name: string | null): boolean => !!name && text.toLowerCase().includes(`@${name.toLowerCase()}`)

/** Attention events between two snapshots, from the activity, talk, action, chat and idea read models. Pure. */
export function attentionBetween(prev: Snapshot | null, next: Snapshot, at: number, me: AttentionMe): AttentionEvent[] {
  if (!prev) return []
  const out: AttentionEvent[] = []
  for (const e of activityBetween(prev, next, at)) {
    if (e.kind === 'phase.started' || e.kind === 'agenda.ended') out.push({ category: 'phase', at })
    else if (e.kind === 'voting.opened') out.push({ category: 'voting', at })
    else if (e.kind === 'reveal.started') out.push({ category: 'callback', at })
  }
  const was = prev.talk.active
  const now = next.talk.active
  if (me.cid && now?.speaker === me.cid && was?.speaker !== me.cid) out.push({ category: 'turn', at })
  if (next.presenting && !next.presenting.mine && next.presenting.at !== prev.presenting?.at) out.push({ category: 'presenter', at, who: next.presenting.name })
  const known = new Set(prev.actions.map((a) => a.id))
  for (const a of next.actions) if (!known.has(a.id) && me.name && a.owner === me.name) out.push({ category: 'action', at, text: a.text })
  const seenMsg = new Set((prev.chat ?? []).map((m) => m.id))
  for (const m of next.chat ?? []) {
    if (seenMsg.has(m.id) || m.mine) continue
    out.push({ category: mentions(m.text, me.name) ? 'mention' : 'chat', at, who: m.name, text: m.text })
  }
  const seenNote = new Set(prev.notes.map((n) => n.id))
  for (const n of next.notes) {
    if (seenNote.has(n.id) || n.mine) continue
    if (me.columnIds?.length && !me.columnIds.includes(n.columnId)) continue
    out.push({ category: 'idea', at, who: n.author, text: n.text, column: next.columns.find((c) => c.id === n.columnId)?.title ?? null })
  }
  return out
}

/** Joined and left participants as attention events. */
export const attentionFromPresence = (...args: Parameters<typeof presenceBetween>): AttentionEvent[] =>
  presenceBetween(...args).map((e) => ({ category: 'presence' as const, at: e.at, who: e.name ?? null }))

/** The timer end and its warning as attention events. */
export const attentionFromTimer = (events: readonly TimerEvent[], at: number): AttentionEvent[] => events.map(() => ({ category: 'timer' as const, at }))
