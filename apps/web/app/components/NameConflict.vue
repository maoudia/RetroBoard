<script setup lang="ts">
import { nameConflict, nameKey } from '@retroboard/application'
const { t } = useT()

/**
 * Duplicate names (change identity-conflicts): the latest joiner is invited to pick another name.
 * Whoever was here first is never asked. One popup at a time, dismissible, memory only.
 */
const ID = 'name-conflict'
const board = useBoardStore()
const identity = useIdentityStore()
const ui = useUiStore()
const slot = usePopupSlot()

/** Keys of the people already here when I arrived or when I chose this name. */
const earlier = ref(new Set<string>())
const seen = new Set<string>()
let primed = false
function remember(all: boolean) {
  for (const p of board.peers) {
    if (p.me || !p.key) continue
    if (all || !primed) earlier.value.add(p.key)
    seen.add(p.key)
  }
}
watch(() => [board.ready, board.peers.map((p) => p.key).join()] as const, ([ready]) => {
  if (!ready) return
  remember(false)
  primed = true
}, { immediate: true })
// Choosing a name that someone here already has: I am the one who is asked.
watch(() => identity.name, () => { earlier.value = new Set(earlier.value); remember(true) })

const dismissed = ref<string | null>(null)
const clash = computed(() => nameConflict(board.peers, earlier.value))
const mine = computed(() => nameKey(board.peers.find((p) => p.me)?.name))
const wanted = computed(() => !!clash.value && dismissed.value !== mine.value && !ui.presenter && ui.dialog === null)
const shown = ref(false)
watch(wanted, (w) => {
  if (w && slot.claim(ID)) shown.value = true
  else if (!w) { shown.value = false; slot.release(ID) }
}, { immediate: true })
onBeforeUnmount(() => slot.release(ID))

function choose() { shown.value = false; slot.release(ID); ui.open('name') }
function keep() { dismissed.value = mine.value; shown.value = false; slot.release(ID) }
</script>

<template>
  <aside v-if="shown" class="conflict conflict" role="status" aria-live="polite" data-testid="name-conflict">
    <p><Icon name="lucide:users-round" aria-hidden="true" /> {{ t('conflict.name.title', { name: clash ?? '' }) }}</p>
    <div class="row">
      <button class="btn btn-sm btn-primary" type="button" data-testid="conflict-choose" @click="choose"><Icon name="lucide:check" /> {{ t('conflict.name.choose') }}</button>
      <button class="btn btn-sm" type="button" data-testid="conflict-keep" @click="keep"><Icon name="lucide:user" /> {{ t('conflict.name.keep') }}</button>
    </div>
  </aside>
</template>

<style scoped>
aside.conflict.conflict { position: fixed; z-index: 70; right: 18px; bottom: 18px; max-width: min(24rem, calc(100vw - 36px)); display: grid; gap: .6rem; padding: .85rem 1rem; border-radius: var(--r-card, 12px); background: var(--surface2); color: var(--text); border: 1px solid var(--border); box-shadow: var(--shadow-2); }
p { margin: 0; display: flex; gap: .5rem; align-items: flex-start; font-weight: 600; }
.row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
</style>
