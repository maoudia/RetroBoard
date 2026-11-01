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
import { allowedInPhase } from '../facilitation/agenda'
import { LIMITS } from '../shared/limits'
import type { BoardState, ErrorCode } from '../shared/types'
import { KEY_RE, ROOM_ID_RE } from './keyring'

export interface GenesisBody { readonly t: 'genesis'; readonly roomId: string; readonly facilitatorKey: string }
export interface CommandBody { readonly t: 'cmd'; readonly cmd: Command; readonly name: string | null; readonly showName: boolean }
/**
 * Role events, by session public key: delegate (co-facilitator), revoke, hand over (the key
 * becomes the facilitator, the previous one stays co-facilitator), claim (take over with the
 * facilitator link: same effect as a hand-over, but only the capability key may sign it, and the
 * last claim in the total order wins), hide/unhide a participant.
 */
export interface RoleBody {
  readonly t: 'role.delegate' | 'role.revoke' | 'role.handover' | 'role.claim' | 'participant.hide' | 'participant.unhide' | 'participant.remove'
  readonly key: string
}
/** Facilitator-set display name of a participant, on this board only (an empty name clears it). */
export interface RenameBody { readonly t: 'participant.rename'; readonly key: string; readonly name: string }
/** My own display name on this board, applied to the signed notes I already published (an empty name clears it). */
export interface SelfNameBody { readonly t: 'participant.self'; readonly name: string }
/** @deprecated name kept for readers of earlier code: same as RoleBody. */
export type DelegateBody = RoleBody
export type EventBody = GenesisBody | CommandBody | RoleBody | RenameBody | SelfNameBody

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
  /** Genesis key (root of trust, the creator's facilitator link). null until a valid genesis. */
  readonly facilitatorKey: string | null
  /** Current facilitator: the genesis key, or whoever it was handed over to. */
  readonly lead: string | null
  /** Facilitator, root and co-facilitators: may steer the board. */
  readonly facilitators: readonly string[]
  /** Participants whose events are ignored from now on (their earlier content stays). */
  readonly hidden: readonly string[]
  /** Participants removed by the facilitator: hidden too, and their client leaves the board. */
  readonly removed: readonly string[]
  /** Names set by the facilitator, by participant key. */
  readonly names: Readonly<Record<string, string>>
  /** Names chosen by the participants themselves, by key (a facilitator-set name wins). */
  readonly selfNames: Readonly<Record<string, string>>
  readonly board: BoardState
  readonly applied: number
  /** Clocks of each author's recent accepted events (rate limit window). */
  readonly recent: Readonly<Record<string, readonly number[]>>
}

export type IgnoreReason = 'no-genesis' | 'bad-genesis' | 'duplicate-genesis' | 'not-facilitator' | 'rate-limited' | 'hidden' | 'closed' | ErrorCode

export type FoldResult =
  | { readonly ok: true; readonly ledger: Ledger }
  | { readonly ok: false; readonly ledger: Ledger; readonly reason: IgnoreReason }

/**
 * Commands that steer the session rather than contribute content: settings (incl. vote
 * reveal and agent policy), board set-up and reset, and the timebox (phases).
 */
export const PRIVILEGED_COMMANDS: ReadonlySet<CommandType> = new Set<CommandType>([
  'settings.update', 'board.init', 'template.apply', 'board.reset', 'board.destroy', 'column.reset', 'vote.reset', 'timer.start', 'timer.pause', 'timer.reset',
  'vote.close', 'vote.reopen', 'note.freeze', 'note.unfreeze', 'note.pin', 'note.unpin', 'column.hide', 'column.show', 'action.import', 'drafts.reveal',
  'agenda.set', 'agenda.options', 'agenda.clear', 'agenda.start', 'agenda.pause', 'agenda.next', 'agenda.prev', 'agenda.extend', 'agenda.end', 'agenda.voteOpen', 'agenda.toClose',
  'talk.assign', 'talk.end',
])

/** Genesis and role changes are always privileged; commands depend on their type. */
export const isPrivileged = (body: EventBody): boolean => (body.t === 'cmd' ? PRIVILEGED_COMMANDS.has(body.cmd.t) : body.t !== 'participant.self')

/** Role changes: only the current facilitator or the genesis key, never a co-facilitator. */
const isRoleChange = (body: EventBody): body is RoleBody | RenameBody => body.t !== 'cmd' && body.t !== 'genesis' && body.t !== 'participant.self'

export type Role = 'facilitator' | 'co-facilitator' | 'participant'

/** Role of a signing key in this ledger. Legacy (no genesis) boards have no roles: everyone steers. */
export function roleOf(ledger: Ledger, key: string): Role {
  if (ledger.facilitatorKey === null) return 'facilitator'
  if (key === ledger.lead) return 'facilitator'
  return ledger.facilitators.includes(key) ? 'co-facilitator' : 'participant'
}

/** May this key run privileged commands right now? (everyone on an "Everyone facilitates" board) */
export const canSteer = (ledger: Ledger, key: string): boolean =>
  roleOf(ledger, key) !== 'participant' || ledger.board.settings.openFacilitation

/** Phase rules are skipped for facilitators only, never because the board is open. */
export const bypassesPhaseRules = (ledger: Ledger, key: string): boolean => roleOf(ledger, key) !== 'participant'

/** Ids derived from the event id, identical on every replica. */
const idsFrom = (eventId: string) => {
  let n = 0
  return () => `${eventId.slice(-10)}${(n++).toString(36)}`
}

export function emptyLedger(roomId: string): Ledger {
  return { roomId, facilitatorKey: null, lead: null, facilitators: [], hidden: [], removed: [], names: {}, selfNames: {}, board: createBoard({ newId: idsFrom(`genesis-${roomId}`) }), applied: 0, recent: {} }
}

const ignore = (ledger: Ledger, reason: IgnoreReason): FoldResult => ({ ok: false, ledger, reason })
const applied = (ledger: Ledger, patch: Partial<Ledger>): FoldResult => ({ ok: true, ledger: { ...ledger, ...patch, applied: ledger.applied + 1 } })

/** The author's accepted clocks still inside the window ending at `at`. */
const windowOf = (ledger: Ledger, author: string, at: number): readonly number[] =>
  (ledger.recent[author] ?? []).filter((t) => t > at - LIMITS.foldRateWindowMs)

export function foldEvent(ledger: Ledger, event: VerifiedEvent): FoldResult {
  const out = foldUnlimited(ledger, event)
  if (!out.ok || event.body.t === 'genesis') return out
  return { ok: true, ledger: { ...out.ledger, recent: { ...ledger.recent, [event.author]: [...windowOf(ledger, event.author, event.at), event.at] } } }
}

function foldUnlimited(ledger: Ledger, event: VerifiedEvent): FoldResult {
  const { body, author } = event
  if (body.t !== 'genesis' && windowOf(ledger, author, event.at).length >= LIMITS.foldRateMax) return ignore(ledger, 'rate-limited')

  if (body.t === 'genesis') {
    if (ledger.facilitatorKey !== null) return ignore(ledger, 'duplicate-genesis')
    const valid = body.roomId === ledger.roomId && ROOM_ID_RE.test(body.roomId) && KEY_RE.test(body.facilitatorKey) && author === body.facilitatorKey
    if (!valid) return ignore(ledger, 'bad-genesis')
    return applied(ledger, { facilitatorKey: author, lead: author, facilitators: [author] })
  }
  if (ledger.facilitatorKey === null) return ignore(ledger, 'no-genesis')
  if (ledger.hidden.includes(author)) return ignore(ledger, 'hidden')
  // A destroyed board is closed for good: whatever arrives after it, from anyone, is ignored by every replica.
  if (ledger.board.settings.destroyed) return ignore(ledger, 'closed')
  if (isRoleChange(body)) {
    if (author !== ledger.lead && author !== ledger.facilitatorKey) return ignore(ledger, 'not-facilitator')
    if (!KEY_RE.test(body.key)) return ignore(ledger, 'invalid')
    // A takeover is the facilitator link at work: signed by the capability key, never by a co-facilitator's session key.
    if (body.t === 'role.claim' && author !== ledger.facilitatorKey) return ignore(ledger, 'not-facilitator')
  } else if (body.t === 'cmd' && body.cmd.t === 'board.destroy' && !ledger.facilitators.includes(author)) {
    // Closing the board is never delegated to "everyone": it needs the facilitator capability even on an open board.
    return ignore(ledger, 'not-facilitator')
  } else if (isPrivileged(body) && !ledger.facilitators.includes(author) && !ledger.board.settings.openFacilitation) {
    return ignore(ledger, 'not-facilitator')
  } else if (body.t === 'cmd' && body.cmd.t === 'settings.update' && body.cmd.openFacilitation !== undefined && !ledger.facilitators.includes(author)) {
    // Switching between "Everyone facilitates" and "One facilitator" needs the facilitator capability, even on an open board.
    return ignore(ledger, 'not-facilitator')
  } else if (body.t === 'cmd' && !bypassesPhaseRules(ledger, author) && !(isPrivileged(body) && canSteer(ledger, author)) && !allowedInPhase(ledger.board.agenda, body.cmd.t)) {
    // Phase rules: participants only do what the current phase is about. Steering commands
    // (next phase, timers) stay open to everyone on an open board.
    return ignore(ledger, 'phase')
  }

  const without = (list: readonly string[], key: string) => list.filter((k) => k !== key)
  switch (body.t) {
    case 'role.delegate':
      if (ledger.facilitators.includes(body.key)) return applied(ledger, {})
      return applied(ledger, { facilitators: [...ledger.facilitators, body.key] })
    case 'role.revoke':
      // The genesis key is the root of trust, and the facilitator must hand over first.
      if (body.key === ledger.facilitatorKey || body.key === ledger.lead) return ignore(ledger, 'forbidden')
      return applied(ledger, { facilitators: without(ledger.facilitators, body.key) })
    case 'role.claim':
    case 'role.handover':
      if (ledger.hidden.includes(body.key)) return ignore(ledger, 'forbidden')
      return applied(ledger, { lead: body.key, facilitators: ledger.facilitators.includes(body.key) ? ledger.facilitators : [...ledger.facilitators, body.key] })
    case 'participant.hide':
      if (ledger.facilitators.includes(body.key)) return ignore(ledger, 'forbidden')
      return applied(ledger, { hidden: ledger.hidden.includes(body.key) ? ledger.hidden : [...ledger.hidden, body.key] })
    case 'participant.unhide':
      // A removed participant stays out: only a fresh link brings them back.
      if (ledger.removed.includes(body.key)) return ignore(ledger, 'forbidden')
      return applied(ledger, { hidden: without(ledger.hidden, body.key) })
    case 'participant.remove':
      if (ledger.facilitators.includes(body.key)) return ignore(ledger, 'forbidden')
      return applied(ledger, {
        hidden: ledger.hidden.includes(body.key) ? ledger.hidden : [...ledger.hidden, body.key],
        removed: ledger.removed.includes(body.key) ? ledger.removed : [...ledger.removed, body.key],
      })
    case 'participant.rename': {
      // Facilitators keep their own names: nobody renames the person who can steer the board.
      if (ledger.facilitators.includes(body.key)) return ignore(ledger, 'forbidden')
      const name = body.name.trim().slice(0, LIMITS.displayName)
      const { [body.key]: _old, ...rest } = ledger.names
      return applied(ledger, { names: name ? { ...rest, [body.key]: name } : rest })
    }
    case 'participant.self': {
      const name = body.name.trim().slice(0, LIMITS.displayName)
      const { [author]: _old, ...rest } = ledger.selfNames
      return applied(ledger, { selfNames: name ? { ...rest, [author]: name } : rest })
    }
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
