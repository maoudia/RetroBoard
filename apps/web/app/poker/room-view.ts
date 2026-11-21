/**
 * What the room says, by state and role (change poker-design-v2, K6): the one status line of the bar and the one hint.
 * Pure functions of the view model, so a unit test holds the table of the design.
 */
import type { PokerView, SeatView } from './client'
import type { PokerKey } from './strings'

/** A line of text: a key of the poker strings and the values it needs. */
export interface Say { readonly key: PokerKey; readonly params?: Readonly<Record<string, string | number>> }

/** The one status line under the round: what is not normal, or the count while voting. "Connected" is never said. */
export function statusOf(v: PokerView): Say | null {
  if (v.status === 'board') return null
  if (v.status === 'full') return { key: 'poker.status.full' }
  if (v.status === 'connecting') return { key: 'poker.status.connecting' }
  if (v.status === 'offline') return { key: 'poker.status.offline' }
  const round = v.round
  if (!round) return { key: 'poker.status.connecting' }
  if (!v.voter) return { key: 'poker.status.watching' }
  if (round.revealed) return { key: 'poker.revealed' }
  if (v.seats.length <= 1 && round.voted === 0) return { key: 'poker.status.alone' }
  return { key: 'poker.progress', params: { voted: round.voted, total: round.voters } }
}

/** The names of the people a room still waits for: "Dee", "Dee and Eli", "Dee, Eli and 3 others" (as a line to write in the current language). */
export function namesOf(missing: readonly SeatView[]): Say {
  const [a, b] = missing
  if (missing.length === 1) return { key: 'poker.hint.names.one', params: { a: a!.name } }
  if (missing.length === 2) return { key: 'poker.hint.names.two', params: { a: a!.name, b: b!.name } }
  return { key: 'poker.hint.names.more', params: { a: a!.name, b: b!.name, n: missing.length - 2 } }
}

/** What the dock offers in this state (K2): nothing to an observer, the hand while a round is open, the next steps after the reveal. */
export type DockKind = 'none' | 'hand' | 'revealed'

export function dockOf(v: PokerView): DockKind {
  if (!v.round || !v.voter || v.status === 'full' || v.status === 'board') return 'none'
  return v.round.revealed ? 'revealed' : 'hand'
}

/** The one muted hint line, or null (K6). `say` writes a line in the current language (it is needed for the names of the people waited for). */
export function hintOf(v: PokerView, say: (line: Say) => string): Say | null {
  const round = v.round
  if (!round || v.status === 'board' || v.status === 'full') return null
  if (!v.voter) return { key: 'poker.hint.watching' }
  const lead = v.seats.find((s) => s.moderator)?.name ?? ''
  if (round.revealed) return v.moderator ? null : { key: 'poker.hint.next', params: { name: lead } }
  if (v.moderator && !v.canReveal) return { key: 'poker.hint.holder' }
  if (v.seats.length <= 1 && round.voted === 0) return { key: 'poker.hint.alone' }
  // A person who has not chosen yet has the hand as their hint.
  if (v.mine === null) return null
  const missing = v.seats.filter((s) => s.voter && !s.voted)
  if (missing.length > 0) return { key: 'poker.hint.waiting', params: { names: say(namesOf(missing)) } }
  // Everyone has voted: the moderator has Reveal, the others wait for the moderator.
  return v.moderator ? null : { key: 'poker.hint.everyone', params: { name: lead } }
}
