<script setup lang="ts">
import { talkClock } from '@retroboard/domain'
const { t } = useT()
const board = useBoardStore()
const { push } = useToasts()

/**
 * The active speaking turn for everyone: a ring that empties with the budget and turns to the
 * overtime colour. Popup mode also announces the start and the end of the budget.
 */
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { now.value = Date.now() + board.skew }, 500) })
onBeforeUnmount(() => clearInterval(timer))

const mode = computed(() => board.settings?.talkMode ?? 'off')
const turn = computed(() => (mode.value === 'off' ? null : board.snapshot?.talk.active ?? null))
const clock = computed(() => (turn.value ? talkClock(turn.value, now.value) : null))
const name = computed(() => turn.value?.label ?? t('common.anonymous'))
const mine = computed(() => !!turn.value && turn.value.speaker === board.myKey)
const R = 16
const C = 2 * Math.PI * R
const dash = computed(() => (clock.value && turn.value ? C * Math.max(0, clock.value.remainingMs) / turn.value.budgetMs : C))
const mmss = (ms: number) => { const s = Math.ceil(Math.abs(ms) / 1000); return `${ms < 0 ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

// Popups: once per turn for the start, once when the budget runs out.
let announced = ''
let overtimeFor = ''
watch([turn, () => clock.value?.overtime], ([tu, over]) => {
  if (mode.value !== 'popup' || !tu) return
  const id = `${tu.speaker}:${tu.startedAt}`
  if (announced !== id) { announced = id; push(t('talk.started', { name: name.value, min: Math.round(tu.budgetMs / 60_000) }), 'info', 4000) }
  if (over && overtimeFor !== id) { overtimeFor = id; push(t('talk.timeUp', { name: name.value }), 'warn', 6000) }
})

const canEnd = computed(() => mine.value || board.access.canSteer)
const end = () => (mine.value ? board.commands.giveBackFloor() : board.commands.endTurn())
</script>

<template>
  <div v-if="turn && clock" class="talk glass" :class="{ over: clock.overtime }" role="status" data-testid="talk-banner" :data-overtime="clock.overtime">
    <svg class="ring" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <circle cx="20" cy="20" :r="R" class="track" />
      <circle cx="20" cy="20" :r="R" class="left" :stroke-dasharray="`${dash} ${C}`" />
      <text x="20" y="25" text-anchor="middle" class="ini">{{ name.slice(0, 1).toUpperCase() }}</text>
    </svg>
    <span class="who"><strong>{{ t('talk.speaking', { name }) }}</strong><small class="mono" data-testid="talk-time">{{ mmss(clock.remainingMs) }}</small></span>
    <button v-if="canEnd" class="btn btn-sm" type="button" data-testid="talk-end" @click="end">{{ t(mine ? 'talk.done' : 'talk.end') }}</button>
  </div>
</template>

<style scoped>
.talk { position: fixed; z-index: 45; left: 1rem; bottom: 1rem; display: flex; align-items: center; gap: .6rem; padding: .4rem .8rem .4rem .4rem; border-radius: 999px; border: 1px solid var(--border); box-shadow: var(--shadow-2); }
.ring { transform: rotate(-90deg); flex: none; }
.track { fill: var(--surface); stroke: var(--border); stroke-width: 4; }
.left { fill: none; stroke: var(--accent); stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray .5s linear; }
.over .left { stroke: var(--danger); }
.over { border-color: var(--danger); }
.ini { transform: rotate(90deg); transform-origin: 20px 20px; font-size: var(--fs-sm); font-weight: 800; fill: var(--text); }
.who { display: grid; line-height: 1.2; }
.who small { color: var(--muted); }
.over .who small { color: var(--danger); font-weight: 700; }
</style>
