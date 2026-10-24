import type { Snapshot } from '@retroboard/domain'
import { groupTitle } from './column-items'

export interface RankedItem {
  kind: 'note' | 'cluster'
  id: string
  title: string
  columnId: string
  votes: number
  /** Standard competition ranking: ties share a rank and the next rank skips (1, 2, 2, 4). */
  rank: number
  /** Number of notes merged in a cluster (1 for a note). */
  size: number
}

/**
 * Ranking after voting: every idea (loose note or cluster) ordered by votes, ties kept together.
 * Returns null while counts are hidden: a ranking must never leak hidden counts.
 */
export function buildRanking(s: Pick<Snapshot, 'notes' | 'groups'>): RankedItem[] | null {
  if (s.notes.some((n) => n.votes === null) || s.groups.some((g) => g.votes === null)) return null
  const order = new Map(s.notes.map((n, i) => [n.id, i]))
  const items: (RankedItem & { pos: number })[] = []
  for (const g of s.groups) {
    const notes = s.notes.filter((n) => n.groupId === g.id)
    if (!notes.length) continue
    items.push({ kind: 'cluster', id: g.id, title: groupTitle(g, notes), columnId: g.columnId, votes: g.votes ?? 0, rank: 0, size: notes.length, pos: order.get(notes[0]!.id) ?? 0 })
  }
  for (const n of s.notes) {
    if (n.groupId) continue
    items.push({ kind: 'note', id: n.id, title: n.text, columnId: n.columnId, votes: n.votes ?? 0, rank: 0, size: 1, pos: order.get(n.id) ?? 0 })
  }
  items.sort((a, b) => b.votes - a.votes || a.pos - b.pos)
  return items.map(({ pos: _pos, ...it }, i, all) => ({ ...it, rank: i > 0 && all[i - 1]!.votes === it.votes ? 0 : i + 1 }))
    .reduce<RankedItem[]>((acc, it) => [...acc, { ...it, rank: it.rank || acc.at(-1)!.rank }], [])
}

/** Podium: the items ranked 1 to 3 (ties included, so it may hold more than three). */
export const podium = (ranking: readonly RankedItem[]): RankedItem[] => ranking.filter((r) => r.rank <= 3 && r.votes > 0)
