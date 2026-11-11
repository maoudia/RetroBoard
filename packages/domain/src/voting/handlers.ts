import type { RevealCount, VotableKind } from '../shared/commands'
import { done, fail, type HandlerMap } from '../shared/outcome'
import type { Actor, BoardState, Outcome } from '../shared/types'
import { ballotsOf, countOf, votability, votesUsedBy } from './policy'
import { revealIsPlausible, SEALED_RE, SEALED_VOTER, sealedBallotsBy } from './sealed'

function guard(s: BoardState): Outcome | null {
  if (s.settings.locked) return fail('locked')
  if (s.settings.votingClosed) return fail('voting-closed')
  return null
}

function addVote(s: BoardState, kind: VotableKind, id: string, a: Actor): Outcome {
  // A sealed ballot never lets a choice travel in clear.
  if (s.settings.sealedBallot) return fail('forbidden')
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
  if (s.settings.sealedBallot) return fail('forbidden')
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

/** Casts one sealed ballot. Only public data is checked here (mode, budget, replay): the choice is readable by the ballot key alone. */
function sealVote(s: BoardState, sealed: string, a: Actor): Outcome {
  const blocked = guard(s)
  if (blocked) return blocked
  if (!s.settings.sealedBallot || !SEALED_RE.test(sealed)) return fail('invalid')
  if (s.settings.sealedRevealed) return fail('voting-closed')
  const ballots = ballotsOf(s)
  // A copied ciphertext is a replay, and it would not open under another voter anyway (the voter is in its aad).
  if (ballots.some((b) => b.sealed === sealed)) return fail('invalid')
  if (sealedBallotsBy(s, a.cid) >= s.settings.voteLimit) return fail('vote-limit')
  return done({ ...s, sealed: [...ballots, { cid: a.cid, sealed }] }, { meta: true })
}

/** Withdraws one of my own sealed ballots (undo), found by its sealed value. */
function unsealVote(s: BoardState, sealed: string, a: Actor): Outcome {
  const blocked = guard(s)
  if (blocked) return blocked
  if (!s.settings.sealedBallot) return fail('invalid')
  const ballots = ballotsOf(s)
  if (!ballots.some((b) => b.cid === a.cid && b.sealed === sealed)) return done(s, {})
  // A sealed value is unique in the log (sealVote refuses a copy), so it names exactly the ballot found above.
  return done({ ...s, sealed: ballots.filter((b) => b.sealed !== sealed) }, { meta: true })
}

/** Applies the signed tally of a sealed ballot: the counts become anonymous votes, voting closes. */
function revealTally(s: BoardState, counts: RevealCount[]): Outcome {
  if (!s.settings.sealedBallot || s.settings.sealedRevealed) return fail('invalid')
  if (!revealIsPlausible(s, counts)) return fail('invalid')
  const notes = { ...s.notes }
  const groups = { ...s.groups }
  for (const { kind, id, votes } of counts) {
    const why = votability(s, kind, id)
    if (why) return fail(why)
    const voters = Array<string>(votes).fill(SEALED_VOTER)
    if (kind === 'note') notes[id] = { ...s.notes[id]!, voters }
    else groups[id] = { ...s.groups[id]!, voters }
  }
  return done(
    { ...s, notes, groups, settings: { ...s.settings, votingClosed: true, sealedRevealed: true } },
    { meta: true, notes: counts.filter((c) => c.kind === 'note').map((c) => c.id), groups: counts.filter((c) => c.kind === 'cluster').map((c) => c.id) },
  )
}

/** Voting context: dot votes with a per-person budget, a per-item cap, votes on notes or clusters, a closing phase. */
export const votingHandlers: HandlerMap<'vote.toggle' | 'vote.add' | 'vote.remove' | 'vote.seal' | 'vote.unseal' | 'vote.reveal' | 'vote.close' | 'vote.reopen'> = {
  // Kept for clients of protocol v1: one vote per note, on or off.
  'vote.toggle': (s, c, a) => {
    const n = s.notes[c.id]
    if (n && n.voters.includes(a.cid)) return removeVote(s, 'note', c.id, a)
    return addVote(s, 'note', c.id, a)
  },
  'vote.add': (s, c, a) => addVote(s, c.kind, c.id, a),
  'vote.remove': (s, c, a) => removeVote(s, c.kind, c.id, a),
  'vote.seal': (s, c, a) => sealVote(s, c.sealed, a),
  'vote.unseal': (s, c, a) => unsealVote(s, c.sealed, a),
  'vote.reveal': (s, c) => revealTally(s, c.counts),
  'vote.close': (s) => done({ ...s, settings: { ...s.settings, votingClosed: true } }, { meta: true }),
  // The tally of a sealed ballot is final: voting restarts with vote.reset (a new round).
  'vote.reopen': (s) => (s.settings.sealedRevealed ? fail('forbidden') : done({ ...s, settings: { ...s.settings, votingClosed: false } }, { meta: true })),
}
