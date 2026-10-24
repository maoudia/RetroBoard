<script setup lang="ts">
const { t } = useT()
const ui = useUiStore()
const { push } = useToasts()
const { $ports } = useNuxtApp()
const open = computed({ get: () => ui.dialog === 'share', set: (v) => { if (!v && ui.dialog === 'share') ui.close() } })
const url = computed(() => (import.meta.client ? window.location.href : ''))
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
      <li><Icon name="lucide:lock" /> {{ t('share.note.erase') }}</li>
      <li><Icon name="lucide:eye-off" /> {{ t('share.note.drafts') }}</li>
    </ul>
  </BaseDialog>
</template>

<style scoped>
.row { display: flex; gap: .5rem; }
.notes { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; font-size: .88rem; }
.notes li { display: flex; gap: .5rem; align-items: center; }
</style>
