/**
 * `SyncTargetPort` over a folder the person picked (change user-drive-storage, design "Local folder adapter"): the vault
 * is plain files, and whatever sync client the person already runs on the folder carries them to the cloud. It runs in the
 * page, with no network and no CSP change, and it stores bytes the vault layer has already sealed: no key, no plaintext.
 *
 * The folder is shared with software we do not control, so this adapter reads only names that belong to a vault, never
 * deletes what it does not recognise, and treats a conflict copy of a file the way the engine can use: an immutable
 * object's copy has the same bytes as the original and is ignored, `info.json` and manifest copies are shown to the engine
 * under a synthetic name (`info.copy-<hash>.json`) so it can merge and remove them.
 */
import {
  type DirectoryHandleLike, type FileHandleLike, type ObjectInfo, type ObjectPath, type PutOptions, type SyncTargetPort, type TargetCapabilities, TargetError,
  isObjectPath, isObjectPrefix,
} from '@retroboard/application'

const CAPABILITIES: TargetCapabilities = { conditionalPut: 'none', atomicPut: true, listsModifiedTime: true, maxObjectBytes: 64 * 1024 * 1024 }

/** Relative paths stay short so a deep user folder rarely reaches the 260 characters of old Windows paths. */
export const MAX_FOLDER_PATH = 64

/** The names of a vault: lowercase ASCII with one of its four extensions. Everything else in the folder is not ours. */
const VAULT_NAME = /^[a-z0-9][a-z0-9._-]*\.(?:json|rbm|rbs|rbc)$/
/** Sync clients rename a conflicting file to something that still looks like ours in lowercase: never read those. */
const CONFLICT = /conflict/
const RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/

/** Conflict copies a sync client makes of `info.json`: `info (1).json`, `info (conflicted copy ...).json`, `info-DESKTOP-1.json`, `info.sync-conflict-....json`. */
const INFO_COPY = /^info(?:[ .(_-].*)\.json$/i
const MANIFEST_COPY = /^([a-z0-9]{4,13})(?:[ .(_-].*)\.rbm$/i

/** FNV-1a, 32 bits, as 8 hex characters: a stable short name for a file name that is not safe to expose. */
export function nameHash(name: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Names the folder-level checks of `put` and `list` share. */
export const isVaultName = (name: string): boolean => VAULT_NAME.test(name) && !CONFLICT.test(name) && !RESERVED.test(name)

const errName = (e: unknown): string => (e as { name?: string } | null)?.name ?? ''

/** What a file system throws, as the one error the engine understands. The message never carries a name or a path. */
export function mapFolderError(e: unknown): TargetError {
  if (e instanceof TargetError) return e
  switch (errName(e)) {
    case 'NotAllowedError': case 'SecurityError': return new TargetError('permission-needed', { cause: e })
    case 'NotFoundError': return new TargetError('not-found', { cause: e })
    case 'QuotaExceededError': return new TargetError('target-full', { cause: e })
    case 'TypeMismatchError': return new TargetError('unsupported', { cause: e })
    // A file another program holds open, a drive that went away: try again on the next pass.
    default: return new TargetError('unreachable', { cause: e })
  }
}

const isMissing = (e: unknown): boolean => errName(e) === 'NotFoundError' || errName(e) === 'TypeMismatchError'
const etagOf = (size: number, lastModified: number): string => `${size}:${lastModified}`

function validate(path: string, prefix = false): void {
  if (!(prefix ? isObjectPrefix(path) : isObjectPath(path)) || path.length > MAX_FOLDER_PATH) throw new TargetError('unsupported')
  if (prefix) return
  const name = path.slice(path.lastIndexOf('/') + 1)
  if (!isVaultName(name) && !isCopyName(name)) throw new TargetError('unsupported')
}

const isCopyName = (name: string): boolean => /^(?:info|[a-z0-9]{4,13})\.copy-[0-9a-f]{8}\.(?:json|rbm)$/.test(name)

interface Located { dir: DirectoryHandleLike; name: string }

export function createFolderTarget(root: DirectoryHandleLike): SyncTargetPort {
  const guard = async <T>(op: () => Promise<T>): Promise<T> => {
    try { return await op() } catch (e) { throw mapFolderError(e) }
  }

  /** The directory that holds the path, or null when a folder on the way is missing (the object is absent). */
  async function locate(path: string, create: boolean): Promise<Located | null> {
    const parts = path.split('/')
    const name = parts.pop()!
    let dir = root
    for (const part of parts) {
      try { dir = await dir.getDirectoryHandle(part, { create }) } catch (e) { if (!create && isMissing(e)) return null; throw e }
    }
    return { dir, name }
  }

  /** `info.copy-<hash>.json` and `m/<device>.copy-<hash>.rbm` are named by the adapter: the file they stand for. */
  async function realName(dir: DirectoryHandleLike, name: string): Promise<string | null> {
    const m = /^(info|[a-z0-9]{4,13})\.copy-([0-9a-f]{8})\.(json|rbm)$/.exec(name)
    if (!m) return name
    for await (const [entry, h] of dir.entries()) {
      if (h.kind !== 'file' || nameHash(entry) !== m[2]) continue
      if (m[3] === 'json' ? INFO_COPY.test(entry) : MANIFEST_COPY.exec(entry)?.[1]?.toLowerCase() === m[1]) return entry
    }
    return null
  }

  async function fileAt(path: string): Promise<{ handle: FileHandleLike; dir: DirectoryHandleLike; name: string } | null> {
    const at = await locate(path, false)
    if (!at) return null
    const name = await realName(at.dir, at.name)
    if (name === null) return null
    try { return { handle: await at.dir.getFileHandle(name), dir: at.dir, name } } catch (e) {
      if (isMissing(e)) return null
      throw e
    }
  }

  /** An evicted iCloud file is `.<name>.icloud`: reading it starts the download, and the file shows up on a later pass. */
  async function nudgeEvicted(path: string): Promise<void> {
    const at = await locate(path, false)
    if (!at) return
    try { await (await (await at.dir.getFileHandle(`.${at.name}.icloud`)).getFile()).arrayBuffer() } catch { /* not evicted, or not readable yet: the next pass looks again */ }
  }

  async function listDir(dir: DirectoryHandleLike, base: string, prefix: string, out: ObjectInfo[]): Promise<void> {
    for await (const [name, h] of dir.entries()) {
      if (h.kind === 'directory') {
        if (/^[a-z0-9][a-z0-9._-]*$/.test(name) && base.split('/').length <= 2 && (`${base}${name}/`.startsWith(prefix) || prefix.startsWith(`${base}${name}/`))) await listDir(h as DirectoryHandleLike, `${base}${name}/`, prefix, out)
        continue
      }
      let path = `${base}${name}`
      if (INFO_COPY.test(name) && base === '') path = `info.copy-${nameHash(name)}.json`
      else if (MANIFEST_COPY.test(name) && base === 'm/') path = `m/${MANIFEST_COPY.exec(name)![1]!.toLowerCase()}.copy-${nameHash(name)}.rbm`
      else if (!isVaultName(name) || !isObjectPath(path) || path.length > MAX_FOLDER_PATH) continue
      if (!path.startsWith(prefix)) continue
      const file = await (h as FileHandleLike).getFile()
      out.push({ path, size: file.size, etag: etagOf(file.size, file.lastModified), modifiedAt: file.lastModified })
    }
  }

  return {
    kind: 'folder',
    capabilities: CAPABILITIES,
    async *list(prefix: ObjectPath) {
      validate(prefix, true)
      const found: ObjectInfo[] = []
      // Start at the deepest folder the prefix names, so `s/<stream>/` reads one folder and `m/` another.
      const parts = prefix.split('/')
      parts.pop()
      let dir = root
      let base = ''
      await guard(async () => {
        for (const part of parts) {
          try { dir = await dir.getDirectoryHandle(part) } catch (e) { if (isMissing(e)) return; throw e }
          base += `${part}/`
        }
        await listDir(dir, base, prefix, found)
      })
      for (const o of found.sort((a, b) => (a.path < b.path ? -1 : 1))) yield o
    },
    get: (path) => guard(async () => {
      validate(path)
      const at = await fileAt(path)
      if (!at) { await nudgeEvicted(path); return null }
      const file = await at.handle.getFile()
      return { bytes: new Uint8Array(await file.arrayBuffer()), etag: etagOf(file.size, file.lastModified) }
    }),
    put: (path, bytes, opts: PutOptions = {}) => guard(async () => {
      validate(path)
      if (isCopyName(path.slice(path.lastIndexOf('/') + 1))) throw new TargetError('unsupported')
      if (bytes.length > CAPABILITIES.maxObjectBytes) throw new TargetError('too-large')
      const current = await fileAt(path)
      if (opts.ifMatch !== undefined) {
        // Best effort, and the engine never relies on it: a folder cannot make the check and the write one step.
        const etag = current ? etagOf(...(await current.handle.getFile().then((f) => [f.size, f.lastModified] as const))) : null
        if (opts.ifMatch === 'absent' ? etag !== null : etag !== opts.ifMatch) throw new TargetError('precondition-failed')
      }
      const at = (await locate(path, true))!
      const handle = await at.dir.getFileHandle(at.name, { create: true })
      // The browser writes a swap file and replaces the target on close(): a reader never sees half of this write.
      const writable = await handle.createWritable()
      try { await writable.write(bytes); await writable.close() } catch (e) { await writable.abort?.().catch(() => undefined); throw e }
      const file = await handle.getFile()
      if (file.size !== bytes.length) throw new TargetError('unreachable')
      return { etag: etagOf(file.size, file.lastModified) }
    }),
    delete: (path) => guard(async () => {
      validate(path)
      const at = await fileAt(path)
      if (!at) return
      try { await at.dir.removeEntry(at.name) } catch (e) { if (!isMissing(e)) throw e }
    }),
    stat: (path) => guard(async () => {
      validate(path)
      const at = await fileAt(path)
      if (!at) return null
      const file = await at.handle.getFile()
      return { path, size: file.size, etag: etagOf(file.size, file.lastModified), modifiedAt: file.lastModified }
    }),
  }
}
