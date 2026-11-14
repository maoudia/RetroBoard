/**
 * Use cases of the board library (change user-drive-storage). The library lives behind a port: the browser's
 * IndexedDB today, and from group 2 the same records mirrored to a vault on the user's target.
 */
import type { ClockPort } from '../ports/device'
import type { ReplicaStorePort } from '../ports/replica'
import { type Library, type LibraryEntry, type NewEntry, archiveEntry, forgetEntry, getEntry, saveEntry, touchEntry } from './library'

export interface LibraryStorePort {
  load(): Promise<Library>
  /** Applies `fn` to the stored library and stores the result; concurrent writers (other tabs) are merged by the adapter. */
  update(fn: (library: Library) => Library): Promise<Library>
}

export interface LibraryDeps {
  readonly store: LibraryStorePort
  readonly clock: ClockPort
  /** This device's id, for stamps. */
  readonly device: string
}

/** Adds a board, or refreshes the one already listed (its title, team, activity); archived and keep-offline choices stay. */
export async function saveBoardToLibrary(deps: LibraryDeps, input: NewEntry): Promise<LibraryEntry> {
  const library = await deps.store.update((l) => saveEntry(l, input, deps.clock.now(), deps.device))
  return getEntry(library, input.boardId)!
}

/** Records that a listed board was opened or changed. A board that is not listed stays unlisted. */
export async function recordBoardActivity(deps: LibraryDeps, boardId: string, at: number = deps.clock.now()): Promise<void> {
  await deps.store.update((l) => touchEntry(l, boardId, at, deps.clock.now(), deps.device))
}

/** Archiving hides a board from the main list and keeps all its data. */
export async function archiveBoard(deps: LibraryDeps, boardId: string, archived = true): Promise<void> {
  await deps.store.update((l) => archiveEntry(l, boardId, archived, deps.clock.now(), deps.device))
}

/**
 * Removes the entry (a tombstone that wins over older copies of it). With `deleteLocalCopy`, and after the person
 * confirmed, the board's events are dropped from this browser too. Other participants and the relay are not involved.
 */
export async function forgetBoard(deps: LibraryDeps, boardId: string, opts: { replica?: ReplicaStorePort; deleteLocalCopy?: boolean } = {}): Promise<void> {
  await deps.store.update((l) => forgetEntry(l, boardId, deps.clock.now(), deps.device))
  if (opts.deleteLocalCopy) await opts.replica?.delete(boardId)
}

export type OpenLibraryBoard =
  | { readonly ok: true; readonly entry: LibraryEntry; /** The link fragment to navigate to. */ readonly hash: string; readonly needsPasscode: boolean; readonly hasLocalCopy: boolean }
  | { readonly ok: false; readonly error: 'not-in-library' }

/**
 * Where to go to reopen a listed board: its link, whether the passcode must be asked (it is never stored) and whether the
 * browser still holds its events. The board's events are read from the replica by the live path that follows; fetching them
 * from a connected target when the replica is empty comes with the vault engine.
 */
export async function openLibraryBoard(deps: LibraryDeps & { replica?: ReplicaStorePort }, boardId: string): Promise<OpenLibraryBoard> {
  const entry = getEntry(await deps.store.load(), boardId)
  if (!entry) return { ok: false, error: 'not-in-library' }
  const hasLocalCopy = deps.replica ? (await deps.replica.load(boardId)).length > 0 : false
  await recordBoardActivity(deps, boardId)
  return { ok: true, entry, hash: entry.fragment, needsPasscode: entry.hasPasscode, hasLocalCopy }
}
