import type { VotableKind } from '../shared/commands'
import type { BoardState, ErrorCode } from '../shared/types'

/** Votes cast by one person across the board (notes and clusters, repeats included). */
export function votesUsedBy(s: BoardState, cid: string): number {
  let n = 0
  for (const note of Object.values(s.notes)) for (const v of note.voters) if (v === cid) n++
  for (const g of Object.values(s.groups)) for (const v of g.voters) if (v === cid) n++
  return n
}

export const countOf = (voters: readonly string[], cid: string): number => voters.reduce((n, v) => n + (v === cid ? 1 : 0), 0)

/** Can this item take votes under the board's policy? Null when it can, else the reason. */
export function votability(s: BoardState, kind: VotableKind, id: string): ErrorCode | null {
  const { votable } = s.settings
  if (kind === 'cluster') {
    if (!s.groups[id]) return 'not-found'
    return votable === 'notes' ? 'not-votable' : null
  }
  const note = s.notes[id]
  if (!note) return 'not-found'
  if (votable === 'clusters' && !note.groupId) return 'not-votable'
  // A note inside a cluster is voted through its cluster when clusters are votable.
  if (note.groupId && votable !== 'notes') return 'not-votable'
  return null
}

/** Cluster score: votes on the cluster plus votes its notes received (merged ideas keep their support). */
export function clusterVoters(s: BoardState, groupId: string): string[] {
  const g = s.groups[groupId]
  if (!g) return []
  const members = Object.values(s.notes).filter((n) => n.groupId === groupId)
  return [...g.voters, ...members.flatMap((n) => n.voters)]
}
