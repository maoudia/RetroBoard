/**
 * Vote statistics (change voting-results-charts): what the results charts draw. Pure, computed on
 * the device from the snapshot. Returns null while counts are hidden: nothing may leak before the reveal.
 * No voter identity is involved, only counts.
 */
import type { Snapshot } from '@retroboard/domain'
import { buildRanking, type RankedItem } from './ranking'

export interface TopIdea extends RankedItem {
  /** Votes over the votes of the leading idea, 0..1 (bar length). */
  ratio: number
  /** Another idea has the same number of votes. */
  tied: boolean
}

export interface ColumnShare { columnId: string; votes: number; /** 0..1 of all votes. */ share: number }

export type Spread = 'concentrated' | 'balanced'

export interface VoteStats {
  totalVotes: number
  /** Votes the present participants could cast (participants x vote limit); null when unknown. */
  votesAvailable: number | null
  /** Votes used over votes available, 0..1; null when unknown. */
  usedShare: number | null
  top: TopIdea[]
  perColumn: ColumnShare[]
  /** Ideas with at least one vote. */
  votedIdeas: number
  /** Concentrated: the top three ideas hold at least 70% of the votes. */
  spread: Spread | null
}

export const TOP_COUNT = 10
export const CONCENTRATED_SHARE = 0.7

export function voteStats(s: Pick<Snapshot, 'notes' | 'groups' | 'columns' | 'settings'>, participants?: number): VoteStats | null {
  const ranking = buildRanking(s)
  if (!ranking) return null
  const totalVotes = ranking.reduce((n, r) => n + r.votes, 0)
  const lead = ranking[0]?.votes ?? 0
  const count = new Map<number, number>()
  for (const r of ranking) count.set(r.votes, (count.get(r.votes) ?? 0) + 1)
  const top = ranking.filter((r) => r.votes > 0).slice(0, TOP_COUNT)
    .map((r) => ({ ...r, ratio: lead > 0 ? r.votes / lead : 0, tied: (count.get(r.votes) ?? 0) > 1 }))
  const perColumn = s.columns.map((c) => {
    const votes = ranking.filter((r) => r.columnId === c.id).reduce((n, r) => n + r.votes, 0)
    return { columnId: c.id, votes, share: totalVotes > 0 ? votes / totalVotes : 0 }
  })
  const votesAvailable = participants && participants > 0 ? participants * s.settings.voteLimit : null
  const topThree = ranking.slice(0, 3).reduce((n, r) => n + r.votes, 0)
  return {
    totalVotes,
    votesAvailable,
    usedShare: votesAvailable ? Math.min(1, totalVotes / votesAvailable) : null,
    top,
    perColumn,
    votedIdeas: ranking.filter((r) => r.votes > 0).length,
    spread: totalVotes > 0 ? (topThree / totalVotes >= CONCENTRATED_SHARE ? 'concentrated' : 'balanced') : null,
  }
}
