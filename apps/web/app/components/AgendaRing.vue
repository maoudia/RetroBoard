<script setup lang="ts">
import { ringProgress } from '@retroboard/application'
import { type AgendaState, phaseClock } from '@retroboard/domain'
const { t } = useT()

/**
 * Global countdown ring (change timeboxed-agenda): one arc per phase, sized by planned time,
 * with a small gap between phases. Finished phases are full, the current one fills as time
 * passes and turns to the danger colour in overtime. Click opens the phase panel.
 */
const board = useBoardStore()
const ui = useUiStore()
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 500) })
onBeforeUnmount(() => clearInterval(tick))

const agenda = computed(() => board.snapshot?.agenda as AgendaState)
const clock = computed(() => phaseClock(agenda.value, now.value + board.skew))
const rings = computed(() => ringProgress(agenda.value, now.value + board.skew))
/** Already in (or past) the close phase, or no close phase at all: nothing to jump to. */
const closing = computed(() => {
  const i = agenda.value.phases.findIndex((p) => p.kind === 'close')
  return i < 0 || agenda.value.current >= i
})
const pct = (n: number) => Math.round(n * 100)
const summary = computed(() => t('rings.summary', {
  outer: pct(rings.value.outer.fill), phase: caption.value, current: pct(rings.value.current?.fill ?? 0), over: rings.value.overtime ? t('rings.over') : '',
}))

const fmt = (ms: number) => {
  const s = Math.ceil(Math.abs(ms) / 1000)
  return `${ms < 0 ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const centre = computed(() => {
  const c = clock.value
  if (c.phase) return fmt(c.overtime ? -c.remainingMs : c.remainingMs)
  return agenda.value.current < 0 ? `${Math.round(c.totalPlannedMs / 60_000)} min` : t('agenda.done')
})
const phaseName = (kind: string) => t(`agenda.phase.${kind}` as never)
const caption = computed(() => (clock.value.phase ? phaseName(clock.value.phase.kind) : agenda.value.current < 0 ? t('agenda.notStarted') : t('agenda.ended')))

// Announce phase changes to screen readers (merged by the shared announcer).
const announcer = useLiveAnnouncer()
const GATED = [['note.addMany', 'write'], ['vote.add', 'vote'], ['note.group', 'group'], ['action.add', 'actions']] as const
const openSet = () => GATED.filter(([c]) => board.availability(c).closedBy === null).map(([, n]) => n)
let before = openSet()
watch(() => agenda.value.current, () => {
  const now = openSet()
  const list = (names: readonly string[]) => names.map((n) => t(`gated.noun.${n}` as never)).join(', ')
  const opened = now.filter((n) => !before.includes(n)); const closedNow = before.filter((n) => !now.includes(n))
  before = now
  if (!clock.value.phase) { announcer.collect({ kind: 'phase', phase: caption.value }); return }
  const detail = [opened.length ? t('gated.opened', { list: list(opened) }) : '', closedNow.length ? t('gated.closedList', { list: list(closedNow) }) : ''].filter(Boolean).join(' ')
  announcer.collect({ kind: 'phase', phase: phaseName(clock.value.phase.kind), ...(detail ? { detail } : {}) })
})

const borrow = ref(true)
const canSteer = computed(() => board.access.canSteer)
const started = computed(() => agenda.value.current >= 0 && agenda.value.current < agenda.value.phases.length)
const playing = computed(() => started.value && !clock.value.paused)
const minutes = (ms: number) => Math.round(ms / 60_000)
</script>

<template>
  <div class="clockrow">
  <Dropdown width="340px" align="start">
    <template #trigger="{ toggle, open }">
      <button
        class="ring" type="button" :aria-expanded="open"
        :class="{ over: clock.overtime, paused: clock.paused }" data-testid="agenda-ring" @click="toggle"
      >
        <ActivityRings :progress="rings" />
        <span class="txt">
          <span class="visually-hidden">{{ t('agenda.title') }}: {{ summary }} </span>
          <strong class="mono" data-testid="agenda-time">{{ centre }}</strong>
          <small data-testid="agenda-phase">{{ caption }}</small>
        </span>
      </button>
    </template>

    <div class="panel" data-testid="agenda-panel">
      <div class="big"><ActivityRings :progress="rings" :size="96" /></div>
      <ol class="phases">
        <li v-for="(p, i) in agenda.phases" :key="p.id" :class="{ now: i === agenda.current, past: i < agenda.current }" :aria-current="i === agenda.current ? 'step' : undefined" :data-testid="`phase-${i}`">
          <span class="nm">{{ phaseName(p.kind) }}</span>
          <span class="mono muted">
            <template v-if="i === agenda.current">{{ fmt(clock.remainingMs) }} / </template>{{ minutes(p.plannedMs) }} min
          </span>
        </li>
      </ol>
      <p v-if="clock.overtime && canSteer" class="note" role="status" data-testid="agenda-overtime">{{ t('agenda.overtime') }}</p>
      <div v-if="canSteer" class="ctl">
        <button v-if="!started || clock.paused" class="btn btn-sm btn-primary" type="button" data-testid="agenda-start" :disabled="agenda.current >= agenda.phases.length" @click="board.commands.startAgenda()">
          <Icon name="lucide:play" /> {{ t(agenda.current < 0 ? 'agenda.start' : 'agenda.resume') }}
        </button>
        <button v-else class="btn btn-sm" type="button" data-testid="agenda-pause" @click="board.commands.pauseAgenda()"><Icon name="lucide:pause" /> {{ t('agenda.pause') }}</button>
        <button class="btn btn-sm" type="button" data-testid="agenda-prev" :disabled="agenda.current <= 0" @click="board.commands.previousPhase()"><Icon name="lucide:skip-back" /> {{ t('agenda.prev') }}</button>
        <button class="btn btn-sm" type="button" data-testid="agenda-next" :disabled="!started" @click="board.commands.nextPhase()"><Icon name="lucide:skip-forward" /> {{ t('agenda.next') }}</button>
        <span class="ext">
          <button class="btn btn-sm" type="button" data-testid="agenda-plus1" :disabled="!started" @click="board.commands.extendPhase(1, borrow)">+1</button>
          <button class="btn btn-sm" type="button" data-testid="agenda-plus3" :disabled="!started" @click="board.commands.extendPhase(3, borrow)">+3</button>
        </span>
        <label class="borrow"><input v-model="borrow" type="checkbox" data-testid="agenda-borrow" /> {{ t('agenda.borrow') }}</label>
        <button class="btn btn-sm btn-ghost" type="button" data-testid="agenda-to-close" :disabled="!started || closing" :title="closing ? t('agenda.toClose.here') : undefined" @click="ui.open('toClose')"><Icon name="lucide:flag" /> {{ t('agenda.toClose.label') }}</button>
        <button class="btn btn-sm btn-ghost" type="button" data-testid="agenda-end" :disabled="!started" @click="board.commands.endAgenda()">{{ t('agenda.end') }}</button>
      </div>
      <p class="muted small">{{ t('agenda.total', { planned: minutes(clock.totalPlannedMs), elapsed: minutes(clock.totalElapsedMs) }) }}</p>
    </div>
  </Dropdown>
  <!-- Start or pause from the clock itself (facilitator-controls-v2): pausing stops the phase clock too. -->
  <button
    v-if="canSteer && agenda.current < agenda.phases.length" class="go" type="button" data-testid="agenda-toggle"
    :aria-label="t(playing ? 'agenda.pause' : agenda.current < 0 ? 'agenda.start' : 'agenda.resume')"
    :title="t(playing ? 'agenda.pause' : agenda.current < 0 ? 'agenda.start' : 'agenda.resume')"
    @click="playing ? board.commands.pauseAgenda() : board.commands.startAgenda()"
  ><Icon :name="playing ? 'lucide:pause' : 'lucide:play'" /></button>
  </div>
</template>

<style scoped>
.clockrow { display: inline-flex; align-items: center; gap: .4rem; }
.go { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border: 1px solid var(--accent); border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-size: 1.05rem; cursor: pointer; transition: transform .15s var(--ease); }
.go:hover { transform: scale(1.08); }
.ring { display: inline-flex; align-items: center; gap: .5rem; padding: .2rem .7rem .2rem .25rem; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text); cursor: pointer; }
.txt { display: grid; line-height: 1.1; text-align: left; }
.txt strong { font-size: 1.15rem; }
.txt small { font-size: .75rem; color: var(--muted); }
.over .txt strong { color: var(--danger); }
.paused .txt strong { opacity: .6; }
.panel { display: grid; gap: .6rem; padding: .25rem; }
.phases { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.phases li { display: flex; justify-content: space-between; gap: .5rem; padding: .3rem .5rem; border-radius: 8px; }
.phases li.now { background: var(--accent-soft); font-weight: 700; }
.phases li.past .nm { text-decoration: line-through; color: var(--muted); }
.ctl { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
.ext { display: inline-flex; gap: .25rem; }
.borrow { display: inline-flex; gap: .35rem; align-items: center; font-size: .85rem; }
.note { margin: 0; padding: .4rem .6rem; border-radius: 8px; background: color-mix(in oklab, var(--danger) 14%, transparent); color: var(--danger); font-weight: 600; }
.small { margin: 0; font-size: .8rem; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>

<style>
/* TV screens: the toolbar rings grow. Presenter mode zooms the columns only, never the toolbar (#228). */
@media (min-width: 2200px) { .ring .rings { width: 96px; height: 96px; } }
.panel .big { display: grid; justify-items: center; }
</style>
