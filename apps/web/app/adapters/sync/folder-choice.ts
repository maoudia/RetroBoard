/**
 * What a folder picked for the vault holds, and moving the vault there (change sync-ux, group 2, "The vault can move"). The vault is
 * identified by its vault id inside `info.json`, never by the folder: the same vault continues from a new place, an empty folder is
 * offered a copy, and a folder with another vault is never merged into the one connected here.
 */
import type { DirectoryHandleLike, SyncTargetPort } from '@retroboard/application'
import { createFolderTarget } from '~/adapters/sync/folder-target'
import { openVaultFolder } from '~/adapters/sync/folder-handle'

/** `empty` has no vault; `vault` has one, `id` is its vault id or null when `info.json` cannot be read (half downloaded, or not ours). */
export type FolderContent = { readonly kind: 'empty' } | { readonly kind: 'vault'; readonly id: string | null }

/** Reads the `RetroBoard` folder inside `picked` without creating anything. */
export async function inspectFolder(picked: DirectoryHandleLike, vaultIdOf: (info: Uint8Array) => string | null): Promise<FolderContent> {
  let dir: DirectoryHandleLike
  try { dir = await openVaultFolder(picked, false) } catch { return { kind: 'empty' } }
  const info = await createFolderTarget(dir).get('info.json')
  return info ? { kind: 'vault', id: vaultIdOf(info.bytes) } : { kind: 'empty' }
}

/** What to do with a picked folder when a vault `current` is connected (null when none is). */
export type FolderMove = 'new' | 'same' | 'other' | 'empty'

export function classifyFolder(content: FolderContent, current: string | null): FolderMove {
  if (current === null) return 'new'
  if (content.kind === 'empty') return 'empty'
  return content.id === current ? 'same' : 'other'
}

/** Copies every sealed object of one target into another: the vault moves as it is, nothing is read or rewritten. */
export async function copyVault(from: SyncTargetPort, to: SyncTargetPort): Promise<number> {
  let copied = 0
  for await (const info of from.list('')) {
    const object = await from.get(info.path)
    if (!object) continue
    await to.put(info.path, object.bytes)
    copied++
  }
  return copied
}
