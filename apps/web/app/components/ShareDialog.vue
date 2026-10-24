<script setup lang="ts">
import { boardHash, inviteFromHash } from '~/utils/invite'
const { t } = useT()
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
  return invite.value ? `${window.location.origin}/board${boardHash(invite.value, 'participant')}` : window.location.href
})
/** Only the facilitator holds it: shown on demand, to keep or to hand to a co-facilitator. */
const facilitatorUrl = computed(() => {
  const inv = invite.value
  return inv?.kind === 'encrypted' && inv.ring.facilitatorSecret ? `${window.location.origin}/board${boardHash(inv, 'facilitator')}` : null
})
const showFacilitator = ref(false)
async function copyFacilitator() {
  if (!facilitatorUrl.value) return
  try { await $ports.clipboard.writeText(facilitatorUrl.value); push(t('share.copied'), 'ok') } catch { push(t('share.copyFailed'), 'warn') }
}
const canShare = computed(() => import.meta.client && typeof navigator.share === 'function')

async function copy() {
  try { await $ports.clipboard.writeText(url.value); push(t('share.copied'), 'ok') } catch { push(t('share.copyFailed'), 'warn') }
}
const share = () => navigator.share({ title: t('share.nativeTitle'), url: url.value }).catch(() => {})
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('share.title')" width="520px">
    <p class="muted">{{ t('share.intro') }}</p>
    <div class="row">
      <input class="field mono" :value="url" readonly :aria-label="t('share.link')" data-testid="share-url" @focus="($event.target as HTMLInputElement).select()" />
      <button class="btn btn-primary" type="button" data-testid="copy-link" @click="copy"><Icon name="lucide:copy" /> {{ t('share.copy') }}</button>
    </div>
    <button v-if="canShare" class="btn" type="button" @click="share"><Icon name="lucide:share-2" /> {{ t('share.share') }}</button>
    <ul class="notes muted">
      <li v-if="encrypted" data-testid="share-e2e"><Icon name="lucide:shield-check" /> {{ t('share.note.e2e') }}</li>
      <li v-if="encrypted" class="warn" data-testid="share-warn"><Icon name="lucide:triangle-alert" /> {{ t('share.note.public') }}</li>
      <li v-if="protectedByPasscode" data-testid="share-passcode"><Icon name="lucide:key-round" /> {{ t('share.note.passcode') }}</li>
      <li><Icon name="lucide:lock" /> {{ t(encrypted ? 'share.note.memory' : 'share.note.erase') }}</li>
      <li><Icon name="lucide:eye-off" /> {{ t('share.note.drafts') }}</li>
    </ul>
    <details v-if="facilitatorUrl" class="fac" :open="showFacilitator" @toggle="showFacilitator = ($event.target as HTMLDetailsElement).open">
      <summary data-testid="share-facilitator-toggle">{{ t('share.facilitator') }}</summary>
      <p class="muted small">{{ t('share.facilitator.hint') }}</p>
      <div v-if="showFacilitator" class="row">
        <input class="field mono" :value="facilitatorUrl" readonly :aria-label="t('share.facilitator')" data-testid="share-facilitator-url" @focus="($event.target as HTMLInputElement).select()" />
        <button class="btn" type="button" @click="copyFacilitator"><Icon name="lucide:copy" /> {{ t('share.copy') }}</button>
      </div>
    </details>
  </BaseDialog>
</template>

<style scoped>
.row { display: flex; gap: .5rem; }
.notes { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; font-size: .88rem; }
.notes li { display: flex; gap: .5rem; align-items: center; }
.notes .warn { color: var(--text); font-weight: 600; }
.fac { display: grid; gap: .5rem; padding-top: .5rem; border-top: 1px solid var(--border); }
.fac summary { cursor: pointer; font-weight: 600; }
.small { font-size: .85rem; margin: 0; }
</style>
