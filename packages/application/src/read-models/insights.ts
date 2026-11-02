/**
 * Results insights (change results-insights): plain-language observations about a retro, computed on the
 * device from counts only (no voter identity). Each insight is a key plus numbers; the UI words it in fr/en.
 * Returns [] while vote counts are hidden: nothing may leak before the reveal.
 */
import type { Snapshot } from '@retroboard/domain'
import { buildRanking } from './ranking'
import { type Keyword, topKeywords } from './keywords'

export type InsightId = 'concentrated' | 'tieFirst' | 'unvoted' | 'columnLead' | 'lowParticipation' | 'actionsForIdeas' | 'noActions'
export interface Insight { id: InsightId; /** Numbers the sentence needs. */ n: Record<string, number>; /** Column the sentence is about, when any. */ columnId?: string }

export interface Insights {
  list: Insight[]
  /** Notes per column (published ideas), for the "where was the energy" chart. */
  notesPerColumn: { columnId: string; notes: number; share: number }[]
  keywords: Keyword[]
}

const pct = (x: number) => Math.round(x * 100)

export function buildInsights(
  s: Pick<Snapshot, 'notes' | 'groups' | 'columns' | 'settings' | 'actions'>,
  participants?: number,
): Insights | null {
  const ranking = buildRanking(s)
  if (!ranking) return null
  const total = ranking.reduce((n, r) => n + r.votes, 0)
  const list: Insight[] = []

  if (total > 0) {
    const topThree = ranking.slice(0, 3).reduce((n, r) => n + r.votes, 0)
    if (ranking.length > 3 && topThree / total >= 0.5) list.push({ id: 'concentrated', n: { ideas: 3, share: pct(topThree / total) } })
    const first = ranking.filter((r) => r.rank === 1)
    if (first.length > 1) list.push({ id: 'tieFirst', n: { ideas: first.length, votes: first[0]!.votes } })
    const unvoted = ranking.filter((r) => r.votes === 0).length
    if (ranking.length >= 4 && unvoted / ranking.length >= 0.4) list.push({ id: 'unvoted', n: { ideas: unvoted, of: ranking.length } })
    const perColumn = s.columns.filter((c) => c.votable !== false).map((c) => ({ columnId: c.id, votes: ranking.filter((r) => r.columnId === c.id).reduce((n, r) => n + r.votes, 0) }))
    const lead = perColumn.sort((a, b) => b.votes - a.votes)[0]
    if (lead && perColumn.length > 1 && lead.votes / total >= 0.6) list.push({ id: 'columnLead', n: { share: pct(lead.votes / total) }, columnId: lead.columnId })
    const available = participants && participants > 0 ? participants * s.settings.voteLimit : 0
    if (available > 0 && total / available < 0.5) list.push({ id: 'lowParticipation', n: { used: total, available, share: pct(total / available) } })
    const voted = ranking.filter((r) => r.votes > 0).length
    if (s.actions.length > 0) list.push({ id: 'actionsForIdeas', n: { actions: s.actions.length, ideas: voted } })
    else list.push({ id: 'noActions', n: { ideas: voted } })
  }

  const notesCount = s.notes.length
  const notesPerColumn = s.columns.map((c) => {
    const notes = s.notes.filter((n) => n.columnId === c.id).length
    return { columnId: c.id, notes, share: notesCount > 0 ? notes / notesCount : 0 }
  })
  return { list, notesPerColumn, keywords: topKeywords(s.notes.map((n) => n.text)) }
}
