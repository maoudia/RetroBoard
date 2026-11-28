/**
 * What the menu and the drop targets offer for a published idea (change note-edit-and-unpublish). The domain decides when a
 * command is accepted; this only mirrors it so the UI shows an item only to people it is for, and disabled with the reason
 * when the board would refuse.
 */
import type { SnapshotGroup, SnapshotNote } from '@retroboard/domain'

export interface RightsContext {
  /** A facilitator or co-facilitator (acts on any idea, edits also on a locked board). */
  moderator: boolean
  locked: boolean
  votingClosed: boolean
  /** Every person present announced `note.unpublish` (rolling update). */
  unpublishKnown: boolean
}

export type Refusal = 'frozen' | 'locked' | 'voting-closed'
export interface Rights { /** The item is offered to this person. */ shown: boolean; /** Why it is disabled, null when it can be used. */ reason: Refusal | null }

/** "Edit" is for the author and the facilitators; frozen ideas refuse, a locked board refuses all but facilitators. */
export function editRights(note: Pick<SnapshotNote, 'mine' | 'frozen'>, c: Pick<RightsContext, 'moderator' | 'locked'>): Rights {
  const shown = note.mine || c.moderator
  if (note.frozen) return { shown, reason: 'frozen' }
  if (c.locked && !c.moderator) return { shown, reason: 'locked' }
  return { shown, reason: null }
}

/** Votes an unpublish takes away, and votes the idea or its cluster holds (what closed voting protects). */
export function unpublishVotes(note: Pick<SnapshotNote, 'id' | 'groupId' | 'votes'>, notes: readonly Pick<SnapshotNote, 'groupId' | 'votes'>[], groups: readonly Pick<SnapshotGroup, 'id' | 'votes'>[]): { removed: number; held: number } {
  const own = note.votes ?? 0
  const g = groups.find((x) => x.id === note.groupId)
  if (!g) return { removed: own, held: own }
  const members = notes.filter((n) => n.groupId === g.id)
  // A cluster's count includes its ideas'; what is left is the votes put on the cluster itself, which go when it dissolves.
  const onCluster = Math.max(0, (g.votes ?? 0) - members.reduce((sum, n) => sum + (n.votes ?? 0), 0))
  return { removed: own + (members.length <= 2 ? onCluster : 0), held: own + onCluster }
}

/** "Back to my drafts": the same people as "Edit", on boards where everyone present knows the command, refused once results are shown for a voted idea, and on a locked board for everyone. */
export function unpublishRights(note: Pick<SnapshotNote, 'mine' | 'frozen'>, c: RightsContext, held: number): Rights {
  const shown = (note.mine || c.moderator) && c.unpublishKnown
  if (note.frozen) return { shown, reason: 'frozen' }
  if (c.locked) return { shown, reason: 'locked' }
  if (c.votingClosed && held > 0) return { shown, reason: 'voting-closed' }
  return { shown, reason: null }
}

/** Whether to ask before sending an idea back: it carries votes, is pinned, or is someone else's. */
export const unpublishNeedsConfirm = (note: Pick<SnapshotNote, 'mine' | 'pinned'>, removed: number): boolean => removed > 0 || !!note.pinned || !note.mine
