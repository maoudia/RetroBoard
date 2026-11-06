<script setup lang="ts">
import { chatInvite, emailInvite, mailtoHref } from '@retroboard/application'
import { td } from '~/i18n'
import { boardHash, inviteFromHash, participantLink } from '~/utils/invite'
const { t } = useT()
/** The creator's tab keeps the passcode in memory: offered for copy, never put in a message. */
const props = defineProps<{ passcode?: string | null }>()
const board = useBoardStore()
const ui = useUiStore()
const { push } = useToasts()
const { $ports } = useNuxtApp()
const open = computed({ get: () => ui.dialog === 'share', set: (v) => { if (!v && ui.dialog === 'share') ui.close() } })
const route = useRoute()
/** Participants' link: never the facilitator secret, whoever opens this dialog. */
const invite = computed(() => (import.meta.client ? inviteFromHash(route.hash) : null))
const encrypted = computed(() => invite.value?.kind === 'encrypted')
const protectedByPasscode = computed(() => invite.value?.kind === 'encrypted' && !!invite.value.ring.passcode)
const url = computed(() => {
  if (!import.meta.client) return ''
  return invite.value ? participantLink(invite.value, window.location.origin) : window.location.href
})
/** Only the facilitator holds it: shown on demand, to keep or to hand to a co-facilitator. */
const facilitatorUrl = computed(() => {
  const inv = invite.value
  return inv?.kind === 'encrypted' && inv.ring.facilitatorSecret ? `${window.location.origin}/boards${boardHash(inv, 'facilitator')}` : null
})
const showFacilitator = ref(false)
/** One facilitator: the link has its own card, and the lead can hand over to someone connected. */
const oneFacilitator = computed(() => board.settings?.openFacilitation === false)
const connected = computed(() => board.peers.filter((p) => !p.me && p.key && !p.hidden))
const handTo = ref('')
function handOver() {
  if (!handTo.value || !board.sendRole('role.handover', handTo.value)) { push(t('roles.failed'), 'warn'); return }
  push(t('share.handover.done'), 'ok')
  handTo.value = ''
}
async function copyFacilitator() {
  if (!facilitatorUrl.value) return
  try { await $ports.clipboard.writeText(facilitatorUrl.value); push(t('share.copied'), 'ok') } catch { push(t('share.copyFailed'), 'warn') }
}
/** Simple: link, copy, native share, QR, passcode. Advanced adds chat/email templates, notes and the facilitator link (change simple-advanced-mode). */
const advanced = computed(() => useSettingsStore().s.uiMode === 'advanced')
const canShare = computed(() => import.meta.client && typeof navigator.share === 'function')

async function copy() {
  try { await $ports.clipboard.writeText(url.value); push(t('share.copied'), 'ok') } catch { push(t('share.copyFailed'), 'warn') }
}
const share = () => navigator.share({ title: t('share.nativeTitle'), url: url.value }).catch(() => {})

const inviteInput = computed(() => ({ title: board.settings?.title ?? '', url: url.value, passcodeProtected: protectedByPasscode.value }))
const mailto = computed(() => mailtoHref(emailInvite(inviteInput.value, td)))
async function copyChat() {
  try { await $ports.clipboard.writeText(chatInvite(inviteInput.value, td).body); push(t('share.messageCopied'), 'ok') } catch { push(t('share.copyFailed'), 'warn') }
}
const showCode = ref(false)
async function copyPasscode() {
  if (!props.passcode) return
  try { await $ports.clipboard.writeText(props.passcode); push(t('share.passcodeCopied'), 'ok') } catch { push(t('share.copyFailed'), 'warn') }
}
const showQr = ref(false)
// Warm the QR encoder as soon as the dialog opens, so the code is instant when expanded (change ux-irritants-wave-2).
watch(open, (v) => { if (v) void import('uqr') }, { immediate: true })
// Join by short code (change short-links-and-join): any participant can show a code and let a knocker in.
const host = useJoinHostStore()
const startCode = () => { const inv = invite.value; if (inv) void host.start(() => participantLink(inv, window.location.origin)) }
const minutesLeft = computed(() => Math.max(1, Math.ceil((host.expiresAt - Date.now()) / 60_000)))
watch(() => host.knocks.length, (n) => { if (n && !open.value) ui.open('share') })
onBeforeUnmount(() => host.stop())
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('share.title')" width="520px">
    <p class="muted">{{ t('share.intro') }}</p>
    <ol class="how" data-testid="share-how">
      <li><Icon name="lucide:qr-code" /> {{ t('share.how.scan') }}</li>
      <li><Icon name="lucide:link" /> {{ t('share.how.link') }}</li>
      <li v-if="encrypted"><Icon name="lucide:hash" /> {{ t('share.how.code') }}</li>
    </ol>
    <ModeSwitch />
    <p v-if="board.roomCode" class="code-words" data-testid="share-room-code"><Icon name="lucide:badge-check" /> {{ t('share.roomCode') }} <strong>{{ board.roomCode }}</strong></p>
    <p v-if="board.roomCode" class="muted code-hint" data-testid="share-room-code-hint">{{ t('share.roomCode.hint') }}</p>
    <div class="row">
      <input class="field mono" :value="url" readonly :aria-label="t('share.link')" data-testid="share-url" @focus="($event.target as HTMLInputElement).select()" />
      <button class="btn btn-primary" type="button" data-testid="copy-link" @click="copy"><Icon name="lucide:copy" /> {{ t('share.copy') }}</button>
    </div>
    <div class="acts">
      <button v-if="canShare" class="btn" type="button" @click="share"><Icon name="lucide:share-2" /> {{ t('share.share') }}</button>
      <button v-if="advanced" class="btn" type="button" data-testid="copy-chat" @click="copyChat"><Icon name="lucide:message-square" /> {{ t('share.copyChat') }}</button>
      <a v-if="advanced" class="btn" :href="mailto" data-testid="share-email"><Icon name="lucide:mail" /> {{ t('share.email') }}</a>
    </div>
    <div v-if="protectedByPasscode && passcode" class="row code">
      <span class="lbl">{{ t('share.passcode') }}</span>
      <input class="field mono" :type="showCode ? 'text' : 'password'" :value="passcode" readonly :aria-label="t('share.passcode')" data-testid="share-passcode-value" />
      <button class="mini-btn" type="button" :aria-pressed="showCode" :aria-label="t('share.showPasscode')" @click="showCode = !showCode"><Icon :name="showCode ? 'lucide:eye-off' : 'lucide:eye'" /></button>
      <button class="btn" type="button" data-testid="copy-passcode" @click="copyPasscode"><Icon name="lucide:key-round" /> {{ t('share.copyPasscode') }}</button>
    </div>
    <details class="fac" :open="showQr" @toggle="showQr = ($event.target as HTMLDetailsElement).open">
      <summary data-testid="share-qr-toggle"><Icon name="lucide:qr-code" /> {{ t('share.qr') }}</summary>
      <p class="muted small">{{ t('share.qr.hint') }}</p>
      <QrCode v-if="showQr" class="qrbox" :value="url" :label="t('share.qr.alt')" />
    </details>
    <section v-if="encrypted" class="jc" data-testid="join-code-block">
      <button v-if="!host.code" class="btn" type="button" data-testid="join-code-show" @click="startCode"><Icon name="lucide:hash" /> {{ t('join.show') }}</button>
      <template v-else>
        <p class="muted small">{{ t('join.hint') }}</p>
        <strong class="jc-code mono" data-testid="join-code-value">{{ host.code }}</strong>
        <p class="muted small">{{ t('join.expires', { n: minutesLeft }) }}</p>
        <ul v-if="host.knocks.length" class="knocks" data-testid="join-knocks">
          <li v-for="k in host.knocks" :key="k.n" data-testid="join-knock">
            <span>{{ t('join.knock', { name: k.name || t('common.anonymous') }) }} <strong class="mono" data-testid="knock-number">{{ k.number }}</strong></span>
            <small class="muted">{{ t('join.check') }}</small>
            <span class="kb">
              <button class="btn btn-sm btn-primary" type="button" data-testid="knock-admit" @click="host.admit(k)"><Icon name="lucide:user-check" /> {{ t('join.letIn') }}</button>
              <button class="btn btn-sm" type="button" data-testid="knock-refuse" @click="host.refuse(k)"><Icon name="lucide:user-x" /> {{ t('join.refuse') }}</button>
            </span>
          </li>
        </ul>
        <button class="btn btn-sm" type="button" data-testid="join-code-stop" @click="host.stop()"><Icon name="lucide:x" /> {{ t('join.stop') }}</button>
      </template>
    </section>
    <ul v-if="advanced" class="notes muted">
      <li v-if="encrypted" data-testid="share-e2e"><Icon name="lucide:shield-check" /> {{ t('share.note.e2e') }}</li>
      <li v-if="encrypted" class="warn" data-testid="share-warn"><Icon name="lucide:triangle-alert" /> {{ t('share.note.public') }}</li>
      <li v-if="protectedByPasscode" data-testid="share-passcode"><Icon name="lucide:key-round" /> {{ t('share.note.passcode') }}</li>
      <li><Icon name="lucide:lock" /> {{ t(encrypted ? 'share.note.memory' : 'share.note.erase') }}</li>
      <li><Icon name="lucide:eye-off" /> {{ t('share.note.drafts') }}</li>
    </ul>
    <section v-if="facilitatorUrl && oneFacilitator" class="fac card" data-testid="share-facilitator-card">
      <h3>{{ t('share.facilitator.card') }}</h3>
      <p class="muted small"><Icon name="lucide:triangle-alert" aria-hidden="true" /> {{ t('share.facilitator.warn') }}</p>
      <div class="row">
        <input class="field mono" :value="facilitatorUrl" readonly :aria-label="t('share.facilitator')" data-testid="share-facilitator-url" @focus="($event.target as HTMLInputElement).select()" />
        <button class="btn" type="button" data-testid="share-facilitator-copy" @click="copyFacilitator"><Icon name="lucide:copy" /> {{ t('share.copy') }}</button>
      </div>
      <div v-if="board.access.canManageRoles" class="row">
        <select v-model="handTo" class="field" :aria-label="t('share.handover.label')" data-testid="share-handover-select">
          <option value="">{{ connected.length ? t('share.handover.pick') : t('share.handover.none') }}</option>
          <option v-for="p in connected" :key="p.key" :value="p.key">{{ p.name ?? t('common.anonymous') }}</option>
        </select>
        <button class="btn" type="button" :disabled="!handTo" data-testid="share-handover" @click="handOver"><Icon name="lucide:crown" /> {{ t('roles.handover.ok') }}</button>
      </div>
    </section>
    <details v-else-if="facilitatorUrl && advanced" class="fac" :open="showFacilitator" @toggle="showFacilitator = ($event.target as HTMLDetailsElement).open">
      <summary data-testid="share-facilitator-toggle">{{ t(board.settings?.openFacilitation ? 'share.facilitator.advanced' : 'share.facilitator') }}</summary>
      <p class="muted small">{{ t(board.settings?.openFacilitation ? 'share.facilitator.advanced.hint' : 'share.facilitator.hint') }}</p>
      <div v-if="showFacilitator" class="row">
        <input class="field mono" :value="facilitatorUrl" readonly :aria-label="t('share.facilitator')" data-testid="share-facilitator-url" @focus="($event.target as HTMLInputElement).select()" />
        <button class="btn" type="button" @click="copyFacilitator"><Icon name="lucide:copy" /> {{ t('share.copy') }}</button>
      </div>
    </details>
  </BaseDialog>
</template>

<style scoped>
.row { display: flex; gap: .5rem; }
.row .btn { flex: none; white-space: nowrap; }
.row .field { min-width: 0; flex: 1; }
.code-hint { margin: 0; font-size: var(--fs-sm); }
.code-words { margin: 0; display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.acts { display: flex; flex-wrap: wrap; gap: .5rem; }
.acts .btn { flex: 1 1 auto; justify-content: center; min-width: 0; white-space: nowrap; }
@media (max-width: 480px) { .acts .btn { flex-basis: 100%; } }
.acts a.btn { text-decoration: none; }
.code { align-items: center; }
.code .lbl { font-weight: 600; white-space: nowrap; }
.qrbox { margin: 0 auto; }
.how { list-style: none; margin: .25rem 0 .5rem; padding: 0; display: grid; gap: .3rem; font-size: var(--fs-sm); }
.how li { display: flex; gap: .6rem; align-items: flex-start; line-height: 1.4; }
.how li :deep(svg), .notes li :deep(svg) { flex: none; margin-top: .2em; }
.notes { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; font-size: var(--fs-sm); }
.notes li { display: flex; gap: .6rem; align-items: flex-start; line-height: 1.4; }
.notes .warn { color: var(--text); font-weight: 600; }
.fac { display: grid; gap: .5rem; padding-top: .5rem; border-top: 1px solid var(--border); }
.fac summary { cursor: pointer; font-weight: 600; }
.small { font-size: var(--fs-sm); margin: 0; }
h3 { font-size: var(--fs-md); margin: 0; }
.jc { display: grid; gap: .5rem; justify-items: start; padding-top: .5rem; }
.jc-code { font-size: var(--fs-2xl); letter-spacing: .12em; font-weight: 800; }
.knocks { display: grid; gap: .5rem; width: 100%; margin: 0; padding: 0; list-style: none; }
.knocks li { display: grid; gap: .25rem; padding: .6rem .75rem; border: 1px solid var(--border); border-radius: var(--r-card); }
.kb { display: flex; gap: .5rem; flex-wrap: wrap; }
/* Small screens: breathing room and full-width, thumb-sized controls instead of a squeezed row of pills. */
.fac summary { display: flex; align-items: center; gap: .5rem; min-height: 44px; }
@media (max-width: 600px) {
  .how { gap: .6rem; margin: .5rem 0 .75rem; }
  .row { flex-direction: column; gap: .6rem; }
  .row .btn { width: 100%; justify-content: center; min-height: 44px; }
  .row.code { flex-direction: row; flex-wrap: wrap; align-items: center; }
  .row.code .field { flex: 1 1 8rem; }
  .row.code .btn { width: auto; flex: 1 1 100%; }
  .acts { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
  .acts .btn { justify-content: center; min-height: 44px; white-space: nowrap; }
  .jc { justify-items: stretch; padding-top: .75rem; }
  .jc > .btn { justify-content: center; min-height: 44px; }
  .notes { gap: .6rem; padding-top: .25rem; }
  .fac { padding-top: .75rem; }
  .qrbox { max-width: min(100%, 240px); }
}
</style>
