/**
 * The board library (change user-drive-storage, design "Board library"): the user's catalog of boards, sealed in the
 * `library` stream of a vault and kept in the browser before any target is connected. Pure functions over plain values.
 */
import { type Stamp, compareStamps, nextStamp } from './stamp'

export interface LibraryEntry {
  /** Room id. */
  readonly boardId: string
  readonly title: string
  /** Local team workspace reference (ADR-0027), if any. */
  readonly teamId?: string
  readonly role: 'facilitator' | 'participant'
  readonly origin: 'created' | 'joined'
  /** The link fragment holding the board keys, to reopen the board: sealed with the entry, never in a name. */
  readonly fragment: string
  /** The passcode itself is not stored; reopening asks for it. */
  readonly hasPasscode: boolean
  /** A solo board never reaches the real relay, on any device. */
  readonly solo: boolean
  readonly createdAt: number
  readonly lastActivityAt: number
  readonly archived: boolean
  /** This board's events are mirrored to the target and fetched eagerly. */
  readonly keepOffline: boolean
  readonly stamp: Stamp
}

/** "Forget": a removal that beats an older write of the same entry on every device. */
export interface LibraryTombstone {
  readonly boardId: string
  readonly forgotten: true
  readonly lastActivityAt: number
  readonly stamp: Stamp
}

export type LibraryRecord = LibraryEntry | LibraryTombstone
export type Library = Readonly<Record<string, LibraryRecord>>

export const EMPTY_LIBRARY: Library = {}

export const isTombstone = (r: LibraryRecord): r is LibraryTombstone => 'forgotten' in r

/**
 * Last write wins by stamp; `lastActivityAt` is the maximum of both sides, whichever wins, so that a later write on a
 * device that did not see the other's activity does not make the board look older. The tombstone keeps it too, which makes the
 * merge associative: any grouping of the same writes gives the same record.
 */
export function mergeRecord(a: LibraryRecord, b: LibraryRecord): LibraryRecord {
  const winner = compareStamps(b.stamp, a.stamp) > 0 ? b : a
  const lastActivityAt = Math.max(a.lastActivityAt, b.lastActivityAt)
  return winner.lastActivityAt === lastActivityAt ? winner : { ...winner, lastActivityAt }
}

export function mergeLibrary(a: Library, b: Library): Library {
  const out = new Map(Object.entries(a))
  for (const [id, record] of Object.entries(b)) {
    const mine = out.get(id)
    out.set(id, mine ? mergeRecord(mine, record) : record)
  }
  return Object.fromEntries(out)
}

/** The boards to list, most recent first; archived ones only when asked for. */
export function libraryEntries(library: Library, opts: { archived?: boolean } = {}): LibraryEntry[] {
  return Object.values(library)
    .filter((r): r is LibraryEntry => !isTombstone(r) && r.archived === (opts.archived ?? false))
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt || (a.boardId < b.boardId ? -1 : 1))
}

export const getEntry = (library: Library, boardId: string): LibraryEntry | undefined => {
  const r = Object.hasOwn(library, boardId) ? library[boardId] : undefined
  return r && !isTombstone(r) ? r : undefined
}

export type NewEntry = Omit<LibraryEntry, 'stamp' | 'createdAt' | 'lastActivityAt' | 'archived' | 'keepOffline' | 'solo'> &
  Partial<Pick<LibraryEntry, 'createdAt' | 'lastActivityAt' | 'archived' | 'keepOffline' | 'solo'>>

const put = (library: Library, record: LibraryRecord): Library => ({ ...library, [record.boardId]: record })
const previousStamp = (library: Library, boardId: string): Stamp | undefined => (Object.hasOwn(library, boardId) ? library[boardId]!.stamp : undefined)

/**
 * Adds a board, or updates the one with the same id: what the person already decided there (archived, keep offline,
 * its original creation time) stays, and the activity time only moves forward. A created board is kept offline.
 */
export function saveEntry(library: Library, input: NewEntry, now: number, device: string): Library {
  const old = getEntry(library, input.boardId)
  const stamp = nextStamp(previousStamp(library, input.boardId), now, device)
  return put(library, {
    ...input,
    solo: input.solo ?? old?.solo ?? false,
    createdAt: old?.createdAt ?? input.createdAt ?? now,
    lastActivityAt: Math.max(old?.lastActivityAt ?? 0, input.lastActivityAt ?? now),
    archived: old?.archived ?? input.archived ?? false,
    keepOffline: old?.keepOffline ?? input.keepOffline ?? input.origin === 'created',
    stamp,
  })
}

/** Records activity on a board that is in the library (opened, edited). Unknown boards are left alone. */
export function touchEntry(library: Library, boardId: string, at: number, now: number, device: string): Library {
  const entry = getEntry(library, boardId)
  if (!entry) return library
  return put(library, { ...entry, lastActivityAt: Math.max(entry.lastActivityAt, at), stamp: nextStamp(entry.stamp, now, device) })
}

export function archiveEntry(library: Library, boardId: string, archived: boolean, now: number, device: string): Library {
  const entry = getEntry(library, boardId)
  return entry ? put(library, { ...entry, archived, stamp: nextStamp(entry.stamp, now, device) }) : library
}

/** Replaces the entry by a tombstone. Nothing is removed from the vault here: that is the engine's job, after confirmation. */
export function forgetEntry(library: Library, boardId: string, now: number, device: string): Library {
  if (!Object.hasOwn(library, boardId)) return library
  const old = library[boardId]!
  if (isTombstone(old)) return library
  return put(library, { boardId, forgotten: true, lastActivityAt: old.lastActivityAt, stamp: nextStamp(old.stamp, now, device) })
}

const isStamp = (v: unknown): v is Stamp => typeof v === 'object' && v !== null && Number.isFinite((v as Stamp).at) && typeof (v as Stamp).device === 'string'
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

/** Reads a record from storage or from a synced segment: untrusted shape, so every field is checked. */
export function parseLibraryRecord(value: unknown): LibraryRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (typeof v.boardId !== 'string' || !v.boardId || !isStamp(v.stamp) || !num(v.lastActivityAt)) return null
  if (v.forgotten === true) return { boardId: v.boardId, forgotten: true, lastActivityAt: v.lastActivityAt as number, stamp: { at: v.stamp.at, device: v.stamp.device } }
  if (typeof v.title !== 'string' || typeof v.fragment !== 'string' || !num(v.createdAt)) return null
  if (v.role !== 'facilitator' && v.role !== 'participant') return null
  if (v.origin !== 'created' && v.origin !== 'joined') return null
  for (const flag of ['hasPasscode', 'solo', 'archived', 'keepOffline']) if (typeof v[flag] !== 'boolean') return null
  if (v.teamId !== undefined && typeof v.teamId !== 'string') return null
  return {
    boardId: v.boardId, title: v.title, ...(v.teamId === undefined ? {} : { teamId: v.teamId }), role: v.role, origin: v.origin, fragment: v.fragment,
    hasPasscode: v.hasPasscode as boolean, solo: v.solo as boolean, createdAt: v.createdAt as number, lastActivityAt: v.lastActivityAt as number,
    archived: v.archived as boolean, keepOffline: v.keepOffline as boolean, stamp: { at: v.stamp.at, device: v.stamp.device },
  }
}
