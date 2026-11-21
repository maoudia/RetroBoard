/**
 * The state of a poker room, folded from verified events in log order (ADR-0042). Pure and deterministic: every replica that folds
 * the same events reaches the same state, and an event that breaks a rule is ignored, silently, by all of them. Demo code: it
 * becomes `packages/domain/src/estimation` and the kind-aware ledger with task 1.2.
 */
import { KEY_RE, LIMITS, SEALED_RE } from '@retroboard/domain'

/** Voters per room (ADR-0042, finding 3): the 21st seat is ignored by every replica. */
export const VOTER_CAP = 20

export interface Round { readonly id: string; readonly pub: string; readonly ballots: ReadonlyMap<string, string>; readonly revealKey?: string }
export interface PokerState {
  /** `null` until a genesis; `board` for the genesis of a board, whose events this fold never reads. */
  readonly kind: 'poker' | 'board' | null
  readonly moderator: string | null
  readonly seats: ReadonlyMap<string, string>
  readonly rounds: readonly Round[]
}
export interface PokerEvent { readonly author: string; readonly body: unknown }

export const emptyPoker = (): PokerState => ({ kind: null, moderator: null, seats: new Map(), rounds: [] })

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const str = (x: unknown): string => (typeof x === 'string' ? x : '')

export function foldPoker(s: PokerState, e: PokerEvent): PokerState {
  const body = isObject(e.body) ? e.body : null
  if (!body) return s
  if (body.t === 'genesis') {
    if (s.kind !== null || body.facilitatorKey !== e.author || !KEY_RE.test(e.author)) return s
    return body.kind === 'poker' ? { ...s, kind: 'poker', moderator: e.author } : { ...s, kind: 'board' }
  }
  const cmd = s.kind === 'poker' && body.t === 'poker' && isObject(body.cmd) ? body.cmd : null
  if (!cmd) return s
  const current = s.rounds[s.rounds.length - 1]
  switch (cmd.t) {
    case 'seat.join': {
      const name = str(cmd.name).trim().slice(0, LIMITS.displayName)
      if (!name || (!s.seats.has(e.author) && s.seats.size >= VOTER_CAP)) return s
      return { ...s, seats: new Map(s.seats).set(e.author, name) }
    }
    case 'round.start': {
      const id = str(cmd.round)
      if (e.author !== s.moderator || !id || s.rounds.some((r) => r.id === id) || !KEY_RE.test(str(cmd.pub))) return s
      return { ...s, rounds: [...s.rounds, { id, pub: str(cmd.pub), ballots: new Map() }] }
    }
    case 'vote.seal': {
      // The last card of a voter replaces the earlier one, until the reveal; nothing counts after it, or for an older round.
      if (!current || current.revealKey || cmd.round !== current.id || !s.seats.has(e.author) || !SEALED_RE.test(str(cmd.sealed))) return s
      return { ...s, rounds: [...s.rounds.slice(0, -1), { ...current, ballots: new Map(current.ballots).set(e.author, str(cmd.sealed)) }] }
    }
    case 'round.reveal': {
      if (!current || current.revealKey || e.author !== s.moderator || cmd.round !== current.id || !KEY_RE.test(str(cmd.key))) return s
      return { ...s, rounds: [...s.rounds.slice(0, -1), { ...current, revealKey: str(cmd.key) }] }
    }
    default:
      return s
  }
}
