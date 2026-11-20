/**
 * The ways this device can keep boards on other devices (change sync-ux, group 3, design "The sheet and the nudge"). Chosen by feature
 * detection, never by user agent, and ordered by a rule, not a list: a computer with a folder picker leads with the folder, any other
 * device leads with "another device of mine", then "a file I save myself", then a Microsoft account when the deployment enables it.
 * A path of a later group is offered once its group ships (`SHIPPED`), so the sheet never promises what it cannot do.
 */
export type SyncPathId = 'folder' | 'device' | 'file' | 'onedrive'

/** What the browser can do, read by feature. */
export interface SyncFeatures {
  /** `showDirectoryPicker` exists (desktop Chromium). */
  readonly folderPicker: boolean
  /** A Microsoft sign-in is configured for this deployment. */
  readonly onedrive: boolean
  /** Installed to the home screen: its storage is separate from the browser's (sheet note, group 6). */
  readonly standalone: boolean
}

/** The paths the code can do today; groups 4 and 5 of `sync-ux` add `file` and `device`. */
export const SHIPPED: ReadonlySet<SyncPathId> = new Set<SyncPathId>(['folder', 'onedrive'])

/** Features of a scope (the window), by what exists on it. */
export function detectFeatures(scope: object, onedrive: boolean): SyncFeatures {
  const w = scope as { showDirectoryPicker?: unknown; matchMedia?: (q: string) => { matches: boolean }; navigator?: { standalone?: boolean } }
  return {
    folderPicker: 'showDirectoryPicker' in scope,
    onedrive,
    standalone: w.navigator?.standalone === true || (typeof w.matchMedia === 'function' && w.matchMedia('(display-mode: standalone)').matches),
  }
}

/** The paths to offer, best first. */
export function syncPaths(features: SyncFeatures, shipped: ReadonlySet<SyncPathId> = SHIPPED): SyncPathId[] {
  const order: SyncPathId[] = features.folderPicker ? ['folder', 'device', 'file', 'onedrive'] : ['device', 'file', 'onedrive']
  return order.filter((p) => shipped.has(p) && (p !== 'onedrive' || features.onedrive))
}
