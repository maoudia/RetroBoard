import type { VotableKind } from '../shared/commands'
import type { BoardState, ErrorCode, SealedBallot } from '../shared/types'

/** The sealed ballots of the round, in log order (none before the first). */
export const ballotsOf = (s: BoardState): readonly SealedBallot[] => s.sealed ?? []

/** Does this column take votes? Absent flag: votable, like boards created before. */
export const columnVotable = (s: Pick<BoardState, 'columns'>, columnId: string): boolean => s.columns.find((c) => c.id === columnId)?.votable !== false

/**
 * The one rule behind "counted, shown and votable agree": an idea counts exactly when its column is
 * votable. The votes of an idea that does not count stay in the log and count again with the column.
 */
export const counted = (s: Pick<BoardState, 'columns'>, idea: { columnId: string }): boolean => columnVotable(s, idea.columnId)

/** Votes cast by one person across the board (counted notes and clusters, repeats included). */
export function votesUsedBy(s: BoardState, cid: string): number {
  let n = 0
  for (const note of Object.values(s.notes)) if (counted(s, note)) for (const v of note.voters) if (v === cid) n++
  for (const g of Object.values(s.groups)) if (counted(s, g)) for (const v of g.voters) if (v === cid) n++
  for (const b of ballotsOf(s)) if (b.cid === cid) n++
  return n
}

export const countOf = (voters: readonly string[], cid: string): number => voters.reduce((n, v) => n + (v === cid ? 1 : 0), 0)

/** Can this item take votes under the board's policy? Null when it can, else the reason. */
export function votability(s: BoardState, kind: VotableKind, id: string): ErrorCode | null {
  const { votable } = s.settings
  if (kind === 'cluster') {
    const g = s.groups[id]
    if (!g) return 'not-found'
    if (!counted(s, g)) return 'not-votable'
    return votable === 'notes' ? 'not-votable' : null
  }
  const note = s.notes[id]
  if (!note) return 'not-found'
  if (!counted(s, note)) return 'not-votable'
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
