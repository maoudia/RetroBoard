<script setup lang="ts">
import { shouldNudgeName } from '@retroboard/application'
import { isLocalRoom } from '~/transport'
const { t } = useT()

const ID = 'name-nudge'
const board = useBoardStore()
const identity = useIdentityStore()
const ui = useUiStore()
const slot = usePopupSlot()

const joinedAt = Date.now()
const now = ref(Date.now())
const key = computed(() => `retroboard:nudge:${board.roomId}`)
const hereOff = ref(false)
const shown = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  try { hereOff.value = sessionStorage.getItem(key.value) === '1' } catch { /* private mode: asked again, harmless */ }
  timer = setInterval(() => { now.value = Date.now() }, 1_000)
})
onBeforeUnmount(() => { clearInterval(timer); slot.release(ID) })

const wanted = computed(() => shouldNudgeName({
  name: identity.name,
  joinedForMs: now.value - joinedAt,
  ownNotes: board.snapshot?.notes.filter((n) => n.mine).length ?? 0,
  solo: !board.roomId || isLocalRoom(board.roomId),
  presenter: ui.presenter,
  dismissedHere: hereOff.value,
  dismissedEverywhere: identity.nudgeOff,
  busy: ui.dialog !== null || slot.heldByOther(ID),
}))
// Show when wanted and the slot is free; hide as soon as another dialog or popup takes the stage.
watch(wanted, (w) => {
  if (w && slot.claim(ID)) shown.value = true
  else if (!w) { shown.value = false; slot.release(ID) }
}, { immediate: true })

function choose() { shown.value = false; slot.release(ID); ui.open('name') }
function later() {
  hereOff.value = true
  try { sessionStorage.setItem(key.value, '1') } catch { /* ignore */ }
}
function never() { identity.stopNudging() }
</script>

<template>
  <aside v-if="shown" class="nudge" role="status" aria-live="polite" data-testid="name-nudge">
    <p><Icon name="lucide:user-round-pen" aria-hidden="true" /> {{ t('nudge.name.title') }}</p>
    <div class="row">
      <button class="btn btn-sm btn-primary" type="button" data-testid="nudge-choose" @click="choose">{{ t('nudge.name.choose') }}</button>
      <button class="btn btn-sm" type="button" data-testid="nudge-later" @click="later">{{ t('nudge.name.later') }}</button>
      <button class="link" type="button" data-testid="nudge-never" @click="never">{{ t('nudge.name.never') }}</button>
    </div>
  </aside>
</template>

<style scoped>
.nudge { position: fixed; z-index: 70; right: 18px; bottom: 18px; max-width: min(24rem, calc(100vw - 36px)); display: grid; gap: .6rem; padding: .85rem 1rem; border-radius: var(--r-card, 12px); background: var(--surface2); color: var(--text); border: 1px solid var(--border); box-shadow: var(--shadow-2); }
p { margin: 0; display: flex; gap: .5rem; align-items: flex-start; font-weight: 600; }
.row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.link { border: 0; background: none; padding: .25rem; color: var(--muted); text-decoration: underline; cursor: pointer; font: inherit; font-size: var(--fs-sm); }
</style>
