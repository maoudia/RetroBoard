/**
 * Replicated board fold with capabilities (docs/PLAN.md 5.1, 5.2).
 *
 * Every peer folds the same verified events in the same order and must reach the same
 * state, so every decision here is deterministic and depends only on the events:
 * - the first event must be a genesis signed by the facilitator key it announces;
 * - privileged events count only when signed by the facilitator or a delegated co-facilitator;
 * - the actor of a command is its signing key, so "only the author edits" holds without a server.
 *
 * Signature checks happen before this fold (application layer): `author` is the key that
 * produced a valid signature over the event. The domain never sees bytes or crypto.
 */
import { createBoard } from '../facilitation/board'
import { reduce } from '../reducer'
import type { Command, CommandType } from '../shared/commands'
import type { BoardState, ErrorCode } from '../shared/types'
import { KEY_RE, ROOM_ID_RE } from './keyring'

export interface GenesisBody { readonly t: 'genesis'; readonly roomId: string; readonly facilitatorKey: string }
export interface CommandBody { readonly t: 'cmd'; readonly cmd: Command; readonly name: string | null; readonly showName: boolean }
export interface DelegateBody { readonly t: 'role.delegate' | 'role.revoke'; readonly key: string }
export type EventBody = GenesisBody | CommandBody | DelegateBody

export interface VerifiedEvent {
  /** Globally unique, sortable (ULID). Seeds deterministic ids created by this event. */
  readonly id: string
  /** Event clock (ms), used as `now` by the reducer. */
  readonly at: number
  /** Public signing key (base64url) that signed this event. */
  readonly author: string
  readonly body: EventBody
}

export interface Ledger {
  readonly roomId: string
  /** null until a valid genesis is folded. */
  readonly facilitatorKey: string | null
  /** Facilitator plus delegated co-facilitators. */
  readonly facilitators: readonly string[]
  readonly board: BoardState
  readonly applied: number
}

export type IgnoreReason = 'no-genesis' | 'bad-genesis' | 'duplicate-genesis' | 'not-facilitator' | ErrorCode

export type FoldResult =
  | { readonly ok: true; readonly ledger: Ledger }
  | { readonly ok: false; readonly ledger: Ledger; readonly reason: IgnoreReason }

/**
 * Commands that steer the session rather than contribute content: settings (incl. vote
 * reveal and agent policy), board set-up and reset, and the timebox (phases).
 */
export const PRIVILEGED_COMMANDS: ReadonlySet<CommandType> = new Set<CommandType>([
  'settings.update', 'board.init', 'template.apply', 'board.reset', 'timer.start', 'timer.pause', 'timer.reset',
])

/** Genesis and role changes are always privileged; commands depend on their type. */
export const isPrivileged = (body: EventBody): boolean => (body.t === 'cmd' ? PRIVILEGED_COMMANDS.has(body.cmd.t) : true)

/** Ids derived from the event id, identical on every replica. */
const idsFrom = (eventId: string) => {
  let n = 0
  return () => `${eventId.slice(-10)}${(n++).toString(36)}`
}

export function emptyLedger(roomId: string): Ledger {
  return { roomId, facilitatorKey: null, facilitators: [], board: createBoard({ newId: idsFrom(`genesis-${roomId}`) }), applied: 0 }
}

const ignore = (ledger: Ledger, reason: IgnoreReason): FoldResult => ({ ok: false, ledger, reason })
const applied = (ledger: Ledger, patch: Partial<Ledger>): FoldResult => ({ ok: true, ledger: { ...ledger, ...patch, applied: ledger.applied + 1 } })

export function foldEvent(ledger: Ledger, event: VerifiedEvent): FoldResult {
  const { body, author } = event

  if (body.t === 'genesis') {
    if (ledger.facilitatorKey !== null) return ignore(ledger, 'duplicate-genesis')
    const valid = body.roomId === ledger.roomId && ROOM_ID_RE.test(body.roomId) && KEY_RE.test(body.facilitatorKey) && author === body.facilitatorKey
    if (!valid) return ignore(ledger, 'bad-genesis')
    return applied(ledger, { facilitatorKey: author, facilitators: [author] })
  }
  if (ledger.facilitatorKey === null) return ignore(ledger, 'no-genesis')
  if (isPrivileged(body) && !ledger.facilitators.includes(author)) return ignore(ledger, 'not-facilitator')

  switch (body.t) {
    case 'role.delegate':
      if (!KEY_RE.test(body.key)) return ignore(ledger, 'invalid')
      if (ledger.facilitators.includes(body.key)) return applied(ledger, {})
      return applied(ledger, { facilitators: [...ledger.facilitators, body.key] })
    case 'role.revoke':
      // The genesis key is the root of trust and cannot be revoked.
      if (body.key === ledger.facilitatorKey) return ignore(ledger, 'forbidden')
      return applied(ledger, { facilitators: ledger.facilitators.filter((k) => k !== body.key) })
    case 'cmd': {
      const out = reduce(ledger.board, body.cmd, { cid: author, name: body.name, showName: body.showName }, { now: event.at, newId: idsFrom(event.id) })
      return out.ok ? applied(ledger, { board: out.state }) : ignore(ledger, out.error)
    }
  }
}

/** Folds events already in total order. Ignored events leave no trace, identically on every peer. */
export function foldAll(ledger: Ledger, events: Iterable<VerifiedEvent>): Ledger {
  let current = ledger
  for (const e of events) current = foldEvent(current, e).ledger
  return current
}
