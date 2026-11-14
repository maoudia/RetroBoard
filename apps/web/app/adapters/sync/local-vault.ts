/**
 * The browser's own vault (change user-drive-storage, "Local storage and migration"): small JSON documents sealed in the
 * vault object format with a key derived from the device key, kept in the IndexedDB target. Nothing readable is stored,
 * and the library persists here before any target is connected. The same documents are what group 2 mirrors to a target.
 */
import {
  EMPTY_LIBRARY, type Library, type LibraryRecord, type LibraryStorePort, type SyncTargetPort, TargetError, parseLibraryRecord,
} from '@retroboard/application'
import { type Bytes, type VaultKeys, deriveVaultKeys, fromUtf8, openObject, sealObject, utf8 } from '@retroboard/crypto'

const LOCAL_VAULT_ID = 'local'
/** "local" and a version: the key id the object headers of this vault carry. */
const LOCAL_KEY_ID = '6c6f63616c000001'
/** Each round lost means another writer won it, so n writers need at most n - 1 retries. */
const RETRIES = 12

export interface LocalVault {
  /** The document, `value: null` when the object is there but cannot be opened (key lost), `null` when there is none. */
  read(name: string): Promise<{ value: unknown; etag: string } | null>
  /** Reads, applies `fn` and writes with a precondition; another tab's write in between makes it read again and retry. */
  update(name: string, fn: (current: unknown) => unknown): Promise<void>
}

export function createLocalVault(target: SyncTargetPort, localKey: () => Promise<Bytes>): LocalVault {
  let keys: Promise<VaultKeys> | null = null
  const vaultKeys = () => (keys ??= localKey().then((k) => deriveVaultKeys(k, LOCAL_VAULT_ID)))
  async function place(name: string) {
    const ks = await vaultKeys()
    const id = await ks.streamId(name)
    return { path: `s/${id}/local.rbs`, binding: { pathClass: 'seg', stream: id } as const, key: name === 'library' ? await ks.library() : await ks.stream(id) }
  }
  async function read(name: string) {
    const { path, binding, key } = await place(name)
    const got = await target.get(path)
    if (!got) return null
    const opened = await openObject(key, binding, got.bytes)
    if (!opened) return { value: null, etag: got.etag }
    try { return { value: JSON.parse(fromUtf8(opened)) as unknown, etag: got.etag } } catch { return { value: null, etag: got.etag } }
  }
  return {
    read,
    async update(name, fn) {
      const { path, binding, key } = await place(name)
      for (let attempt = 0; ; attempt++) {
        const current = await read(name)
        const sealed = await sealObject(key, LOCAL_KEY_ID, binding, utf8(JSON.stringify(fn(current?.value ?? null))))
        try {
          await target.put(path, sealed, { ifMatch: current ? current.etag : 'absent' })
          return
        } catch (e) {
          if (!(e instanceof TargetError && e.code === 'precondition-failed') || attempt >= RETRIES) throw e
        }
      }
    },
  }
}

/** Reads a stored library: untrusted shape, records that do not parse or sit under the wrong id are dropped. */
export function toLibrary(value: unknown): Library {
  const records = (value as { v?: unknown; records?: unknown } | null)?.records
  if (typeof records !== 'object' || records === null) return EMPTY_LIBRARY
  const out = new Map<string, LibraryRecord>()
  for (const [id, raw] of Object.entries(records)) {
    const record = parseLibraryRecord(raw)
    if (record && record.boardId === id) out.set(id, record)
  }
  return Object.fromEntries(out)
}

/** The library port over the local vault. */
export function createLibraryStore(vault: LocalVault): LibraryStorePort {
  return {
    async load() { return toLibrary((await vault.read('library'))?.value) },
    async update(fn) {
      let result: Library = EMPTY_LIBRARY
      await vault.update('library', (current) => {
        result = fn(toLibrary(current))
        return { v: 1, records: result }
      })
      return result
    },
  }
}
