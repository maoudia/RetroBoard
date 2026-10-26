/**
 * ROTI, return on time invested (change retro-report): each participant rates the retro from 1 to 5
 * at the close. One score per participant (the last one counts); only counts leave the fold, never
 * who gave what. Pure.
 */
import { done, fail, type HandlerMap } from '../shared/outcome'
import type { BoardState } from '../shared/types'

export const ROTI_MIN = 1
export const ROTI_MAX = 5

export interface RotiSummary {
  /** Number of scores for 1..5 (index 0 is a score of 1). */
  counts: number[]
  total: number
  /** Average score, null without scores. */
  average: number | null
  /** The viewer's own score, or null. */
  mine: number | null
}

export function rotiSummary(state: Pick<BoardState, 'roti'>, viewerCid: string | null): RotiSummary {
  const counts = Array.from({ length: ROTI_MAX - ROTI_MIN + 1 }, () => 0)
  const scores = Object.values(state.roti ?? {})
  for (const v of scores) if (Number.isInteger(v) && v >= ROTI_MIN && v <= ROTI_MAX) counts[v - ROTI_MIN]!++
  const total = counts.reduce((n, c) => n + c, 0)
  const sum = counts.reduce((n, c, i) => n + c * (i + ROTI_MIN), 0)
  return { counts, total, average: total > 0 ? sum / total : null, mine: viewerCid ? (state.roti?.[viewerCid] ?? null) : null }
}

export const rotiHandlers: HandlerMap<'roti.set'> = {
  'roti.set': (s, c, a) => {
    if (s.settings.locked) return fail('locked')
    if (!Number.isInteger(c.score) || c.score < ROTI_MIN || c.score > ROTI_MAX) return fail('invalid')
    if (s.roti?.[a.cid] === c.score) return done(s, {})
    return done({ ...s, roti: { ...(s.roti ?? {}), [a.cid]: c.score } }, { meta: true })
  },
}
