<script setup lang="ts">
// The invite sheet of a poker room (change poker-design-v2, K5): the QR code of the participant link, a filled Copy link that copies without
// showing the address, Share where the browser has a share sheet, and one muted line. The room page never prints its link.
import { pt } from '~/poker/strings'

const props = defineProps<{ open: boolean; url: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const copied = ref(false)
const canShare = ref(false)
onMounted(() => { canShare.value = typeof navigator.share === 'function' })
watch(() => props.open, (open) => { if (open) copied.value = false })

async function copy() {
  try { await navigator.clipboard.writeText(props.url); copied.value = true } catch { copied.value = false }
}
async function share() {
  try { await navigator.share({ title: pt('poker.pageTitle'), url: props.url }) } catch { /* closed without sharing */ }
}
</script>

<template>
  <BaseDialog :open="open" :title="pt('poker.invite')" width="360px" @update:open="emit('update:open', $event)">
    <div class="qr"><QrCode :value="url" :label="pt('poker.invite.qrLabel')" :size="200" /></div>
    <div class="actions">
      <button type="button" class="btn btn-primary" data-testid="poker-copy" @click="copy"><Icon name="lucide:copy" /> {{ pt(copied ? 'poker.invite.copied' : 'poker.invite.copy') }}</button>
      <button v-if="canShare" type="button" class="btn" data-testid="poker-share" @click="share"><Icon name="lucide:share-2" /> {{ pt('poker.invite.share') }}</button>
    </div>
    <p class="hint">{{ pt('poker.invite.hint') }}</p>
  </BaseDialog>
</template>

<style scoped>
.qr { display: grid; justify-items: center; }
.actions { display: grid; gap: var(--sp-2); }
.actions .btn { min-block-size: 48px; }
.hint { margin: 0; font-size: var(--fs-sm); color: var(--muted); text-align: center; }
</style>
