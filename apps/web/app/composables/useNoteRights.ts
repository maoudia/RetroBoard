import { editRights, type Refusal, type Rights, unpublishRights, unpublishVotes } from '@retroboard/application'
import type { SnapshotNote } from '@retroboard/domain'

/**
 * What the menu and the drop targets offer for a published idea: "Edit" and "Back to my drafts" (change note-edit-and-unpublish).
 * Shown only to the author and the facilitators; disabled, with the reason as a tooltip, when the board would refuse.
 */
export function useNoteRights() {
  const board = useBoardStore()
  const { t } = useT()
  const context = () => ({ moderator: board.access.role !== 'participant', locked: board.locked, votingClosed: board.votingClosed, unpublishKnown: board.unpublishKnown })
  const phaseClosed = (command: 'note.edit' | 'note.unpublish') => !board.availability(command).allowed

  const reasonText = (r: Refusal | 'phase' | null): string | undefined => (r === null ? undefined : t(r === 'frozen' ? 'error.frozen' : r === 'locked' ? 'error.locked' : r === 'phase' ? 'error.phase' : 'error.voting-closed'))
  const withPhase = (r: Rights, command: 'note.edit' | 'note.unpublish'): { shown: boolean; reason: Refusal | 'phase' | null } => ({ shown: r.shown, reason: r.reason ?? (r.shown && phaseClosed(command) ? 'phase' : null) })

  const edit = (note: SnapshotNote) => withPhase(editRights(note, context()), 'note.edit')
  const votes = (note: SnapshotNote) => unpublishVotes(note, board.snapshot?.notes ?? [], board.snapshot?.groups ?? [])
  const unpublish = (note: SnapshotNote) => withPhase(unpublishRights(note, context(), votes(note).held), 'note.unpublish')
  return { edit, unpublish, votes, reasonText }
}
