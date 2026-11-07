import type { Command, Snapshot } from '@retroboard/domain'

/** What an undo step is called, for the toast and the tests. */
export type UndoLabel = 'group' | 'ungroup' | 'move' | 'edit' | 'color' | 'delete' | 'rename'

/** The commands that put the board back as it was before one of my own actions. */
export interface Inverse { label: UndoLabel; commands: Command[]; /** The action itself, replayed by redo. */ redo?: Command[] }

/**
 * Compensating commands for the reversible actions of the participant (change board-undo-rewind): the log stays
 * append-only, an undo is a new command computed from the state seen just before the action. Anything that cannot be
 * reversed exactly (reset, an idea written by someone else) has no inverse: it is never half undone.
 */
export function inverseOf(cmd: Command, view: Snapshot | null): Inverse | null {
  const inv = inverseOfInner(cmd, view)
  // A deleted idea comes back as a new one (new id), so there is nothing to replay for a redo.
  return inv ? (cmd.t === 'note.delete' ? inv : { ...inv, redo: [cmd] }) : null
}

function inverseOfInner(cmd: Command, view: Snapshot | null): Inverse | null {
  if (!view) return null
  const note = (id: string) => view.notes.find((n) => n.id === id)
  const othersIn = (groupId: string, except: string) => view.notes.filter((n) => n.groupId === groupId && n.id !== except)
  switch (cmd.t) {
    case 'note.move': {
      const n = note(cmd.id)
      return n && n.columnId !== cmd.columnId ? { label: 'move', commands: [{ t: 'note.move', id: n.id, columnId: n.columnId }] } : null
    }
    case 'note.group': {
      const a = note(cmd.id)
      const b = note(cmd.ontoId)
      if (!a || !b || a.id === b.id || (a.groupId !== null && a.groupId === b.groupId)) return null
      if (a.groupId === null) {
        const back: Command[] = [{ t: 'note.ungroup', id: a.id }]
        if (a.columnId !== b.columnId) back.push({ t: 'note.move', id: a.id, columnId: a.columnId })
        return { label: 'group', commands: back }
      }
      const mate = othersIn(a.groupId, a.id)[0]
      return mate ? { label: 'group', commands: [{ t: 'note.group', id: a.id, ontoId: mate.id }] } : null
    }
    case 'note.ungroup': {
      const n = note(cmd.id)
      const mate = n?.groupId ? othersIn(n.groupId, n.id)[0] : undefined
      return n && mate ? { label: 'ungroup', commands: [{ t: 'note.group', id: n.id, ontoId: mate.id }] } : null
    }
    case 'note.edit': {
      const n = note(cmd.id)
      return n && n.text !== cmd.text ? { label: 'edit', commands: [{ t: 'note.edit', id: n.id, text: n.text }] } : null
    }
    case 'note.delete': {
      // My idea comes back as a new idea with its text, colour and column. Its votes and its cluster are gone for good, as a delete means.
      const n = note(cmd.id)
      return n && n.mine ? { label: 'delete', commands: [{ t: 'note.add', columnId: n.columnId, text: n.text, color: n.color }] } : null
    }
    case 'group.rename': {
      const g = view.groups.find((x) => x.id === cmd.id)
      return g && (g.title ?? '') !== cmd.title ? { label: 'rename', commands: [{ t: 'group.rename', id: g.id, title: g.title ?? '' }] } : null
    }
    case 'note.color': {
      const n = note(cmd.id)
      return n && n.color !== cmd.color ? { label: 'color', commands: [{ t: 'note.color', id: n.id, color: n.color }] } : null
    }
  }
  return null
}

/** Bounded stack of inverses, most recent last. */
export function createUndoStack(max = 30) {
  const items: Inverse[] = []
  return {
    push(inv: Inverse) { items.push(inv); if (items.length > max) items.shift() },
    pop: (): Inverse | undefined => items.pop(),
    peek: (): Inverse | undefined => items.at(-1),
    clear() { items.length = 0 },
    get size() { return items.length },
  }
}
