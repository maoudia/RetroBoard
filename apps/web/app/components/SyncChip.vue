<script setup lang="ts">
import { syncStatusIcon } from '~/utils/sync-status'

/**
 * The state of folder sync in the toolbar (change user-drive-storage, "Status"): an icon that differs per state and the
 * words, so colour is never the only cue. It appears once a folder is connected, and opens Preferences > Sync.
 */
const { t } = useT()
const vault = useVaultStore()
const ui = useUiStore()
const label = computed(() => t(`sync.status.${vault.status}` as never))
</script>

<template>
  <button v-if="vault.connected" class="sync-chip" type="button" :data-status="vault.status" :aria-label="t('sync.chip.label', { status: label })" :title="label" data-testid="sync-chip" @click="ui.open('profile')">
    <Icon :name="syncStatusIcon(vault.status)" class="ico" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.sync-chip { display: inline-flex; align-items: center; gap: var(--sp-1); min-block-size: 32px; max-inline-size: 14rem; padding: 0 var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-pill); background: var(--surface2); color: var(--text); font: inherit; font-size: var(--fs-xs); font-weight: 600; cursor: pointer; white-space: nowrap; }
.sync-chip span { overflow: hidden; text-overflow: ellipsis; }
.sync-chip:hover { background: var(--accent-soft); }
.sync-chip[data-status="synced"] { color: var(--success); }
.sync-chip[data-status="offline"], .sync-chip[data-status="needs-attention"], .sync-chip[data-status="target-full"], .sync-chip[data-status="allow-folder"], .sync-chip[data-status="folder-not-found"], .sync-chip[data-status="sign-in-again"] { color: var(--warn); }
.sync-chip[data-status="syncing"] .ico { animation: sync-spin 1.2s linear infinite; }
@keyframes sync-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sync-chip[data-status="syncing"] .ico { animation: none; } }
@media (max-width: 720px) { .sync-chip span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); } .sync-chip { min-inline-size: 44px; justify-content: center; position: relative; } }
</style>
