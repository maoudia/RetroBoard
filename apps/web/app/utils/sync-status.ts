import type { VaultStatus } from '@retroboard/application'

/** One icon per state, so the shape tells the state before the words do. The names are listed in `nuxt.config.ts` (picked at runtime). */
const ICONS: Readonly<Record<VaultStatus, string>> = {
  unsupported: 'lucide:monitor-x',
  off: 'lucide:unplug',
  locked: 'lucide:lock',
  syncing: 'lucide:refresh-cw',
  synced: 'lucide:circle-check',
  offline: 'lucide:wifi-off',
  'allow-folder': 'lucide:folder',
  'folder-not-found': 'lucide:folder',
  'waiting-for-file': 'lucide:loader',
  'needs-attention': 'lucide:triangle-alert',
  'target-full': 'lucide:triangle-alert',
}

export const syncStatusIcon = (status: VaultStatus): string => ICONS[status]

/** Set while a folder is connected, so a browser that never used sync never loads the engine or opens its database. */
export const SYNC_FLAG = 'retroboard:sync'
