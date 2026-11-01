<script setup lang="ts">
import { phaseStepper, timeLabel } from '@retroboard/application'
import type { AgendaState } from '@retroboard/domain'
const { t } = useT()

/**
 * Phase stepper (change board-activity-feed): the agenda as a thin step progress under the toolbar.
 * Segments are sized by planned time; earlier phases are done, the running one fills up.
 */
const board = useBoardStore()
const settings = useSettingsStore()
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(tick))

const agenda = computed(() => (board.snapshot?.agenda ?? null) as AgendaState | null)
const s = computed(() => (agenda.value ? phaseStepper(agenda.value, now.value + board.skew) : null))
const name = (kind: string) => t(`agenda.phase.${kind}` as never)
const label = computed(() => (s.value?.current ? timeLabel(s.value.current.plannedMs, s.value.current.elapsedMs, settings.s.stepperTime) : null))
const overtime = computed(() => !!label.value?.overtime)
/** Phase name and the figure the person chose; in overtime the excess is spelled out as well (red). */
const line = computed(() => {
  const v = s.value
  if (!v) return ''
  if (v.ended) return t('agenda.ended')
  if (!v.current || !label.value) return v.next ? t('stepper.notStarted', { phase: name(v.next) }) : ''
  const time = t(settings.s.stepperTime === 'elapsed' ? 'stepper.elapsed' : 'stepper.left', { time: label.value.text })
  return `${name(v.current.kind)} · ${time}${v.current.paused ? ` · ${t('stepper.paused')}` : ''}`
})
const overText = computed(() => (label.value?.over ? t('stepper.over', { time: label.value.over }) : ''))
const toggleMode = () => settings.patch({ stepperTime: settings.s.stepperTime === 'elapsed' ? 'remaining' : 'elapsed' })
</script>

<template>
  <nav v-if="s && agenda" class="stepper" :aria-label="t('stepper.label')" data-testid="stepper">
    <ol class="segs">
      <li
        v-for="(p, i) in s.steps" :key="p.id" class="seg" :class="[p.state, { over: p.state === 'current' && overtime }]" :style="{ flexGrow: p.plannedMs }"
        :aria-current="p.state === 'current' ? 'step' : undefined" :data-testid="`step-${i}`" :data-state="p.state"
      >
        <span class="fill" :style="{ width: `${Math.round(p.fill * 100)}%` }" />
        <span class="visually-hidden">{{ name(p.kind) }}</span>
      </li>
    </ol>
    <p class="line" data-testid="stepper-line" :data-mode="settings.s.stepperTime">
      <button class="now modebtn" :class="{ over: overtime }" type="button" :title="t('stepper.mode')" :aria-label="`${line} - ${t('stepper.mode')}`" data-testid="stepper-mode" @click="toggleMode">{{ line }}</button>
      <strong v-if="overText" class="overtxt" role="status" data-testid="stepper-over">{{ overText }}</strong>
      <span v-if="s.next && !s.ended" class="next muted" data-testid="stepper-next">{{ t('stepper.next', { phase: name(s.next) }) }}</span>
    </p>
  </nav>
</template>

<style scoped>
nav.stepper.stepper { display: grid; gap: .25rem; padding: .3rem 1rem .35rem; border-bottom: 1px solid var(--border); background: var(--surface); }
.segs { display: flex; gap: 3px; margin: 0; padding: 0; list-style: none; }
.seg { position: relative; flex-basis: 0; min-width: 6px; height: 6px; border-radius: 999px; background: var(--border); overflow: hidden; }
.seg.current { background: color-mix(in oklab, var(--accent) 25%, var(--border)); }
.fill { position: absolute; inset: 0 auto 0 0; background: var(--accent); transition: width .5s linear; }
.seg.done .fill { background: color-mix(in oklab, var(--accent) 70%, var(--border)); }
.line { display: flex; flex-wrap: wrap; gap: .25rem 1rem; align-items: baseline; margin: 0; font-size: var(--fs-xs); }
.now { font-weight: 700; }
.modebtn { padding: 0; border: 0; background: none; color: inherit; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.modebtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-xs); }
.over { color: var(--ring-over); }
.overtxt { color: var(--ring-over); }
.seg.over .fill { background: var(--ring-over); }
.seg.over { background: color-mix(in oklab, var(--ring-over) 25%, var(--border)); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 720px) { .next { display: none; } }
@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }
</style>
