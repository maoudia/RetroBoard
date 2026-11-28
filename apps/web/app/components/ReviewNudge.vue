<script setup lang="ts">
import { reviewState } from '@retroboard/application'
import { agendaRunning, phaseClock } from '@retroboard/domain'
const { t } = useT()

/**
 * Empty Previous actions phase (change phase-transition-guidance): a calm card, then once a toast, that
 * propose the next phase. Nothing advances by itself. It is a state, not an event: a tab that loads in
 * the middle of the phase shows it too, and it goes away when the phase changes.
 */
const board = useBoardStore()
const ui = useUiStore()
const { push, dismiss: dismissToast } = useToasts()

const TOAST_AFTER_MS = 6000
const agenda = computed(() => board.snapshot?.agenda ?? null)
const phase = computed(() => (agendaRunning(agenda.value) ? agenda.value.phases[agenda.value.current] ?? null : null))
const state = computed(() => (board.snapshot ? reviewState(board.snapshot) : 'open'))
const dismissedKey = computed(() => (phase.value ? `retroboard:review-nudge:${board.roomId}:${phase.value.id}` : ''))
const dismissed = ref(false)
watch(dismissedKey, (k) => { try { dismissed.value = !!k && sessionStorage.getItem(k) === '1' } catch { dismissed.value = false } }, { immediate: true })

/** The all-done line of the review dialog comes first; the card follows once that dialog is closed. */
const wanted = computed(() => phase.value?.kind === 'review' && (state.value === 'none' || (state.value === 'allDone' && ui.reviewDone)))
const shown = computed(() => board.ready && wanted.value && !dismissed.value)
const canSteer = computed(() => board.access.canSteer)

/** Whole minutes kept by moving on (only when more than one is left). */
const keptMin = ref(0)
function refreshKept() {
  if (!agendaRunning(agenda.value)) { keptMin.value = 0; return }
  const left = phaseClock(agenda.value, Date.now() + board.skew).remainingMs
  keptMin.value = left > 60_000 ? Math.floor(left / 60_000) : 0
}

function start() {
  closeToast()
  board.commands.nextPhase()
}
function dismiss() {
  dismissed.value = true
  closeToast()
  try { if (dismissedKey.value) sessionStorage.setItem(dismissedKey.value, '1') } catch { /* memory only */ }
}

let toastId: number | null = null
let timer: ReturnType<typeof setTimeout> | undefined
function closeToast() { if (toastId !== null) dismissToast(toastId); toastId = null }
function disarm() { clearTimeout(timer); timer = undefined; closeToast() }
watch(shown, (on) => {
  disarm()
  if (!on) return
  refreshKept()
  // The second, lighter suggestion: once, only for people who can act on it.
  if (canSteer.value) timer = setTimeout(() => { toastId = push(t('review.empty.title'), 'info', 12000, { label: t('review.empty.start'), run: start, testid: 'review-nudge-toast-start' }) }, TOAST_AFTER_MS)
}, { immediate: true })
onBeforeUnmount(disarm)

/** Escape is ours only when nothing else holds the focus: the page itself, the card, or an empty writing field (never a popover or a field with text). */
function mine(el: EventTarget | null) {
  if (!(el instanceof HTMLElement) || el === document.body) return true
  if (el.closest('[data-testid="review-nudge"]')) return true
  return el instanceof HTMLTextAreaElement && el.value === '' && !!el.closest('[data-writing-area]')
}
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !shown.value || ui.dialog !== null || !mine(e.target)) return
  dismiss()
}
onMounted(() => document.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey, true))
</script>

<template>
  <section v-if="shown" class="nudge" role="status" aria-live="polite" :data-state="state" data-testid="review-nudge">
    <Icon name="lucide:circle-check" class="ico" aria-hidden="true" />
    <div class="txt">
      <strong data-testid="review-nudge-title">{{ state === 'allDone' ? t('review.allDone.title') : t('review.empty.title') }}</strong>
      <small v-if="canSteer && keptMin > 0" class="muted" data-testid="review-nudge-saved">{{ t('review.empty.saved', { n: keptMin }) }}</small>
      <small v-else-if="!canSteer" class="muted" data-testid="review-nudge-wait">{{ t('review.empty.wait') }}</small>
    </div>
    <button v-if="canSteer" class="btn btn-primary" type="button" data-testid="review-nudge-start" @click="start"><Icon name="lucide:pencil" /> {{ t('review.empty.start') }}</button>
    <button class="mini-btn" type="button" :aria-label="t('review.empty.dismiss')" :title="t('review.empty.dismiss')" data-testid="review-nudge-dismiss" @click="dismiss"><Icon name="lucide:x" /></button>
  </section>
</template>

<style scoped>
.nudge { display: flex; align-items: center; gap: var(--sp-3); margin: var(--sp-2) auto; padding: var(--sp-2) var(--sp-3); width: min(100% - 2rem, 40rem); box-sizing: border-box; border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); color: var(--text); }
.ico { flex: none; color: var(--accent); font-size: var(--fs-xl); }
.txt { display: grid; min-width: 0; flex: 1; overflow-wrap: anywhere; }
.txt small { font-size: var(--fs-sm); }
@media (max-width: 600px) { .nudge { flex-wrap: wrap; width: calc(100% - 2rem); } .nudge .btn-primary { order: 3; width: 100%; justify-content: center; } }
@media (min-width: 2200px) { .nudge { width: min(100% - 4rem, 40rem); font-size: var(--fs-lg); } }
</style>
