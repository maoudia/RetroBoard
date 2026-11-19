/**
 * In-memory directory handle in the shape of the File System Access API (change user-drive-storage, "Local folder adapter").
 * It behaves the way Chromium does where the adapter depends on it: `createWritable()` writes a swap file that replaces the
 * file on `close()`, a missing entry is a `NotFoundError`, and a removed folder fails every operation. Tests also use it as
 * the sync client: they put files in, rename them, add conflict copies and take the folder away.
 */
import type { DirectoryHandleLike, FileHandleLike, FileLike, PermissionStateLike, WritableLike } from '@retroboard/application'

const fail = (name: string, message = name): never => { throw new DOMException(message, name) }

interface FileNode { kind: 'file'; bytes: Uint8Array; lastModified: number }
interface DirNode { kind: 'directory'; entries: Map<string, FileNode | DirNode> }

export interface FakeDirectory extends DirectoryHandleLike {
  /** What `queryPermission` and `requestPermission` answer (default 'granted'). */
  permission: PermissionStateLike
  /** What `requestPermission` turns the state into when it is 'prompt' (default 'granted'). */
  grantOnRequest: PermissionStateLike
  /** The folder is gone (moved, deleted, drive unplugged): every operation throws `NotFoundError`. */
  remove(): void
  /** Replaces the clock the files' `lastModified` come from. */
  clock: () => number
  /** The next write (`createWritable`, `write` or `close`) throws a DOMException of this name. */
  failNextWrite(name: 'QuotaExceededError' | 'NotAllowedError' | 'NoModificationAllowedError' | 'InvalidStateError'): void
  /** Writes, as a sync client would: no swap, the file appears whole. `path` may name sub folders (`s/abc/x.rbs`). */
  drop(path: string, bytes: Uint8Array, lastModified?: number): void
  /** Writes half a file: what a client that is still downloading leaves behind. */
  dropHalf(path: string, bytes: Uint8Array): void
  read(path: string): Uint8Array | null
  /** The `lastModified` of a file, or null. */
  modified(path: string): number | null
  rename(from: string, to: string): void
  /** Every file below, as relative paths, sorted. */
  files(): string[]
  /** How many `getFile()` and `createWritable()` calls were made (to prove a pass stays cheap). */
  readonly calls: { getFile: number; createWritable: number }
}

export function createFakeDirectory(name = 'RetroBoard'): FakeDirectory {
  const root: DirNode = { kind: 'directory', entries: new Map() }
  const state = {
    permission: 'granted' as PermissionStateLike, grantOnRequest: 'granted' as PermissionStateLike, removed: false,
    clock: () => Date.now(), write: null as string | null, calls: { getFile: 0, createWritable: 0 },
  }
  const alive = () => { if (state.removed) fail('NotFoundError', 'folder removed') }
  const access = () => { alive(); if (state.permission !== 'granted') fail('NotAllowedError', 'permission') }
  let lastStamp = 0
  /** Strictly increasing, so a rewrite always changes `lastModified`. */
  const now = () => (lastStamp = Math.max(state.clock(), lastStamp + 1))

  function fileOf(node: FileNode, nameOf: string): FileHandleLike {
    return {
      kind: 'file',
      name: nameOf,
      async getFile(): Promise<FileLike> {
        access()
        state.calls.getFile++
        const bytes = node.bytes.slice()
        return { size: bytes.length, lastModified: node.lastModified, arrayBuffer: async () => bytes.buffer as ArrayBuffer }
      },
      async createWritable(): Promise<WritableLike> {
        access()
        state.calls.createWritable++
        const pending = state.write
        state.write = null
        if (pending) fail(pending)
        let swap: Uint8Array = new Uint8Array(0)
        return {
          async write(data) { swap = new Uint8Array([...swap, ...data]) },
          async close() { access(); node.bytes = swap; node.lastModified = now() },
          async abort() { swap = new Uint8Array(0) },
        }
      },
    }
  }

  function dirOf(node: DirNode, nameOf: string): DirectoryHandleLike {
    return {
      kind: 'directory',
      name: nameOf,
      async getDirectoryHandle(child, options) {
        access()
        let found = node.entries.get(child)
        if (!found) {
          if (!options?.create) fail('NotFoundError')
          found = { kind: 'directory', entries: new Map() }
          node.entries.set(child, found)
        }
        if (found.kind !== 'directory') fail('TypeMismatchError')
        return dirOf(found as DirNode, child)
      },
      async getFileHandle(child, options) {
        access()
        let found = node.entries.get(child)
        if (!found) {
          if (!options?.create) fail('NotFoundError')
          found = { kind: 'file', bytes: new Uint8Array(0), lastModified: now() }
          node.entries.set(child, found)
        }
        if (found.kind !== 'file') fail('TypeMismatchError')
        return fileOf(found as FileNode, child)
      },
      async removeEntry(child, options) {
        access()
        const found = node.entries.get(child)
        if (!found) fail('NotFoundError')
        if (found!.kind === 'directory' && (found as DirNode).entries.size > 0 && !options?.recursive) fail('InvalidModificationError')
        node.entries.delete(child)
      },
      async *entries() {
        access()
        for (const [child, entry] of [...node.entries].sort(([a], [b]) => (a < b ? -1 : 1))) yield [child, entry.kind === 'file' ? fileOf(entry, child) : dirOf(entry, child)]
      },
    }
  }

  const walk = (path: string, create: boolean): { dir: DirNode; file: string } => {
    const parts = path.split('/')
    const file = parts.pop()!
    let dir = root
    for (const p of parts) {
      let next = dir.entries.get(p)
      if (!next && create) dir.entries.set(p, (next = { kind: 'directory', entries: new Map() }))
      if (next?.kind !== 'directory') fail('NotFoundError')
      dir = next as DirNode
    }
    return { dir, file }
  }

  const handle = dirOf(root, name)
  const fake: FakeDirectory = Object.defineProperties(handle, Object.getOwnPropertyDescriptors({
    get permission() { return state.permission },
    set permission(p: PermissionStateLike) { state.permission = p },
    get grantOnRequest() { return state.grantOnRequest },
    set grantOnRequest(p: PermissionStateLike) { state.grantOnRequest = p },
    get clock() { return state.clock },
    set clock(c: () => number) { state.clock = c },
    calls: state.calls,
    async queryPermission() { alive(); return state.permission },
    async requestPermission() { alive(); if (state.permission === 'prompt') state.permission = state.grantOnRequest; return state.permission },
    remove() { state.removed = true },
    failNextWrite(n: string) { state.write = n },
    drop(path: string, bytes: Uint8Array, lastModified = now()) {
      const { dir, file } = walk(path, true)
      dir.entries.set(file, { kind: 'file', bytes: bytes.slice(), lastModified })
    },
    dropHalf(path: string, bytes: Uint8Array) { fake.drop(path, bytes.slice(0, Math.max(0, Math.floor(bytes.length / 2)))) },
    read(path: string) {
      try {
        const { dir, file } = walk(path, false)
        const found = dir.entries.get(file)
        return found?.kind === 'file' ? found.bytes.slice() : null
      } catch { return null }
    },
    modified(path: string) {
      try {
        const { dir, file } = walk(path, false)
        const found = dir.entries.get(file)
        return found?.kind === 'file' ? found.lastModified : null
      } catch { return null }
    },
    rename(from: string, to: string) {
      const a = walk(from, false)
      const node = a.dir.entries.get(a.file)
      if (!node) fail('NotFoundError')
      a.dir.entries.delete(a.file)
      const b = walk(to, true)
      b.dir.entries.set(b.file, node!)
    },
    files() {
      const out: string[] = []
      const visit = (dir: DirNode, prefix: string) => {
        for (const [child, node] of dir.entries) {
          if (node.kind === 'file') out.push(`${prefix}${child}`)
          else visit(node, `${prefix}${child}/`)
        }
      }
      visit(root, '')
      return out.sort()
    },
  })) as unknown as FakeDirectory
  return fake
}
