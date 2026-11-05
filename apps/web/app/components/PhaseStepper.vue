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
  <nav v-if="s && agenda" class="stepper" :class="{ ended: s.ended }" :aria-label="t('stepper.label')" data-testid="stepper">
    <p class="line" data-testid="stepper-line" :data-mode="settings.s.stepperTime">
      <!-- Only a running phase has a figure to switch; "finished" and "not started" are plain text. -->
      <span v-if="s.ended" class="now done" :title="line" data-testid="stepper-mode"><Icon name="lucide:circle-check" aria-hidden="true" /><span class="visually-hidden">{{ line }}</span></span>
      <span v-else-if="!label" class="now" data-testid="stepper-mode">{{ line }}</span>
      <button v-else class="now modebtn" :class="{ over: overtime }" type="button" :title="t('stepper.mode')" :aria-label="`${line} - ${t('stepper.mode')}`" data-testid="stepper-mode" @click="toggleMode">{{ line }}</button>
      <strong v-if="overText" class="overtxt" role="status" data-testid="stepper-over">{{ overText }}</strong>
      <span v-if="s.next && !s.ended" class="next muted" data-testid="stepper-next">{{ t('stepper.next', { phase: name(s.next) }) }}</span>
    </p>
    <ol class="segs">
      <li
        v-for="(p, i) in s.steps" :key="p.id" class="seg" :class="[p.state, { over: p.state === 'current' && overtime }]" :style="{ flexGrow: p.plannedMs }"
        :aria-current="p.state === 'current' ? 'step' : undefined" :data-testid="`step-${i}`" :data-state="p.state"
      >
        <span class="bar" aria-hidden="true"><span class="fill" :style="{ width: `${Math.round(p.fill * 100)}%` }" /></span>
        <!-- A click on a segment names the phase and tells the real time spent in it (change agenda-clock-v2). -->
        <Dropdown align="start" width="200px">
          <template #trigger="{ toggle, open }">
            <button class="hit" type="button" :aria-expanded="open" :aria-label="t('stepper.segment', { phase: name(p.kind) })" :data-testid="`step-btn-${i}`" @click="toggle" />
          </template>
          <div class="pop" :data-testid="`step-pop-${i}`">
            <strong>{{ name(p.kind) }}</strong>
            <span v-if="p.skipped" class="muted">{{ t('stepper.skipped') }}</span>
            <span v-else-if="p.spentMs === null" class="muted">{{ t('stepper.todo') }}</span>
            <span v-else class="mono">{{ t('stepper.spent', { time: timeLabel(p.plannedMs, p.spentMs, 'elapsed').text }) }}</span>
            <span class="muted small">{{ t('stepper.planned', { n: Math.round(p.plannedMs / 60_000) }) }}</span>
          </div>
        </Dropdown>
      </li>
    </ol>
    <!-- Call to action (change hotfix-ux-wave8): the bar is a control, this button says so and lists every step, also on a phone where there is no hover. -->
    <Dropdown class="info-dd" align="end" width="230px">
      <template #trigger="{ toggle, open }">
        <button class="info" type="button" :aria-expanded="open" :aria-label="t('stepper.info')" :title="t('stepper.info')" data-testid="stepper-info" @click="toggle"><Icon :name="s.ended ? 'lucide:circle-check' : 'lucide:list-ordered'" /></button>
      </template>
      <ul class="all" data-testid="stepper-all">
        <li v-for="p in s.steps" :key="p.id" :data-state="p.state" :class="{ cur: p.state === 'current' }">
          <span class="dot" aria-hidden="true" />
          <span class="nm">{{ name(p.kind) }}</span>
          <span class="muted small mono">{{ p.skipped ? t('stepper.skipped') : p.spentMs === null ? t('stepper.planned', { n: Math.round(p.plannedMs / 60_000) }) : timeLabel(p.plannedMs, p.spentMs, 'elapsed').text }}</span>
        </li>
      </ul>
    </Dropdown>
  </nav>
</template>

<style scoped>
/* One row (change hotfix-ux-wave8): the phase and its time sit in front of the bar, the step list behind it; no second line. */
nav.stepper.stepper { display: flex; align-items: center; gap: .6rem; padding: 0 1rem; border-bottom: 1px solid var(--border); background: var(--surface); }
.segs { display: flex; flex: 1 1 0; min-width: 0; gap: 3px; margin: 0; padding: 12px 0; list-style: none; }
.seg { position: relative; flex-basis: 0; min-width: 24px; height: 8px; } /* 24 px: a touch target (WCAG 2.5.8) */
.seg:hover .bar, .seg:focus-within .bar { transform: scaleY(1.7); }
.bar { transition: transform .15s; }
.info { display: grid; place-items: center; flex: none; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 999px; background: none; color: var(--muted); cursor: pointer; }
.info:hover, .info[aria-expanded='true'] { background: var(--accent-soft); color: var(--accent); }
.info:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.all { list-style: none; margin: 0; padding: .2rem; display: grid; gap: 2px; font-size: var(--fs-sm); }
.all li { display: grid; grid-template-columns: auto 1fr auto; gap: .5rem; align-items: center; padding: .3rem .4rem; border-radius: var(--r-sm); }
.all li.cur { background: var(--accent-soft); font-weight: 700; }
.all .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); }
.all li[data-state='done'] .dot, .all li.cur .dot { background: var(--accent); }
.now.done { display: inline-flex; color: var(--accent); font-size: var(--fs-lg); }
.bar { position: absolute; inset: 0; border-radius: 999px; background: var(--border); overflow: hidden; }
.seg.current .bar { background: color-mix(in oklab, var(--accent) 25%, var(--border)); }
/* The hit area is 24px tall (WCAG 2.5.8) around a 6px bar. */
.seg :deep(.dd) { position: absolute; inset: -12px -1px; display: block; }
.hit { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; }
.hit:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-radius: var(--r-xs); }
.pop { display: grid; gap: .2rem; padding: .35rem .5rem; font-size: var(--fs-sm); }
.small { font-size: var(--fs-xs); }
.fill { position: absolute; inset: 0 auto 0 0; background: var(--accent); transition: width .5s linear; }
.seg.done .fill { background: color-mix(in oklab, var(--accent) 70%, var(--border)); }
.line { display: flex; flex: 0 1 auto; min-width: 0; max-width: 55%; gap: .25rem .75rem; align-items: baseline; margin: 0; font-size: var(--fs-xs); white-space: nowrap; }
.line .now { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.now { font-weight: 700; }
.modebtn { display: inline-flex; align-items: center; min-height: 24px; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.modebtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-xs); }
.over { color: var(--ring-over); }
.overtxt { color: var(--ring-over); }
.seg.over .fill { background: var(--ring-over); }
.seg.over .bar { background: color-mix(in oklab, var(--ring-over) 25%, var(--border)); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 720px) { .next { display: none; } }
/* Phones: the bar keeps the whole width (its steps are touch targets), the phase line goes under it, and a finished agenda has no line at all. */
@media (max-width: 600px) {
  nav.stepper.stepper { flex-wrap: wrap; row-gap: 0; }
  .segs { order: 1; }
  .info-dd { order: 2; }
  .line { order: 3; flex: 1 1 100%; max-width: none; padding-bottom: .3rem; }
  .ended .line { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); }
}
@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }
</style>
