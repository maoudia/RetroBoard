/**
 * Talk time (change talk-time): one speaking turn at a time, a budget per turn, and the time each
 * participant spoke. Speakers are identified by their actor id (the session signing key on
 * encrypted boards) and shown by the label they chose to show, or not at all.
 */
import { done, fail, type HandlerMap } from '../shared/outcome'
import type { BoardState, TalkState, TalkTurn } from '../shared/types'

export type TalkMode = 'off' | 'ring' | 'popup'


export const TALK_BUDGET_MIN_S = 15
export const TALK_BUDGET_MAX_S = 15 * 60
export const DEFAULT_TALK_BUDGET_MS = 2 * 60_000

export const emptyTalk = (): TalkState => ({ active: null, totals: {} })

/** Ends the active turn (if any) and adds its time to the speaker's total. */
export function endTurn(talk: TalkState, now: number): TalkState {
  const a = talk.active
  if (!a) return talk
  const prev = talk.totals[a.speaker]
  const ms = (prev?.ms ?? 0) + Math.max(0, now - a.startedAt)
  return { active: null, totals: { ...talk.totals, [a.speaker]: { label: a.label ?? prev?.label ?? null, ms } } }
}

function startTurn(s: BoardState, speaker: string, label: string | null, now: number): BoardState {
  const talk = endTurn(s.talk, now)
  return { ...s, talk: { ...talk, active: { speaker, label, startedAt: now, budgetMs: s.settings.talkBudgetMs } } }
}

/** Where the active turn stands at `now` (for the ring and the popups). */
export function talkClock(turn: TalkTurn, now: number): { elapsedMs: number; remainingMs: number; overtime: boolean } {
  const elapsedMs = Math.max(0, now - turn.startedAt)
  const remainingMs = turn.budgetMs - elapsedMs
  return { elapsedMs, remainingMs, overtime: remainingMs < 0 }
}

/** Share of the total talk time per label, anonymous speakers aggregated, the active turn included. */
export function talkShares(talk: TalkState, now: number): { label: string | null; ms: number; share: number }[] {
  const t = talk.active ? endTurn(talk, now) : talk
  const byLabel = new Map<string | null, number>()
  for (const v of Object.values(t.totals)) byLabel.set(v.label, (byLabel.get(v.label) ?? 0) + v.ms)
  const total = [...byLabel.values()].reduce((n, x) => n + x, 0)
  return [...byLabel].map(([label, ms]) => ({ label, ms, share: total > 0 ? ms / total : 0 }))
    .sort((a, b) => b.ms - a.ms || (a.label === null ? 1 : b.label === null ? -1 : a.label.localeCompare(b.label)))
}

type TalkCommand = 'talk.assign' | 'talk.end' | 'talk.self' | 'talk.done'

export const talkHandlers: HandlerMap<TalkCommand> = {
  // Facilitator: give the floor to someone (privileged in the ledger).
  'talk.assign': (s, c, _a, ctx) => {
    if (s.settings.talkMode === 'off') return fail('invalid')
    return done(startTurn(s, c.speaker, c.label, ctx.now), { meta: true })
  },
  'talk.end': (s, _c, _a, ctx) => (s.talk.active ? done({ ...s, talk: endTurn(s.talk, ctx.now) }, { meta: true }) : done(s, {})),
  // Participant: take the floor when the facilitator allows it.
  'talk.self': (s, _c, a, ctx) => {
    if (s.settings.talkMode === 'off' || !s.settings.talkSelfStart) return fail('forbidden')
    if (s.talk.active?.speaker === a.cid) return done(s, {})
    return done(startTurn(s, a.cid, a.showName ? a.name : null, ctx.now), { meta: true })
  },
  'talk.done': (s, _c, a, ctx) => {
    if (!s.talk.active) return done(s, {})
    if (s.talk.active.speaker !== a.cid) return fail('forbidden')
    return done({ ...s, talk: endTurn(s.talk, ctx.now) }, { meta: true })
  },
}
