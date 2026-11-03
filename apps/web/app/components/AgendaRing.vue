<script setup lang="ts">
import { mmss, ringProgress, timeLabel } from '@retroboard/application'
import { type AgendaState, phaseClock } from '@retroboard/domain'
const { t } = useT()

/**
 * Global countdown ring (change timeboxed-agenda): one arc per phase, sized by planned time,
 * with a small gap between phases. Finished phases are full, the current one fills as time
 * passes and turns to the danger colour in overtime. Click opens the phase panel.
 */
const board = useBoardStore()
const settings = useSettingsStore()
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
/** Inner ring: one segment per phase, done ones lit (change toast-notifications-v2). */
const steps = computed(() => ({ count: agenda.value.phases.length, done: Math.max(0, Math.min(agenda.value.phases.length, agenda.value.current)), current: agenda.value.current >= 0 && agenda.value.current < agenda.value.phases.length ? agenda.value.current : -1 }))
const pct = (n: number) => Math.round(n * 100)
const summary = computed(() => t('rings.summary', {
  outer: pct(rings.value.outer.fill), phase: caption.value, current: pct(rings.value.current?.fill ?? 0), over: rings.value.overtime ? t('rings.over') : '',
}))

const fmt = (ms: number) => {
  const s = Math.ceil(Math.abs(ms) / 1000)
  return `${ms < 0 ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
/** The whole retro, as chosen: time left (default) or time elapsed. The phase bar says the complementary thing. */
const centre = computed(() => {
  const c = clock.value
  if (c.phase) return timeLabel(c.totalPlannedMs, c.totalElapsedMs, settings.s.ringTime).text
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
/** Elapsed total: minutes while short, then "1h05" or "2d" (change ux-irritants-wave-2). */
const spent = (ms: number) => (ms < 180 * 60_000 ? `${minutes(ms)} min` : mmss(ms))
</script>

<template>
  <div class="clockrow">
  <Dropdown width="340px" align="start" tall>
    <template #trigger="{ toggle, open }">
      <button
        class="ring" type="button" :aria-expanded="open"
        :class="{ over: clock.overtime, paused: clock.paused }" data-testid="agenda-ring" @click="toggle"
      >
        <ActivityRings :progress="rings" :steps="steps" />
        <span class="txt">
          <span class="visually-hidden">{{ t('agenda.title') }}: {{ summary }} </span>
          <strong class="mono" data-testid="agenda-time">{{ centre }}</strong>
          <small data-testid="agenda-phase">{{ caption }}</small>
        </span>
      </button>
    </template>

    <div class="panel" data-testid="agenda-panel">
      <!-- Player: the rings are the cover, the centre is the play button (facilitators), the chapters are the phases. -->
      <div class="deck">
        <div class="cover">
          <ActivityRings :progress="rings" :steps="steps" :size="132" />
          <button
            v-if="canSteer && agenda.current < agenda.phases.length" class="play" type="button" :data-testid="playing ? 'agenda-pause' : 'agenda-start'"
            :aria-label="t(playing ? 'agenda.pause' : agenda.current < 0 ? 'agenda.start' : 'agenda.resume')" :title="t(playing ? 'agenda.pause' : agenda.current < 0 ? 'agenda.start' : 'agenda.resume')"
            @click="playing ? board.commands.pauseAgenda() : board.commands.startAgenda()"
          ><Icon :name="playing ? 'lucide:pause' : 'lucide:play'" /></button>
        </div>
        <div class="legend" aria-hidden="true">
          <span class="lg l1"><i />{{ t('rings.legend.total') }}</span>
          <span class="lg l2"><i />{{ t('rings.legend.phase') }}</span>
          <span class="lg l3"><i />{{ t('rings.legend.steps', { done: steps.done, count: steps.count }) }}</span>
        </div>
      </div>
      <ol class="phases">
        <li v-for="(p, i) in agenda.phases" :key="p.id" :class="{ now: i === agenda.current, past: i < agenda.current }" :aria-current="i === agenda.current ? 'step' : undefined" :data-testid="`phase-${i}`">
          <Icon :name="i < agenda.current ? 'lucide:circle-check' : i === agenda.current ? 'lucide:circle-dot' : 'lucide:circle'" class="pi" />
          <span class="nm">{{ phaseName(p.kind) }}</span>
          <span class="mono muted">
            <template v-if="i === agenda.current">{{ fmt(clock.remainingMs) }} / </template>{{ minutes(p.plannedMs) }} min
          </span>
        </li>
      </ol>
      <p v-if="clock.capped" class="note" role="status" data-testid="agenda-capped"><Icon name="lucide:octagon-x" /> {{ t('agenda.capped') }}</p>
      <p v-else-if="clock.overtime && canSteer" class="note" role="status" data-testid="agenda-overtime">{{ t('agenda.overtime') }}</p>
      <!-- Transport bar: icons only, names for assistive tech. -->
      <div v-if="canSteer" class="transport" role="group" :aria-label="t('agenda.title')">
        <button class="tb" type="button" data-testid="agenda-prev" :disabled="agenda.current <= 0" :title="t('agenda.prev')" @click="board.commands.previousPhase()"><Icon name="lucide:skip-back" /><span class="sr-only">{{ t('agenda.prev') }}</span></button>
        <button class="tb" type="button" data-testid="agenda-plus1" :disabled="!started" :title="t('agenda.plus', { n: 1 })" @click="board.commands.extendPhase(1, borrow)"><Icon name="lucide:plus" /><span aria-hidden="true">1</span><span class="sr-only">{{ t('agenda.plus', { n: 1 }) }}</span></button>
        <button class="tb" type="button" data-testid="agenda-plus3" :disabled="!started" :title="t('agenda.plus', { n: 3 })" @click="board.commands.extendPhase(3, borrow)"><Icon name="lucide:plus" /><span aria-hidden="true">3</span><span class="sr-only">{{ t('agenda.plus', { n: 3 }) }}</span></button>
        <button class="tb" type="button" data-testid="agenda-next" :disabled="!started" :title="t('agenda.next')" @click="board.commands.nextPhase()"><Icon name="lucide:skip-forward" /><span class="sr-only">{{ t('agenda.next') }}</span></button>
      </div>
      <div class="opts">
        <label class="borrow" :title="t('agenda.borrow')"><Icon name="lucide:arrow-right-left" /><span class="sr-only">{{ t('agenda.borrow') }}</span><input v-if="canSteer" v-model="borrow" type="checkbox" role="switch" class="switch" data-testid="agenda-borrow" /></label>
        <button class="tb" type="button" :aria-pressed="settings.s.ringTime === 'elapsed'" :title="t(`profile.time.${settings.s.ringTime}` as never)" data-testid="ring-mode" @click="settings.patch({ ringTime: settings.s.ringTime === 'elapsed' ? 'remaining' : 'elapsed' })">
          <Icon :name="settings.s.ringTime === 'elapsed' ? 'lucide:timer' : 'lucide:hourglass'" /><span class="sr-only">{{ t(`profile.time.${settings.s.ringTime}` as never) }}</span>
        </button>
        <span class="total mono muted" :title="t('agenda.total', { planned: `${minutes(clock.totalPlannedMs)} min`, elapsed: spent(clock.totalElapsedMs) })">{{ spent(clock.totalElapsedMs) }} / {{ minutes(clock.totalPlannedMs) }} min</span>
      </div>
      <!-- The two ways out, the same kind of button: skip to the closing phase, or end the retro. -->
      <div v-if="canSteer" class="exits">
        <button class="btn btn-sm exit" type="button" data-testid="agenda-to-close" :disabled="!started || closing" :title="closing ? t('agenda.toClose.here') : undefined" @click="ui.open('toClose')"><Icon name="lucide:flag" /> {{ t('agenda.toClose.label') }}</button>
        <button class="btn btn-sm exit danger" type="button" data-testid="agenda-end" :disabled="!started" @click="board.commands.endAgenda()"><Icon name="lucide:square" /> {{ t('agenda.end') }}</button>
      </div>
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
/* The ring and the start button sit centred in the round ends of the pill: equal margin around the ring, the button centred on the right cap. */
.clockrow { --pad: .3rem; display: inline-flex; align-items: center; gap: .4rem; padding: var(--pad) calc(var(--pad) + (var(--ring-size, 56px) - 36px) / 2) var(--pad) var(--pad); border: 1px solid var(--border); border-radius: var(--r-pill); background: var(--surface); }
.go { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border: 1px solid var(--accent); border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-size: var(--fs-md); cursor: pointer; transition: transform .15s var(--ease); }
.go:hover { transform: scale(1.08); }
.ring { display: inline-flex; align-items: center; gap: .6rem; padding: 0; border: 0; border-radius: var(--r-pill); background: transparent; color: var(--text); cursor: pointer; }
.txt { display: grid; line-height: 1.1; text-align: left; }
.txt strong { font-size: var(--fs-lg); }
.txt small { font-size: var(--fs-xs); color: var(--muted); }
.over .txt strong { color: var(--danger); }
.paused .txt strong { opacity: .6; }
.panel { display: grid; gap: .75rem; padding: .35rem; }
.deck { display: grid; justify-items: center; gap: .5rem; }
.cover { position: relative; display: grid; place-items: center; }
.play { position: absolute; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; border: 0; background: var(--accent); color: var(--accent-ink); font-size: var(--fs-xl); cursor: pointer; box-shadow: var(--shadow-1); transition: transform .15s var(--ease); }
.play:hover { transform: scale(1.08); }
.legend { display: flex; flex-wrap: wrap; justify-content: center; gap: .25rem .9rem; font-size: var(--fs-xs); color: var(--muted); }
.lg { display: inline-flex; align-items: center; gap: .35rem; }
.lg i { width: 9px; height: 9px; border-radius: 50%; background: var(--ring-1); }
.lg.l2 i { background: var(--ring-2); }
.lg.l3 i { background: var(--ring-3); }
.phases { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.phases li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .5rem; padding: .3rem .5rem; border-radius: var(--r-sm); }
.phases li.now { background: var(--accent-soft); font-weight: 700; }
.phases li.past .nm { color: var(--muted); }
.phases .pi { color: var(--muted); }
.phases li.now .pi, .phases li.past .pi { color: var(--accent); }
/* One family of round icon buttons, like a media player. */
.transport { display: flex; justify-content: center; gap: .5rem; }
.tb { display: inline-flex; align-items: center; justify-content: center; gap: .1rem; min-width: 42px; height: 42px; padding: 0 .6rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font: inherit; font-weight: 700; cursor: pointer; }
.tb:hover:not(:disabled) { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.tb:disabled { opacity: .45; cursor: default; }
.tb[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
.opts { display: flex; align-items: center; gap: .6rem; }
.opts .total { margin-inline-start: auto; font-size: var(--fs-sm); }
.borrow { display: inline-flex; align-items: center; gap: .4rem; color: var(--muted); }
.exits { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
.exit { justify-content: center; min-height: 40px; }
.exit.danger { color: var(--danger); border-color: color-mix(in oklab, var(--danger) 55%, var(--border)); }
.exit.danger:hover:not(:disabled) { background: color-mix(in oklab, var(--danger) 14%, transparent); }
.note { margin: 0; padding: .4rem .6rem; border-radius: var(--r-sm); background: color-mix(in oklab, var(--danger) 14%, transparent); color: var(--danger); font-weight: 600; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>

<style>
/* TV screens: the toolbar rings grow. Presenter mode zooms the columns only, never the toolbar (#228). */
@media (min-width: 2200px) { :root { --ring-size: 96px; } .ring .rings { width: 96px; height: 96px; } }
</style>
