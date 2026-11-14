import { describe, expect, it } from 'vitest'
import {
  EMPTY_LIBRARY, type Library, type LibraryDeps, type LibraryStorePort, type ReplicaRecord, type ReplicaStorePort, archiveBoard, forgetBoard,
  getEntry, libraryEntries, openLibraryBoard, recordBoardActivity, saveBoardToLibrary,
} from '../src'

function setup(start: Library = EMPTY_LIBRARY) {
  let library = start
  let now = 1000
  const store: LibraryStorePort = { load: async () => library, update: async (fn) => (library = fn(library)) }
  const deps: LibraryDeps = { store, clock: { now: () => now }, device: 'dev' }
  return { deps, tick: (n: number) => { now += n }, get library() { return library } }
}
const input = { boardId: 'room-1', title: 'Sprint 12', role: 'facilitator', origin: 'created', fragment: '#k=1', hasPasscode: true } as const
const replicaWith = (records: ReplicaRecord[]) => {
  const deleted: string[] = []
  const replica: ReplicaStorePort = { load: async () => records, append: async () => {}, purge: async () => 0, delete: async (id) => { deleted.push(id) } }
  return { replica, deleted }
}

describe('library use cases', () => {
  it('saves a board and returns the stored entry', async () => {
    const s = setup()
    const entry = await saveBoardToLibrary(s.deps, input)
    expect(entry).toMatchObject({ boardId: 'room-1', title: 'Sprint 12', archived: false, keepOffline: true, createdAt: 1000 })
    expect(getEntry(s.library, 'room-1')).toEqual(entry)
  })
  it('records activity for a listed board only', async () => {
    const s = setup()
    await saveBoardToLibrary(s.deps, input)
    await recordBoardActivity(s.deps, 'room-1', 5000)
    await recordBoardActivity(s.deps, 'other', 5000)
    expect(getEntry(s.library, 'room-1')!.lastActivityAt).toBe(5000)
    expect(getEntry(s.library, 'other')).toBeUndefined()
    s.tick(10_000)
    await recordBoardActivity(s.deps, 'room-1')
    expect(getEntry(s.library, 'room-1')!.lastActivityAt).toBe(11_000)
  })
  it('archives and unarchives, keeping the entry', async () => {
    const s = setup()
    await saveBoardToLibrary(s.deps, input)
    await archiveBoard(s.deps, 'room-1')
    expect(libraryEntries(s.library)).toHaveLength(0)
    expect(libraryEntries(s.library, { archived: true })).toHaveLength(1)
    await archiveBoard(s.deps, 'room-1', false)
    expect(libraryEntries(s.library)).toHaveLength(1)
  })
  it('forgets an entry, and drops the local copy only when asked', async () => {
    const s = setup()
    const { replica, deleted } = replicaWith([])
    await saveBoardToLibrary(s.deps, input)
    await forgetBoard(s.deps, 'room-1', { replica })
    expect(getEntry(s.library, 'room-1')).toBeUndefined()
    expect(deleted).toEqual([])
    await saveBoardToLibrary(s.deps, { ...input, boardId: 'room-2' })
    await forgetBoard(s.deps, 'room-2', { replica, deleteLocalCopy: true })
    await forgetBoard(s.deps, 'room-3', { deleteLocalCopy: true })
    expect(deleted).toEqual(['room-2'])
    expect(s.library['room-1']).toMatchObject({ forgotten: true })
  })
  it('opens a listed board: its link, the passcode question and whether the browser holds its events', async () => {
    const s = setup()
    await saveBoardToLibrary(s.deps, input)
    s.tick(500)
    const withCopy = await openLibraryBoard({ ...s.deps, replica: replicaWith([{ id: 'e1', data: 'x' }]).replica }, 'room-1')
    expect(withCopy).toMatchObject({ ok: true, hash: '#k=1', needsPasscode: true, hasLocalCopy: true })
    expect(getEntry(s.library, 'room-1')!.lastActivityAt).toBe(1500)
    expect(await openLibraryBoard({ ...s.deps, replica: replicaWith([]).replica }, 'room-1')).toMatchObject({ hasLocalCopy: false })
    expect(await openLibraryBoard(s.deps, 'room-1')).toMatchObject({ hasLocalCopy: false })
    expect(await openLibraryBoard(s.deps, 'nope')).toEqual({ ok: false, error: 'not-in-library' })
  })
})
