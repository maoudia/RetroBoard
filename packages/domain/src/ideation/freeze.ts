import type { Command } from '../shared/commands'
import { done, fail, type HandlerMap } from '../shared/outcome'
import type { BoardState } from '../shared/types'

/** Frozen notes and clusters (change note-freeze): visible, read only, until a facilitator unfreezes them. */
export const freezeHandlers: HandlerMap<'note.freeze' | 'note.unfreeze'> = {
  'note.freeze': (s, c) => setFrozen(s, c.id, true),
  'note.unfreeze': (s, c) => setFrozen(s, c.id, false),
}

function setFrozen(s: BoardState, id: string, frozen: boolean) {
  const n = s.notes[id]
  const g = s.groups[id]
  if (!n && !g) return fail('not-found')
  if (!!(n ?? g)!.frozen === frozen) return done(s, {})
  if (n) return done({ ...s, notes: { ...s.notes, [id]: { ...n, frozen: frozen || undefined } } }, { notes: [id] })
  return done({ ...s, groups: { ...s.groups, [id]: { ...g!, frozen: frozen || undefined } } }, { groups: [id] })
}

/** A note is frozen on its own or through its cluster. */
export const isFrozenNote = (s: BoardState, id: string): boolean => {
  const n = s.notes[id]
  return !!n && (!!n.frozen || (!!n.groupId && !!s.groups[n.groupId]?.frozen))
}
const isFrozenGroup = (s: BoardState, id: string): boolean => !!s.groups[id]?.frozen
const isFrozen = (s: BoardState, id: string): boolean => isFrozenNote(s, id) || isFrozenGroup(s, id)

/**
 * True when the command would change something frozen: edits, votes, moves, grouping, colour and deletion.
 * Checked once in the reducer so every peer refuses the same way.
 */
export function touchesFrozen(s: BoardState, cmd: Command): boolean {
  switch (cmd.t) {
    case 'note.edit': case 'note.delete': case 'note.move': case 'note.color': case 'note.ungroup':
    case 'group.rename': case 'group.dissolve': case 'group.move': case 'vote.toggle':
      return isFrozen(s, cmd.id)
    case 'note.group': case 'group.merge':
      return isFrozen(s, cmd.id) || isFrozen(s, cmd.ontoId)
    case 'vote.add': case 'vote.remove':
      return isFrozen(s, cmd.id)
    case 'column.delete':
      return Object.values(s.notes).some((n) => n.columnId === cmd.id && isFrozenNote(s, n.id))
    default:
      return false
  }
}
