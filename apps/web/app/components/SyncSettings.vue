<script setup lang="ts">
import { acceptablePassword, passwordStrength } from '@retroboard/crypto'
import { lastOpenedLabel } from '~/utils/relative-time'
import { syncStatusIcon } from '~/utils/sync-status'

/**
 * Preferences > Sync (change user-drive-storage, "Preferences > Sync (UX)"): choose a folder, create or unlock the vault,
 * the recovery key and the plain warning, the status, "Sync now", the devices, and "Disconnect and forget". There is no
 * control that switches encryption off: a vault always has a password.
 */
const { t, locale } = useT()
const vault = useVaultStore()
const { $ports } = useNuxtApp()
const { push } = useToasts()

const password = ref('')
const again = ref('')
const secret = ref('')
const useKey = ref(false)
const stored = ref(false)
const understood = ref(false)
const reissuePassword = ref('')
const deleteFiles = ref(false)
const deletePassword = ref('')
const confirmDisconnect = ref(false)

const strength = computed(() => passwordStrength(password.value))
const longEnough = computed(() => acceptablePassword(password.value))
const mismatch = computed(() => again.value !== '' && again.value !== password.value)
const canCreate = computed(() => longEnough.value && password.value === again.value && !vault.busy)
const statusText = computed(() => {
  if (vault.status === 'synced' && vault.lastSyncAt) return t('sync.status.synced.at', { time: lastOpenedLabel(vault.lastSyncAt, Date.now(), locale.value) })
  return t(`sync.status.${vault.status}` as never)
})
const reasonText = computed(() => (vault.status === 'needs-attention' && vault.reason ? t(`sync.reason.${vault.reason}` as never) : ''))
const lastSync = computed(() => (vault.lastSyncAt ? t('sync.last', { time: lastOpenedLabel(vault.lastSyncAt, Date.now(), locale.value) }) : t('sync.never')))
const errorText = computed(() => (vault.error ? t(vault.error) : ''))

function submitCreate() { if (canCreate.value) void vault.create(password.value) }
function submitUnlock() {
  const value = secret.value.trim()
  if (!value || vault.busy) return
  void vault.unlock(useKey.value ? { recoveryKey: value } : { password: value })
}
async function start() {
  await vault.acknowledge()
  stored.value = understood.value = false
  password.value = again.value = secret.value = ''
}
const print = () => window.print()
function save() { if (vault.recoveryKey) $ports.file.save(t('sync.recovery.file'), `${t('sync.recovery.sheet')}\n\n${vault.recoveryKey.text}\n`, 'text/plain') }
async function copy() {
  if (!vault.recoveryKey) return
  try { await $ports.clipboard.writeText(vault.recoveryKey.text); push(t('sync.recovery.copied'), 'ok') } catch { /* the key stays on screen */ }
}
async function reissue() { if (reissuePassword.value) { await vault.reissueRecoveryKey(reissuePassword.value); reissuePassword.value = '' } }
async function disconnect() {
  if (await vault.disconnect({ deleteFiles: deleteFiles.value, ...(deleteFiles.value ? { password: deletePassword.value } : {}) })) {
    deleteFiles.value = false
    deletePassword.value = ''
    push(t('sync.disconnect.done'), 'ok')
  }
}
const canDisconnect = computed(() => !vault.busy && (!deleteFiles.value || deletePassword.value !== ''))
</script>

<template>
  <section class="sync" data-testid="sync-section">
    <p v-if="!vault.supported && !vault.connected" class="muted" data-testid="sync-unsupported"><Icon name="lucide:monitor-x" /> {{ t('sync.unsupported') }}</p>

    <template v-else>
      <p class="muted">{{ t('sync.lead') }}</p>

      <!-- No folder yet. -->
      <div v-if="vault.step === 'idle'" class="stack">
        <h4>{{ t('sync.folder.title') }}</h4>
        <p class="muted">{{ t('sync.folder.lead') }}</p>
        <button class="btn btn-primary" type="button" :disabled="vault.busy" data-testid="sync-choose" @click="vault.chooseFolder()"><Icon name="lucide:folder-open" /> {{ t('sync.folder.choose') }}</button>
        <p class="muted small">{{ t('sync.limits') }}</p>
      </div>

      <!-- A folder without a vault: choose a password. -->
      <form v-else-if="vault.step === 'create'" class="stack" data-testid="sync-create-form" @submit.prevent="submitCreate">
        <h4>{{ t('sync.create.title') }}</h4>
        <p class="muted">{{ t('sync.folder.name', { name: vault.folderName }) }}</p>
        <p class="muted">{{ t('sync.create.lead') }}</p>
        <label class="lbl">{{ t('sync.password') }}
          <input v-model="password" class="field" type="password" autocomplete="new-password" aria-describedby="sync-pw-hint" data-testid="sync-password">
        </label>
        <p id="sync-pw-hint" class="muted small">{{ t('sync.password.hint') }}</p>
        <p v-if="password" class="small" data-testid="sync-strength">{{ t('sync.strength.label', { level: t(`sync.strength.${strength.level}` as never) }) }}</p>
        <p v-if="password && !longEnough" class="small warn">{{ t('sync.password.short') }}</p>
        <label class="lbl">{{ t('sync.password.confirm') }}
          <input v-model="again" class="field" type="password" autocomplete="new-password" :aria-invalid="mismatch" data-testid="sync-password-confirm">
        </label>
        <p v-if="mismatch" class="small warn" role="alert">{{ t('sync.password.mismatch') }}</p>
        <p v-if="errorText" class="small warn" role="alert" data-testid="sync-error">{{ errorText }}</p>
        <div class="row">
          <button class="btn btn-primary" type="submit" :disabled="!canCreate" data-testid="sync-create"><Icon name="lucide:lock" /> {{ t('sync.create.button') }}</button>
          <button class="btn btn-ghost" type="button" @click="vault.cancelSetup()"><Icon name="lucide:x" /> {{ t('common.cancel') }}</button>
        </div>
      </form>

      <!-- A vault is there: its password or its recovery key. -->
      <form v-else-if="vault.step === 'unlock'" class="stack" data-testid="sync-unlock-form" @submit.prevent="submitUnlock">
        <h4>{{ t('sync.unlock.title') }}</h4>
        <p class="muted">{{ t('sync.folder.name', { name: vault.folderName }) }}</p>
        <p class="muted">{{ t('sync.unlock.lead') }}</p>
        <label class="lbl">{{ useKey ? t('sync.recoveryKey') : t('sync.password') }}
          <input v-model="secret" class="field" :type="useKey ? 'text' : 'password'" :autocomplete="useKey ? 'off' : 'current-password'" :spellcheck="false" data-testid="sync-unlock-secret">
        </label>
        <p v-if="errorText" class="small warn" role="alert" data-testid="sync-error">{{ errorText }}</p>
        <div class="row">
          <button class="btn btn-primary" type="submit" :disabled="vault.busy || !secret.trim()" data-testid="sync-unlock"><Icon name="lucide:lock-open" /> {{ t('sync.unlock.button') }}</button>
          <button class="btn btn-ghost" type="button" data-testid="sync-unlock-switch" @click="useKey = !useKey; secret = ''"><Icon name="lucide:key-round" /> {{ useKey ? t('sync.unlock.password') : t('sync.unlock.recovery') }}</button>
          <button v-if="!vault.connected" class="btn btn-ghost" type="button" @click="vault.cancelSetup()"><Icon name="lucide:x" /> {{ t('common.cancel') }}</button>
        </div>
        <button v-if="vault.status === 'folder-not-found'" class="btn btn-sm" type="button" data-testid="sync-rechoose" @click="vault.chooseFolder()"><Icon name="lucide:folder-open" /> {{ t('sync.folder.again') }}</button>
      </form>

      <!-- The recovery key, the plain warning, and the two boxes the first sync waits for. -->
      <div v-else-if="vault.step === 'recovery' && vault.recoveryKey" class="stack" data-testid="sync-recovery">
        <h4>{{ t('sync.recovery.title') }}</h4>
        <p class="muted">{{ t('sync.recovery.lead') }}</p>
        <div class="recovery-print">
          <strong class="print-title">{{ t('sync.recovery.sheet') }}</strong>
          <p class="key" data-testid="sync-recovery-key">{{ vault.recoveryKey.text }}</p>
          <QrCode :value="vault.recoveryKey.qr" :label="t('sync.recovery.qr')" :size="140" />
        </div>
        <div class="row">
          <button class="btn btn-sm" type="button" data-testid="sync-recovery-print" @click="print"><Icon name="lucide:printer" /> {{ t('sync.recovery.print') }}</button>
          <button class="btn btn-sm" type="button" data-testid="sync-recovery-save" @click="save"><Icon name="lucide:download" /> {{ t('sync.recovery.save') }}</button>
          <button class="btn btn-sm" type="button" data-testid="sync-recovery-copy" @click="copy"><Icon name="lucide:copy" /> {{ t('sync.recovery.copy') }}</button>
        </div>
        <p class="warning" role="note" data-testid="sync-warning"><Icon name="lucide:triangle-alert" /> {{ t('sync.warn') }}</p>
        <label class="chk"><input v-model="stored" type="checkbox" data-testid="sync-ack-stored"> {{ t('sync.ack.stored') }}</label>
        <label class="chk"><input v-model="understood" type="checkbox" data-testid="sync-ack-understand"> {{ t('sync.ack.understand') }}</label>
        <button class="btn btn-primary" type="button" :disabled="!stored || !understood" data-testid="sync-start" @click="start"><Icon name="lucide:check" /> {{ t(vault.recoveryMode === 'first' ? 'sync.ack.start' : 'common.close') }}</button>
      </div>

      <!-- Connected and unlocked. -->
      <div v-else class="stack">
        <p class="muted">{{ t('sync.folder.name', { name: vault.folderName }) }}</p>
        <p class="status" role="status" aria-live="polite" :data-status="vault.status" data-testid="sync-status">
          <Icon :name="syncStatusIcon(vault.status)" /> <span>{{ statusText }}</span>
        </p>
        <p v-if="reasonText" class="small warn">{{ reasonText }}</p>
        <p class="muted small" data-testid="sync-last">{{ lastSync }}</p>
        <div class="row">
          <button class="btn btn-sm" type="button" data-testid="sync-now" :disabled="vault.status === 'syncing' || !vault.unlocked" @click="vault.syncNow()"><Icon name="lucide:refresh-cw" /> {{ t('sync.now') }}</button>
          <button v-if="vault.status === 'allow-folder'" class="btn btn-sm btn-primary" type="button" data-testid="sync-allow" @click="vault.requestAccess()"><Icon name="lucide:folder" /> {{ t('sync.allow') }}</button>
          <button v-if="vault.status === 'folder-not-found'" class="btn btn-sm btn-primary" type="button" data-testid="sync-rechoose" @click="vault.chooseFolder()"><Icon name="lucide:folder-open" /> {{ t('sync.folder.again') }}</button>
        </div>
        <p v-if="vault.status === 'allow-folder'" class="muted small">{{ t('sync.allow.hint') }}</p>
        <p v-if="errorText" class="small warn" role="alert" data-testid="sync-error">{{ errorText }}</p>
        <p class="muted small">{{ t('sync.limits') }}</p>
      </div>

      <section v-if="vault.step === 'ready' && vault.devices.length" class="stack">
        <h4>{{ t('sync.devices') }}</h4>
        <ul class="devices" data-testid="sync-devices">
          <li v-for="d in vault.devices" :key="d.device"><Icon name="lucide:monitor-smartphone" /> {{ d.name || t('sync.devices.unknown') }}<span v-if="d.self" class="muted"> ({{ t('sync.devices.this') }})</span></li>
        </ul>
      </section>

      <form v-if="vault.step === 'ready'" class="stack" @submit.prevent="reissue">
        <h4>{{ t('sync.recovery.again.title') }}</h4>
        <p class="muted small">{{ t('sync.recovery.again.lead') }}</p>
        <label class="lbl">{{ t('sync.password') }}
          <input v-model="reissuePassword" class="field" type="password" autocomplete="current-password" data-testid="sync-reissue-password">
        </label>
        <div><button class="btn btn-sm" type="submit" :disabled="!reissuePassword || vault.busy" data-testid="sync-reissue"><Icon name="lucide:key-round" /> {{ t('sync.recovery.again.button') }}</button></div>
      </form>

      <section v-if="vault.connected" class="stack danger">
        <h4>{{ t('sync.disconnect') }}</h4>
        <p class="muted small">{{ t('sync.disconnect.hint') }}</p>
        <ToggleSwitch v-model="deleteFiles" plain :label="t('sync.disconnect.delete')" :hint="t('sync.disconnect.delete.hint')" data-testid="sync-delete-files" />
        <label v-if="deleteFiles" class="lbl">{{ t('sync.password') }}
          <input v-model="deletePassword" class="field" type="password" autocomplete="current-password" data-testid="sync-delete-password">
        </label>
        <div><button class="btn btn-danger btn-sm" type="button" :disabled="!canDisconnect" data-testid="sync-disconnect" @click="confirmDisconnect = true"><Icon name="lucide:unplug" /> {{ t('sync.disconnect') }}</button></div>
        <ConfirmDialog v-model:open="confirmDisconnect" danger :title="t('sync.disconnect.title')" :confirm-label="t('sync.disconnect.button')" :message="t(deleteFiles ? 'sync.disconnect.message.delete' : 'sync.disconnect.message')" confirm-icon="lucide:unplug" @confirm="disconnect" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.sync { display: grid; gap: var(--sp-3); }
.stack { display: grid; gap: var(--sp-2); }
h4 { font-size: var(--fs-md); }
.row { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.small { font-size: var(--fs-sm); }
.warn { color: var(--danger); }
.status { display: flex; align-items: center; gap: var(--sp-2); font-weight: 700; }
.status[data-status="synced"] { color: var(--success); }
.status[data-status="offline"], .status[data-status="needs-attention"], .status[data-status="target-full"], .status[data-status="allow-folder"], .status[data-status="folder-not-found"] { color: var(--warn); }
.key { padding: var(--sp-3); border: 1px dashed var(--border); border-radius: var(--r-control); font-family: var(--f-mono); font-size: var(--fs-lg); letter-spacing: .04em; word-break: break-all; user-select: all; }
.recovery-print { display: grid; gap: var(--sp-2); justify-items: start; }
.print-title { display: none; }
.warning { display: flex; gap: var(--sp-2); align-items: flex-start; padding: var(--sp-3); border: 1px solid var(--warn); border-radius: var(--r-control); background: var(--surface2); font-weight: 600; }
.chk { display: flex; gap: var(--sp-2); align-items: flex-start; cursor: pointer; }
.chk input { inline-size: 20px; block-size: 20px; flex: none; accent-color: var(--accent); }
.devices { display: grid; gap: var(--sp-1); margin: 0; padding: 0; list-style: none; }
.danger h4 { color: var(--danger); }
.danger .btn { margin: 3px; }
</style>

<style>
/* The recovery key on paper: everything else of the page is hidden while it prints. */
@media print {
  body * { visibility: hidden; }
  .recovery-print, .recovery-print * { visibility: visible; }
  .recovery-print { position: fixed; inset: 0; padding: 2cm; background: Canvas; color: CanvasText; }
  .recovery-print .print-title { display: block; font-size: var(--fs-2xl); margin-bottom: 1cm; }
}
</style>
