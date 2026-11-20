import type { VaultStatus } from '@retroboard/application'

/**
 * The sync shield (change sync-ux, group 1): a shield that always carries the sync arrows or a mark of its own, so it is never taken for the
 * board's encryption badge (a plain shield, with a check, or struck out). One glyph per state family, drawn on the lucide grid and stroke
 * (24 x 24, 2 px, round), bundled in the page: no remote icon and no icon-set licence. `IconSyncShield.vue` draws them.
 */
export type SyncGlyph = 'off' | 'unsupported' | 'locked' | 'syncing' | 'synced' | 'offline' | 'waiting' | 'alert'

const STATUS_GLYPH: Readonly<Record<VaultStatus, SyncGlyph>> = {
  unsupported: 'unsupported',
  off: 'off',
  locked: 'locked',
  syncing: 'syncing',
  synced: 'synced',
  offline: 'offline',
  'allow-folder': 'alert',
  'folder-not-found': 'alert',
  'waiting-for-file': 'waiting',
  'needs-attention': 'alert',
  'target-full': 'alert',
  'sign-in-again': 'alert',
}

export const syncStatusIcon = (status: VaultStatus): SyncGlyph => STATUS_GLYPH[status]

/** The outline of the shield (lucide `shield`). */
export const SHIELD_PATH = 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'
/** The two sync arrows (lucide `refresh-cw` scaled to fit inside the shield). */
const ARROWS = ['M8.4 12.5a3.6 3.6 0 0 1 3.6-3.6 3.9 3.9 0 0 1 2.7 1.1l.9.9', 'M15.6 8.9v2h-2', 'M15.6 12.5a3.6 3.6 0 0 1-3.6 3.6 3.9 3.9 0 0 1-2.7-1.1l-.9-.9', 'M8.4 16.1v-2h2'] as const

/** What is drawn inside the shield for each glyph, as path data. */
export const SYNC_GLYPHS: Readonly<Record<SyncGlyph, readonly string[]>> = {
  off: [...ARROWS, 'M12 12.5h.01'],
  unsupported: ['M9 8.5l6 7', 'M15 8.5l-6 7'],
  locked: ['M9.5 12.2h5v3.8h-5z', 'M10.5 12.2v-1.2a1.5 1.5 0 0 1 3 0v1.2'],
  syncing: ARROWS,
  synced: [...ARROWS, 'M10.9 12.6l1.1 1.1 1.7-2'],
  offline: [...ARROWS, 'M8 8l8 8.5'],
  waiting: ['M9.5 12.5h.01', 'M12 12.5h.01', 'M14.5 12.5h.01'],
  alert: ['M12 9v3.4', 'M12 15.2h.01'],
}

/** What pressing the shield does (change sync-ux, "Pressing the shield syncs now"): one action, chosen from the state alone. */
export type ShieldAction = 'onboard' | 'unlock' | 'sync' | 'allow' | 'rechoose' | 'sign-in' | 'panel' | 'none'

export function shieldAction(status: VaultStatus, connected: boolean): ShieldAction {
  if (!connected) return 'onboard'
  switch (status) {
    case 'locked': return 'unlock'
    case 'syncing': return 'none'
    case 'synced': case 'offline': return 'sync'
    case 'allow-folder': return 'allow'
    case 'folder-not-found': return 'rechoose'
    case 'sign-in-again': return 'sign-in'
    default: return 'panel'
  }
}

/** Set while a folder is connected, so a browser that never used sync never loads the engine or opens its database. */
export const SYNC_FLAG = 'retroboard:sync'

/** The page a sign-in comes back to: a path only, never a board link (its key stays out of the tab's storage). */
export const signInReturnTo = (path: string): string => (['/board', '/new', '/storage/callback'].includes(path) ? '/boards' : path)
