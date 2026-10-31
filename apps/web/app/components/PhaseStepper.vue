<script setup lang="ts">
import { phaseStepper } from '@retroboard/application'
import type { AgendaState } from '@retroboard/domain'
const { t } = useT()

/**
 * Phase stepper (change board-activity-feed): the agenda as a thin step progress under the toolbar.
 * Segments are sized by planned time; earlier phases are done, the running one fills up.
 */
const board = useBoardStore()
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(tick))

const agenda = computed(() => (board.snapshot?.agenda ?? null) as AgendaState | null)
const s = computed(() => (agenda.value ? phaseStepper(agenda.value, now.value + board.skew) : null))
const name = (kind: string) => t(`agenda.phase.${kind}` as never)
const fmt = (ms: number) => {
  const sec = Math.ceil(Math.abs(ms) / 1000)
  return `${ms < 0 ? '+' : ''}${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
const line = computed(() => {
  const v = s.value
  if (!v) return ''
  if (v.ended) return t('agenda.ended')
  if (!v.current) return v.next ? t('stepper.notStarted', { phase: name(v.next) }) : ''
  const left = v.current.overtime ? t('stepper.over', { time: fmt(v.current.remainingMs) }) : t('stepper.left', { time: fmt(v.current.remainingMs) })
  return `${name(v.current.kind)} · ${left}${v.current.paused ? ` · ${t('stepper.paused')}` : ''}`
})
</script>

<template>
  <nav v-if="s && agenda" class="stepper" :aria-label="t('stepper.label')" data-testid="stepper">
    <ol class="segs">
      <li
        v-for="(p, i) in s.steps" :key="p.id" class="seg" :class="p.state" :style="{ flexGrow: p.plannedMs }"
        :aria-current="p.state === 'current' ? 'step' : undefined" :data-testid="`step-${i}`" :data-state="p.state"
      >
        <span class="fill" :style="{ width: `${Math.round(p.fill * 100)}%` }" />
        <span class="visually-hidden">{{ name(p.kind) }}</span>
      </li>
    </ol>
    <p class="line" data-testid="stepper-line">
      <span class="now">{{ line }}</span>
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
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 720px) { .next { display: none; } }
@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }
</style>
