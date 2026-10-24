import type { VotableKind } from '../shared/commands'
import { done, fail, type HandlerMap } from '../shared/outcome'
import type { Actor, BoardState, Outcome } from '../shared/types'
import { countOf, votability, votesUsedBy } from './policy'

function guard(s: BoardState): Outcome | null {
  if (s.settings.locked) return fail('locked')
  if (s.settings.votingClosed) return fail('voting-closed')
  return null
}

function addVote(s: BoardState, kind: VotableKind, id: string, a: Actor): Outcome {
  const blocked = guard(s) ?? (() => { const r = votability(s, kind, id); return r ? fail(r) : null })()
  if (blocked) return blocked
  if (votesUsedBy(s, a.cid) >= s.settings.voteLimit) return fail('vote-limit')
  const voters = kind === 'note' ? s.notes[id]!.voters : s.groups[id]!.voters
  if (countOf(voters, a.cid) >= s.settings.maxVotesPerItem) return fail('item-limit')
  return kind === 'note'
    ? done({ ...s, notes: { ...s.notes, [id]: { ...s.notes[id]!, voters: [...voters, a.cid] } } }, { notes: [id] })
    : done({ ...s, groups: { ...s.groups, [id]: { ...s.groups[id]!, voters: [...voters, a.cid] } } }, { groups: [id] })
}

/** Removes one of the actor's votes from the item (undo). Allowed even if the item became unvotable. */
function removeVote(s: BoardState, kind: VotableKind, id: string, a: Actor): Outcome {
  const blocked = guard(s)
  if (blocked) return blocked
  const item = kind === 'note' ? s.notes[id] : s.groups[id]
  if (!item) return fail('not-found')
  const i = item.voters.lastIndexOf(a.cid)
  if (i < 0) return done(s, {})
  const voters = [...item.voters.slice(0, i), ...item.voters.slice(i + 1)]
  return kind === 'note'
    ? done({ ...s, notes: { ...s.notes, [id]: { ...s.notes[id]!, voters } } }, { notes: [id] })
    : done({ ...s, groups: { ...s.groups, [id]: { ...s.groups[id]!, voters } } }, { groups: [id] })
}

/** Voting context: dot votes with a per-person budget, a per-item cap, votes on notes or clusters, a closing phase. */
export const votingHandlers: HandlerMap<'vote.toggle' | 'vote.add' | 'vote.remove' | 'vote.close' | 'vote.reopen'> = {
  // Kept for clients of protocol v1: one vote per note, on or off.
  'vote.toggle': (s, c, a) => {
    const n = s.notes[c.id]
    if (n && n.voters.includes(a.cid)) return removeVote(s, 'note', c.id, a)
    return addVote(s, 'note', c.id, a)
  },
  'vote.add': (s, c, a) => addVote(s, c.kind, c.id, a),
  'vote.remove': (s, c, a) => removeVote(s, c.kind, c.id, a),
  'vote.close': (s) => done({ ...s, settings: { ...s.settings, votingClosed: true } }, { meta: true }),
  'vote.reopen': (s) => done({ ...s, settings: { ...s.settings, votingClosed: false } }, { meta: true }),
}
