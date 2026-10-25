import type { Snapshot } from '@retroboard/domain'
import { buildRanking, type RankedItem } from './ranking'

/**
 * Voted ideas for the actions panel (change actions-from-votes): what the team voted for, ready
 * to turn into actions. Built on `buildRanking`, so ties and hidden counts behave the same.
 */
export type VotedSort = 'votes' | 'column' | 'newest' | 'author'
export const VOTED_SORTS: readonly VotedSort[] = ['votes', 'column', 'newest', 'author']

export interface VotedIdea extends RankedItem {
  /** Name shown by the author of a note; null for clusters and anonymous notes. */
  author: string | null
  createdAt: number
}

type VotingView = Pick<Snapshot, 'settings' | 'agenda' | 'notes' | 'groups'>

/**
 * Voting is over when the votes are readable and the Vote phase is behind us:
 * - an open secret vote never counts (a list must not leak hidden counts);
 * - with an agenda that has a Vote phase: the agenda moved past it, or voting was closed/revealed;
 * - without one: voting was closed/revealed by a facilitator.
 */
export function votingOver(s: Pick<VotingView, 'settings' | 'agenda'>): boolean {
  if (s.settings.secretVoting && !s.settings.votingClosed) return false
  if (s.settings.votingClosed) return true
  const a = s.agenda
  if (!a) return false
  const vote = a.phases.findIndex((p) => p.kind === 'vote')
  return vote >= 0 && a.current > vote
}

/** The ideas to list after the vote, or null while voting is not over. */
export function votedIdeas(s: VotingView, sort: VotedSort = 'votes', columnOrder: readonly string[] = []): VotedIdea[] | null {
  if (!votingOver(s)) return null
  const ranking = buildRanking(s)
  if (!ranking) return null
  const notes = new Map(s.notes.map((n) => [n.id, n]))
  const ideas: VotedIdea[] = ranking.map((r) => {
    if (r.kind === 'note') {
      const n = notes.get(r.id)!
      return { ...r, author: n.author, createdAt: n.createdAt }
    }
    return { ...r, author: null, createdAt: Math.max(0, ...s.notes.filter((n) => n.groupId === r.id).map((n) => n.createdAt)) }
  })
  // Array.prototype.sort is stable: every sort keeps the ranking order among equals.
  const colIndex = (id: string) => { const i = columnOrder.indexOf(id); return i < 0 ? Number.MAX_SAFE_INTEGER : i }
  switch (sort) {
    case 'column': return [...ideas].sort((a, b) => colIndex(a.columnId) - colIndex(b.columnId))
    case 'newest': return [...ideas].sort((a, b) => b.createdAt - a.createdAt)
    case 'author': return [...ideas].sort((a, b) => (a.author === null ? 1 : 0) - (b.author === null ? 1 : 0) || (a.author ?? '').localeCompare(b.author ?? '', undefined, { sensitivity: 'base' }))
    default: return ideas
  }
}

export interface OwnerChoices {
  /** Connected participants whose names are shown: a fixed section at the top. */
  connected: string[]
  /** Owners already used on this board, then the team's earlier ones, filtered by what is typed. */
  used: string[]
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/**
 * Owner dropdown content: connected people first and always (anonymous ones excluded), then the
 * owners seen before filtered by the typed text. Free text is offered by the combobox itself.
 */
export function ownerChoices(s: Pick<Snapshot, 'peers' | 'actions'>, query = '', history: readonly string[] = []): OwnerChoices {
  const seen = new Set<string>()
  const take = (names: readonly (string | null | undefined)[], filter: boolean): string[] => {
    const q = fold(query)
    const out: string[] = []
    for (const raw of names) {
      const name = raw?.trim()
      if (!name) continue
      const key = fold(name)
      if (seen.has(key) || (filter && q && !key.includes(q))) continue
      seen.add(key)
      out.push(name)
    }
    return out
  }
  const connected = take(s.peers.filter((p) => !p.hidden).map((p) => p.name), false)
  const used = take([...s.actions.map((a) => a.owner), ...history], true)
  return { connected, used }
}
