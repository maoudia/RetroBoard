<script setup lang="ts">
import { detectFeatures, syncPaths } from '~/adapters/sync/sync-paths'
import { signInReturnTo } from '~/utils/sync-status'

/**
 * "Keep my boards on all my devices" (change sync-ux, group 3): three plain sentences before any choice, then only the ways this
 * device can really do, best first. Opened from the sync shield, the first-board nudge and Profile. Once a way is chosen the same dialog
 * carries on with the setup (the vault password, the recovery key) and, for a connected vault, shows its status and settings.
 */
const { t } = useT()
const ui = useUiStore()
const vault = useVaultStore()
const route = useRoute()

const open = computed({ get: () => ui.dialog === 'sync', set: (v) => { if (!v && ui.dialog === 'sync') ui.close() } })
// OneDrive is offered only where the deployment configured it: read once the sheet is on screen.
watch(open, (v) => { if (v) void vault.loadProviders() })
const paths = computed(() => (import.meta.client ? syncPaths(detectFeatures(window, vault.onedrive !== null)) : []))
const onboarding = computed(() => !vault.connected && vault.step === 'idle' && !vault.choice)
const errorText = computed(() => (vault.error ? t(vault.error) : ''))
const why = ref(false)
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('sync.sheet.title')" width="560px">
    <div v-if="onboarding" class="sheet" data-testid="sync-sheet">
      <p class="lead">{{ t('sync.sheet.s1') }} {{ t('sync.sheet.s2') }} {{ t('sync.sheet.s3') }}</p>

      <ul v-if="paths.length" class="paths" :aria-label="t('sync.sheet.paths')">
        <li v-for="p in paths" :key="p">
          <button v-if="p === 'folder'" class="path" type="button" :disabled="vault.busy" data-testid="sync-path-folder" @click="vault.chooseFolder()">
            <Icon name="lucide:folder-open" /><span><strong>{{ t('sync.path.folder.title') }}</strong><small>{{ t('sync.path.folder.why') }}</small></span>
          </button>
          <button v-else-if="p === 'onedrive'" class="path" type="button" :disabled="vault.busy" data-testid="sync-path-onedrive" @click="vault.connectOnedrive(signInReturnTo(route.path))">
            <Icon name="lucide:log-in" /><span><strong>{{ t('sync.path.onedrive.title') }}</strong><small>{{ t('sync.path.onedrive.why') }}</small></span>
          </button>
        </li>
      </ul>
      <p v-else class="muted" data-testid="sync-sheet-none"><Icon name="lucide:monitor-x" /> {{ t('sync.sheet.none') }}</p>

      <p v-if="errorText" class="warn" role="alert" data-testid="sync-error">{{ errorText }}</p>
      <p v-if="paths.length" class="muted small">{{ t('sync.sheet.carry') }}</p>

      <button class="why" type="button" :aria-expanded="why" data-testid="sync-why" @click="why = !why"><Icon :name="why ? 'lucide:chevron-up' : 'lucide:chevron-down'" /> {{ t('sync.sheet.why') }}</button>
      <p v-if="why" class="muted" data-testid="sync-why-text">{{ t('sync.sheet.why.text') }}</p>
    </div>
    <LazySyncSettings v-else />
  </BaseDialog>
</template>

<style scoped>
.sheet { display: grid; gap: var(--sp-3); }
.lead { margin: 0; font-size: var(--fs-md); line-height: 1.5; }
.paths { display: grid; gap: var(--sp-2); margin: 0; padding: 0; list-style: none; }
.path { display: flex; align-items: center; gap: var(--sp-3); inline-size: 100%; min-block-size: 44px; padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface2); color: var(--text); font: inherit; text-align: start; cursor: pointer; }
.path:hover:not(:disabled) { background: var(--accent-soft); border-color: var(--accent); }
.path:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.path :deep(svg) { flex: none; font-size: var(--fs-2xl); color: var(--accent); }
.path span { display: grid; gap: 2px; }
.path small { color: var(--muted); font-size: var(--fs-sm); }
.warn { margin: 0; color: var(--danger); font-size: var(--fs-sm); }
.small { font-size: var(--fs-sm); margin: 0; }
.why { justify-self: start; display: inline-flex; align-items: center; gap: var(--sp-1); padding: var(--sp-1) 0; border: 0; background: none; color: var(--accent); font: inherit; font-size: var(--fs-sm); font-weight: 600; cursor: pointer; }
</style>
