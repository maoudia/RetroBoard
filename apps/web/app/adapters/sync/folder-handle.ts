/**
 * The folder the person picked (change user-drive-storage, design "Local folder adapter"): feature detection, the picker,
 * the permission states and the `RetroBoard` subfolder the vault lives in. The handle is stored in IndexedDB
 * (`sync-state.ts`), never synced. A permission is asked for only from a click (`requestFolderAccess`): the app never
 * tries it by itself, so edits queue locally and nothing is lost while it waits.
 */
import type { DirectoryHandleLike, PermissionStateLike } from '@retroboard/application'

/** The folder the vault lives in, inside the one the person picked, so picking a whole cloud folder leaves one clean directory. */
export const VAULT_FOLDER = 'RetroBoard'

/** `granted` needs nothing; `prompt` is a click away; `denied` and `missing` ask for the folder again. */
export type FolderAccess = 'granted' | 'prompt' | 'denied' | 'missing'

/** By feature, never by user agent: Chrome on Android, Safari, Firefox and every browser on iOS do not expose the picker. */
export const folderPickerSupported = (scope: object = globalThis): boolean => 'showDirectoryPicker' in scope

type Picker = (options: { mode: 'readwrite'; id: string }) => Promise<DirectoryHandleLike>

/** Opens the browser's folder picker. `null` when the person closes it without choosing. */
export async function pickFolder(scope: object = globalThis): Promise<DirectoryHandleLike | null> {
  const pick = (scope as { showDirectoryPicker?: Picker }).showDirectoryPicker
  if (!pick) return null
  try {
    return await pick.call(scope, { mode: 'readwrite', id: 'retroboard-sync' })
  } catch (e) {
    if ((e as { name?: string } | null)?.name === 'AbortError') return null
    throw e
  }
}

const errName = (e: unknown): string => (e as { name?: string } | null)?.name ?? ''

async function exists(handle: DirectoryHandleLike): Promise<boolean> {
  try {
    for await (const _ of handle.entries()) break
    return true
  } catch (e) {
    if (errName(e) === 'NotFoundError') return false
    throw e
  }
}

const state = (p: PermissionStateLike): FolderAccess => p

/** What the browser says about the permission now, without asking. A folder that moved or was deleted is `missing`. */
export async function folderAccess(handle: DirectoryHandleLike): Promise<FolderAccess> {
  try {
    const permission = handle.queryPermission ? await handle.queryPermission({ mode: 'readwrite' }) : 'granted'
    if (permission !== 'granted') return state(permission)
    return (await exists(handle)) ? 'granted' : 'missing'
  } catch (e) {
    return errName(e) === 'NotFoundError' ? 'missing' : 'denied'
  }
}

/** Asks for the permission. Only a click handler may call it: browsers refuse it otherwise. */
export async function requestFolderAccess(handle: DirectoryHandleLike): Promise<FolderAccess> {
  try {
    const permission = handle.requestPermission ? await handle.requestPermission({ mode: 'readwrite' }) : 'granted'
    if (permission !== 'granted') return state(permission)
    return (await exists(handle)) ? 'granted' : 'missing'
  } catch (e) {
    return errName(e) === 'NotFoundError' ? 'missing' : 'denied'
  }
}

/** The `RetroBoard` subfolder, made when `create` is set. */
export const openVaultFolder = (root: DirectoryHandleLike, create: boolean): Promise<DirectoryHandleLike> =>
  root.getDirectoryHandle(VAULT_FOLDER, { create })
