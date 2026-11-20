<script setup lang="ts">
import { clockLabel } from '~/utils/relative-time'
import { shieldAction, signInReturnTo } from '~/utils/sync-status'

/**
 * The sync shield at the start of the toolbar (change sync-ux, group 1), shown to everyone so the feature is found: one shield
 * per state, the state in words as its name, and one press that does the single useful thing: sync now, unlock, recover, or
 * start (the sheet). The menu on right click or long press is an extra path to the settings, never the only one.
 */
const { t, locale } = useT()
const vault = useVaultStore()
const ui = useUiStore()
const route = useRoute()
const { push } = useToasts()

const statusText = computed(() => (vault.status === 'synced' && vault.lastSyncAt ? t('sync.synced.at', { time: clockLabel(vault.lastSyncAt, locale.value) }) : t(`sync.status.${vault.status}` as never)))
const label = computed(() => (vault.connected ? t('sync.shield.label', { status: statusText.value }) : t('sync.shield.off')))
const action = computed(() => shieldAction(vault.status, vault.connected))
const busy = ref(false)

async function press() {
  if (held) { held = false; return }
  switch (action.value) {
    case 'onboard': case 'unlock': case 'panel': ui.open('sync'); break
    case 'allow': await vault.requestAccess(); break
    case 'rechoose': await vault.chooseFolder(); break
    case 'sign-in': await vault.signInAgain(signInReturnTo(route.path)); break
    case 'sync': await syncNow(); break
  }
}

async function syncNow() {
  if (busy.value) return
  busy.value = true
  try {
    await vault.syncNow()
    if (vault.status === 'synced') push(t('sync.synced.at', { time: clockLabel(vault.lastSyncAt ?? Date.now(), locale.value) }), 'ok', 5000, { label: t('sync.pressed.settings'), run: () => ui.open('sync'), testid: 'sync-toast-settings' })
  } finally { busy.value = false }
}

/** A long press opens the menu on touch, where there is no right click; the click that ends it is not a press. */
let holdTimer: ReturnType<typeof setTimeout> | undefined
let held = false
const holdStart = (e: PointerEvent, open: () => void) => {
  if (e.pointerType === 'mouse') return
  held = false
  holdTimer = setTimeout(() => { held = true; open() }, 550)
}
const holdEnd = () => clearTimeout(holdTimer)
onBeforeUnmount(holdEnd)
</script>

<template>
  <Dropdown align="start" width="260px">
    <template #trigger="{ toggle }">
      <button
        class="mini-btn sync-shield" type="button" :data-status="vault.status" :data-connected="vault.connected" :data-action="action" :aria-label="label" :title="label" data-testid="sync-shield"
        @click="press" @contextmenu.prevent="toggle" @pointerdown="holdStart($event, toggle)" @pointerup="holdEnd" @pointercancel="holdEnd" @pointerleave="holdEnd"
      >
        <IconSyncShield :status="vault.status" />
      </button>
    </template>
    <template #default="{ close }">
      <p class="state" role="status" data-testid="sync-shield-state"><strong>{{ vault.connected ? statusText : t('sync.shield.off') }}</strong></p>
      <button v-if="action === 'sync' || action === 'none'" class="item" type="button" :disabled="action === 'none'" data-testid="sync-menu-now" @click="close(); syncNow()"><Icon name="lucide:refresh-cw" /> {{ t('sync.now') }}</button>
      <button class="item" type="button" data-testid="sync-menu-settings" @click="close(); ui.open('sync')"><Icon name="lucide:settings" /> {{ vault.connected ? t('sync.menu.settings') : t('sync.shield.start') }}</button>
    </template>
  </Dropdown>
</template>

<style scoped>
.sync-shield { color: var(--muted); font-size: var(--fs-xl); }
.sync-shield[data-status="synced"] { color: var(--success); }
.sync-shield[data-status="locked"] { color: var(--text); }
.sync-shield[data-status="offline"], .sync-shield[data-status="needs-attention"], .sync-shield[data-status="target-full"], .sync-shield[data-status="allow-folder"], .sync-shield[data-status="folder-not-found"], .sync-shield[data-status="sign-in-again"] { color: var(--warn); }
.sync-shield:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.state { margin: 0; padding: .5rem .75rem; font-size: var(--fs-sm); }
.item { display: flex; align-items: center; gap: .4rem; width: 100%; margin: 0; padding: .5rem .6rem; border: 0; border-radius: var(--r-sm); background: none; color: var(--accent); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
.item:hover:not(:disabled) { background: var(--accent-soft); }
.item:disabled { color: var(--muted); cursor: not-allowed; }
.item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
/* A touch target of 44 px on phones and on any coarse pointer (WCAG 2.5.8); 36 px with a mouse. */
.sync-shield { width: 36px; height: 36px; }
@media (max-width: 720px), (pointer: coarse) { .sync-shield { width: 44px; height: 44px; } }
</style>
