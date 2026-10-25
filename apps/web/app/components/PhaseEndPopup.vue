<script setup lang="ts">
import type { PhaseEnded } from '~/composables/usePhaseEnd'
const props = defineProps<{ ended: PhaseEnded }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useT()

/**
 * Time is up (change phase-end-notifications): a floating alert dialog, not a modal. It never
 * pulls the focus out of a field being typed in; with nothing being edited the primary button
 * gets the focus so keyboard users reach it at once.
 */
const board = useBoardStore()
const slot = usePopupSlot()
const ID = 'phase-end'
const primary = ref<HTMLButtonElement | null>(null)

const name = (kind: string | null) => (kind ? t(`agenda.phase.${kind}` as never) : '')
const title = computed(() => (props.ended.source === 'agenda' ? t('phaseEnd.title', { phase: name(props.ended.phase) }) : t('phaseEnd.timer')))
const following = computed(() => {
  if (props.ended.source !== 'agenda') return ''
  return props.ended.next ? t('phaseEnd.next', { phase: name(props.ended.next) }) : t('phaseEnd.last')
})
const steer = computed(() => board.access.canSteer && props.ended.source === 'agenda')

function typing(): boolean {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.matches('input, textarea, select, [contenteditable="true"]'))
}
onMounted(async () => {
  slot.take(ID)
  await nextTick()
  if (!typing()) primary.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => slot.release(ID))

function next() { board.commands.nextPhase(); emit('close') }
function more() { board.commands.extendPhase(2, true); emit('close') }
</script>

<template>
  <aside class="end" role="alertdialog" aria-labelledby="phase-end-title" aria-describedby="phase-end-next" data-testid="phase-end" @keydown.esc="emit('close')">
    <Icon name="lucide:megaphone" class="mega" aria-hidden="true" />
    <div class="txt">
      <p id="phase-end-title" class="title">{{ title }}</p>
      <p id="phase-end-next" class="sub">{{ following }}</p>
    </div>
    <div class="row">
      <button v-if="steer && ended.next" ref="primary" class="btn btn-sm btn-primary" type="button" data-testid="phase-end-next" @click="next">{{ t('phaseEnd.nextPhase') }}</button>
      <button v-if="steer" class="btn btn-sm" type="button" data-testid="phase-end-more" @click="more">{{ t('phaseEnd.plus2') }}</button>
      <button :ref="(el) => { if (!(steer && ended.next)) primary = el as HTMLButtonElement }" class="btn btn-sm" type="button" data-testid="phase-end-ok" @click="emit('close')">{{ t('phaseEnd.ok') }}</button>
    </div>
  </aside>
</template>

<style scoped>
.end { position: fixed; z-index: 75; left: 50%; top: 84px; translate: -50% 0; width: min(30rem, calc(100vw - 32px)); display: grid; grid-template-columns: auto 1fr; gap: .4rem .8rem; align-items: center; padding: .9rem 1rem; border-radius: var(--r-card, 12px); background: var(--surface2); color: var(--text); border: 2px solid var(--accent); box-shadow: var(--shadow-2); }
.mega { font-size: 1.6rem; color: var(--accent); }
.title { margin: 0; font-weight: 700; }
.sub { margin: 0; color: var(--muted); font-size: .9rem; }
.row { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: .5rem; justify-content: flex-end; }
@media (prefers-reduced-motion: no-preference) { .end { animation: drop .25s ease-out; } }
@keyframes drop { from { opacity: 0; translate: -50% -12px; } }
</style>
