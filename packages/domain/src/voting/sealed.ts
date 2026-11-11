import type { RevealCount, VotableKind } from '../shared/commands'
import type { BoardSettings, BoardState } from '../shared/types'
import { ballotsOf, votability } from './policy'

/** Shape of a sealed ballot on the wire: base64url of ephemeral key, nonce, padded vote and tag (about 135 characters). */
export const SEALED_RE = /^[A-Za-z0-9_-]{120,400}$/
/** Items one reveal may carry: keeps the event within the message budget (LIMITS.maxMessageBytes). */
export const MAX_REVEAL_ITEMS = 150
/** The only voter a revealed vote has: after the reveal nobody can tell who voted. */
export const SEALED_VOTER = '~sealed'

/** Counts are hidden: until voting closes with hidden counts, and until the reveal with a sealed ballot. */
export const countsHidden = (s: Pick<BoardSettings, 'secretVoting' | 'votingClosed' | 'sealedBallot' | 'sealedRevealed'>): boolean =>
  s.sealedBallot ? !s.sealedRevealed : s.secretVoting && !s.votingClosed

export const sealedBallotsBy = (s: BoardState, cid: string): number => ballotsOf(s).filter((b) => b.cid === cid).length

/** A ballot the facilitator device could open: its voter (public) and the vote inside, null when it did not open. */
export interface OpenedBallot { readonly cid: string; readonly choice: { readonly kind: VotableKind; readonly id: string } | null }

/**
 * Counts opened ballots under the board's policy, in log order: unknown or unvotable items and votes beyond the budget
 * or the per-item cap of a voter are dropped. Pure; the result carries no voter.
 */
export function tallyBallots(s: BoardState, opened: readonly OpenedBallot[]): RevealCount[] {
  const used = new Map<string, number>()
  const counts = new Map<string, RevealCount>()
  for (const { cid, choice } of opened) {
    if (!choice || votability(s, choice.kind, choice.id) !== null) continue
    const mine = `${cid}|${choice.kind}|${choice.id}`
    if ((used.get(cid) ?? 0) >= s.settings.voteLimit || (used.get(mine) ?? 0) >= s.settings.maxVotesPerItem) continue
    used.set(cid, (used.get(cid) ?? 0) + 1)
    used.set(mine, (used.get(mine) ?? 0) + 1)
    const item = `${choice.kind}|${choice.id}`
    counts.set(item, { kind: choice.kind, id: choice.id, votes: (counts.get(item)?.votes ?? 0) + 1 })
  }
  // The key is `kind|id`, so the plain string order is the order by kind then id.
  return [...counts.keys()].sort().map((item) => counts.get(item)!)
}

/**
 * Can this reveal be true, judging by public data only? Each item could have received, per voter, at most
 * min(maxVotesPerItem, ballots cast), and the total cannot exceed the ballots cast. Every replica applies the same test.
 */
export function revealIsPlausible(s: BoardState, counts: readonly RevealCount[]): boolean {
  const ballots = ballotsOf(s)
  const perItemMax = [...new Set(ballots.map((b) => b.cid))].reduce((n, cid) => n + Math.min(s.settings.maxVotesPerItem, sealedBallotsBy(s, cid)), 0)
  const seen = new Set<string>()
  let total = 0
  for (const c of counts) {
    const item = `${c.kind}|${c.id}`
    if (seen.has(item) || !Number.isInteger(c.votes) || c.votes < 1 || c.votes > perItemMax) return false
    seen.add(item)
    total += c.votes
  }
  return total <= ballots.length
}
