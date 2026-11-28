import { type AttentionCategory, categoryInfo } from './categories'

export type AttentionPrivacy = 'private' | 'names' | 'full'

/** Something that may need the person, derived on this device from events already folded. */
export interface AttentionEvent {
  category: AttentionCategory
  at: number
  /** Who did it (shown at the `names` level and above). */
  who?: string | null
  /** Idea or message text (shown at the `full` level only). */
  text?: string | null
  /** Column of a new idea, for the generic title. */
  column?: string | null
}

export interface AttentionPolicy {
  enabled: Record<AttentionCategory, boolean>
  /** Do not disturb is on right now (the caller resolves a duration against the clock). */
  dnd: boolean
  privacy: AttentionPrivacy
}

export interface AttentionContext {
  /** The tab is visible and focused: nothing is raised. */
  focused: boolean
  now: number
  /** Times of the system notifications already shown for this board. */
  notifiedAt: readonly number[]
}

/** One system notification, in i18n keys and numbers so the web layer builds the text. */
export interface AttentionNotification {
  /** One at a time per category: a new one replaces the old. */
  tag: string
  category: AttentionCategory
  titleKey: string
  /** Events grouped in this notification ("3 new ideas"). */
  count: number
  who?: string
  text?: string
  column?: string
}

export interface AttentionDecision {
  /** Raise the favicon, the title and the badge. */
  raised: AttentionEvent[]
  /** Kept for the away digest only (do-not-disturb, quiet categories that are off). */
  kept: AttentionEvent[]
  /** System notifications to show now (grouped, rate limited). */
  notifications: AttentionNotification[]
}

export const NOTIFY_MIN_GAP_MS = 5_000
export const NOTIFY_PER_MINUTE = 6

/** Pure policy: focus rule, do-not-disturb, categories, grouping, rate limit and privacy level. */
export function attentionFor(events: readonly AttentionEvent[], policy: AttentionPolicy, ctx: AttentionContext): AttentionDecision {
  const none: AttentionDecision = { raised: [], kept: [], notifications: [] }
  if (ctx.focused) return none
  const raised: AttentionEvent[] = []
  const kept: AttentionEvent[] = []
  for (const e of events) {
    const on = policy.enabled[e.category]
    if (policy.dnd) kept.push(e)
    else if (on) raised.push(e)
    else if (categoryInfo(e.category).importance === 'quiet') kept.push(e)
  }
  const notifications = group(raised, policy.privacy)
  const recent = ctx.notifiedAt.filter((t) => ctx.now - t < 60_000)
  const last = recent.length ? Math.max(...recent) : -Infinity
  if (!notifications.length || ctx.now - last < NOTIFY_MIN_GAP_MS || recent.length >= NOTIFY_PER_MINUTE) return { raised, kept, notifications: [] }
  // Rate limit: one notification per call keeps a burst to one line; the rest only feeds the favicon and the digest.
  return { raised, kept, notifications: notifications.slice(0, Math.min(notifications.length, NOTIFY_PER_MINUTE - recent.length)) }
}

function group(raised: readonly AttentionEvent[], privacy: AttentionPrivacy): AttentionNotification[] {
  const byCat = new Map<AttentionCategory, AttentionEvent[]>()
  for (const e of raised) byCat.set(e.category, [...(byCat.get(e.category) ?? []), e])
  return [...byCat].map(([category, list]) => {
    const last = list[list.length - 1]!
    const n: AttentionNotification = { tag: `retroboard-${category}`, category, titleKey: `${categoryInfo(category).labelKey}.title`, count: list.length }
    if (privacy !== 'private' && last.who) n.who = last.who
    if (privacy === 'full' && last.text) n.text = last.text
    if (last.column) n.column = last.column
    return n
  })
}
