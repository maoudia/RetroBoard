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

/**
 * What the picker gave back (change sync-ux, "Any folder"). Chromium refuses the roots of well-known system folders (Documents, Desktop,
 * Downloads, a drive root) and reports it as an abort or a security error, the same abort as a person closing the picker: both come back
 * as `refused`, and the screen explains and proposes a subfolder.
 */
export type FolderPick = { readonly kind: 'picked'; readonly handle: DirectoryHandleLike } | { readonly kind: 'refused' } | { readonly kind: 'unavailable' }

/** The name suggested when a folder is refused: a subfolder the person makes first, inside the one they wanted. */
export const SUGGESTED_SUBFOLDER = 'RetroBoard Sync'

/** Opens the browser's folder picker. */
export async function pickFolder(scope: object = globalThis): Promise<FolderPick> {
  const pick = (scope as { showDirectoryPicker?: Picker }).showDirectoryPicker
  if (!pick) return { kind: 'unavailable' }
  try {
    return { kind: 'picked', handle: await pick.call(scope, { mode: 'readwrite', id: 'retroboard-sync' }) }
  } catch (e) {
    if (['AbortError', 'SecurityError', 'NotAllowedError'].includes((e as { name?: string } | null)?.name ?? '')) return { kind: 'refused' }
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
