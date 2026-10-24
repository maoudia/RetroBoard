import { NOTE_COLOR_COUNT } from '../shared/limits'
import type { Actor, BoardState, Dirty, NoteRecord, ReduceContext } from '../shared/types'

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/** `offset` keeps notes of one batch in order (createdAt is the sort key). */
export function makeNote(actor: Actor, ctx: ReduceContext, columnId: string, text: string, color?: number, offset = 0): NoteRecord {
  const id = ctx.newId()
  return {
    id, columnId, text, color: color ?? hash(id) % NOTE_COLOR_COUNT,
    author: actor.showName && actor.name ? actor.name : null,
    ownerCid: actor.cid, groupId: null, voters: [], createdAt: ctx.now + offset,
  }
}

/**
 * Dissolve groups that no longer hold at least two notes.
 * Mutates the working copies passed in, and records what changed.
 */
export function normalizeGroups(
  ids: Iterable<string>, notes: BoardState['notes'], groups: BoardState['groups'], dirty: Dirty,
): void {
  for (const gid of ids) {
    if (!groups[gid]) continue
    const members = Object.values(notes).filter((n) => n.groupId === gid)
    if (members.length >= 2) continue
    for (const m of members) {
      notes[m.id] = { ...m, groupId: null }
      dirty.notes.push(m.id)
    }
    Reflect.deleteProperty(groups, gid)
    dirty.groups.push(gid)
  }
}
