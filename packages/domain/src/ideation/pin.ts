import { done, fail, type HandlerMap } from '../shared/outcome'
import type { BoardState } from '../shared/types'

/**
 * Pinned notes and clusters (change note-pin): shown first in their column until unpinned.
 * The pin order is the time of the pin (the event clock, identical on every replica).
 * Pinning does not lock anything: that is what freezing is for.
 */
export const pinHandlers: HandlerMap<'note.pin' | 'note.unpin'> = {
  'note.pin': (s, c, _a, ctx) => setPinned(s, c.id, ctx.now),
  'note.unpin': (s, c) => setPinned(s, c.id, undefined),
}

function setPinned(s: BoardState, id: string, at: number | undefined) {
  const n = s.notes[id]
  const g = s.groups[id]
  if (!n && !g) return fail('not-found')
  // A note inside a cluster is pinned through its cluster.
  if (n?.groupId) return fail('invalid')
  if (((n ?? g)!.pinned !== undefined) === (at !== undefined)) return done(s, {})
  if (n) return done({ ...s, notes: { ...s.notes, [id]: { ...n, pinned: at } } }, { notes: [id] })
  return done({ ...s, groups: { ...s.groups, [id]: { ...g!, pinned: at } } }, { groups: [id] })
}
