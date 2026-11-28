<script setup lang="ts">
import { reviewState } from '@retroboard/application'
import { type ActionStatus, agendaRunning, isOpenAction } from '@retroboard/domain'
const { t } = useT()

/**
 * Start of the retro: carried-over actions that are still open, with quick status buttons.
 * Shown once per board and browser tab; the same actions stay in the actions drawer.
 */
const board = useBoardStore()
const ui = useUiStore()
const dismissed = ref(false)
const key = computed(() => `retroboard:review:${board.roomId}`)
watch(key, (k) => {
  try { dismissed.value = sessionStorage.getItem(k) === '1' } catch { dismissed.value = false }
  if (dismissed.value) ui.reviewDone = true
}, { immediate: true })

const carried = computed(() => board.actions.filter((a) => a.carriedFrom !== null))
const pending = computed(() => carried.value.filter(isOpenAction))
/** All carried-over actions closed: one line instead of the list (change phase-transition-guidance). Frozen while the dialog is open, so ticking the last action does not swap the view under the pointer. */
const liveAllDone = computed(() => (board.snapshot ? reviewState(board.snapshot) === 'allDone' : false))
const frozenAllDone = ref<boolean | null>(null)
const allDone = computed(() => frozenAllDone.value ?? liveAllDone.value)
const inReview = computed(() => { const a = board.snapshot?.agenda ?? null; return agendaRunning(a) && a.phases[a.current]?.kind === 'review' })
const open = computed({
  // Waits for other dialogs (name, set-up) so it never stacks on top of them.
  get: () => !dismissed.value && board.ready && carried.value.length > 0 && ui.dialog === null && board.settings?.initialized === true,
  set: (v) => { if (!v) dismiss() },
})
watch(() => !dismissed.value && board.ready && carried.value.length > 0, (on) => { frozenAllDone.value = on ? liveAllDone.value : null }, { immediate: true })
function start() { dismiss(); board.commands.nextPhase() }
function dismiss() {
  dismissed.value = true
  ui.reviewDone = true
  try { sessionStorage.setItem(key.value, '1') } catch { /* memory only */ }
}
const QUICK: ActionStatus[] = ['done', 'doing', 'blocked', 'dropped']
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('review.title')" width="640px">
    <p v-if="allDone" class="done-line" data-testid="review-all-done"><Icon name="lucide:circle-check" aria-hidden="true" /> {{ t('review.allDone.title') }}</p>
    <p v-else class="muted">{{ t('review.intro') }}</p>
    <ul v-if="!allDone" class="list" data-testid="review-list">
      <li v-for="a in carried" :key="a.id" :data-status="a.status" :data-testid="`review-${a.id}`">
        <span class="txt"><strong>{{ a.text }}</strong><small class="muted">{{ a.owner || t('common.anonymous') }} · {{ t(`actions.status.${a.status}`) }}</small></span>
        <span class="quick" role="group" :aria-label="t('actions.statusOf', { text: a.text })">
          <button
            v-for="s in QUICK" :key="s" type="button" class="btn btn-sm" :class="{ on: a.status === s }" :aria-pressed="a.status === s"
            :data-testid="`review-${s}`" @click="board.commands.setActionStatus(a.id, s)"
          >{{ t(`actions.status.${s}`) }}</button>
        </span>
      </li>
    </ul>
    <template #footer>
      <span v-if="!allDone" class="muted" data-testid="review-open">{{ t('review.open', { n: pending.length }) }}</span>
      <button v-if="allDone && inReview && board.access.canSteer" class="btn btn-primary" type="button" data-testid="review-start" @click="start"><Icon name="lucide:pencil" /> {{ t('review.empty.start') }}</button>
      <button class="btn" :class="{ 'btn-primary': !(allDone && inReview && board.access.canSteer) }" type="button" data-testid="review-close" @click="dismiss"><Icon name="lucide:x" /> {{ t('common.close') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.done-line { display: flex; align-items: center; gap: var(--sp-2); margin: 0; font-weight: 700; color: var(--accent); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
li { display: grid; grid-template-columns: 1fr auto; gap: .6rem; align-items: center; padding: .55rem .6rem; border: 1px solid var(--border); border-radius: var(--r-control); }
.txt { display: grid; min-width: 0; overflow-wrap: anywhere; }
.quick { display: flex; gap: .25rem; flex-wrap: wrap; }
.quick .on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
@media (max-width: 560px) { li { grid-template-columns: 1fr; } }
</style>
