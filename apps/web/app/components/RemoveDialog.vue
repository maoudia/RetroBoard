<script setup lang="ts">
import { movedRing, type Peer } from '@retroboard/domain'
import { inviteFromHash } from '~/utils/invite'
import { randomId } from '~/utils/storage'
const { t } = useT()
const props = defineProps<{ peer: Peer | null }>()
const emit = defineEmits<{ close: [] }>()
const board = useBoardStore()
const drafts = useDraftsStore()
const ui = useUiStore()
const route = useRoute()
const { $ports } = useNuxtApp()
const { push } = useToasts()

const who = computed(() => props.peer?.name ?? t('common.anonymous'))
/** People present now who would be sent the new link: frozen when the dialog opens, so someone who connects later is not. */
const reach = ref(0)
const busy = ref(false)
watch(() => props.peer, (p) => { busy.value = false; reach.value = p?.key ? board.beginMove(p.key) : 0 }, { immediate: true })

function removeOnly() {
  if (!props.peer?.key || !board.sendRole('participant.remove', props.peer.key)) push(t('roles.failed'), 'warn')
  emit('close')
}

/** Removes, then moves the team: what belongs to this board on this device follows before the old room closes. */
async function removeAndMove() {
  const key = props.peer?.key
  const invite = inviteFromHash(route.hash)
  if (!key || invite?.kind !== 'encrypted' || busy.value) return
  busy.value = true
  ui.moving = true
  try {
    const ring = movedRing(invite.ring, { roomId: randomId(16), roomKey: randomId(16) })
    drafts.copyTo(ring.roomId)
    const code = await $ports.vault.get(invite.ring.roomId)
    if (code !== null) await $ports.vault.set(ring.roomId, code)
    if (!board.sendRole('participant.remove', key)) throw new Error('role')
    const result = await board.moveToFreshLink(key, ring)
    if (!result) throw new Error('move')
    await navigateTo(`/boards#${result.hash}`)
    emit('close')
  } catch {
    push(t('remove.failed'), 'warn')
  } finally {
    busy.value = false
    ui.moving = false
  }
}
</script>

<template>
  <BaseDialog :open="peer !== null" :title="t('remove.title', { name: who })" width="480px" @update:open="(v: boolean) => { if (!v && !busy) emit('close') }">
    <div class="body" data-testid="remove-dialog">
      <p class="muted">{{ t('remove.intro', { name: who }) }}</p>
      <p class="muted" data-testid="remove-reach">{{ reach > 0 ? t('remove.move.count', { n: reach }) : t('remove.move.none') }}</p>
    </div>
    <template #footer>
      <button class="btn btn-ghost" type="button" :disabled="busy" @click="emit('close')"><Icon name="lucide:x" /> {{ t('common.cancel') }}</button>
      <button class="btn" type="button" :disabled="busy" data-testid="remove-only" @click="removeOnly"><Icon name="lucide:user-x" /> {{ t('remove.only') }}</button>
      <button class="btn btn-primary" type="button" :disabled="busy" data-testid="remove-move" @click="removeAndMove"><Icon :name="busy ? 'lucide:loader' : 'lucide:route'" /> {{ busy ? t('remove.moving') : t('remove.move') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.body { display: grid; gap: .6rem; }
</style>
