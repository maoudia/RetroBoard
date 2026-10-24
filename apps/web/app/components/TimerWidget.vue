<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import { confetti } from '~/utils/fx'
import { chime } from '~/utils/sound'
const { t } = useT()

const board = useBoardStore()
const theme = useThemeStore()
const settings = useSettingsStore()
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 250) })
onBeforeUnmount(() => clearInterval(tick))

const timer = computed(() => board.timer)
const remaining = computed(() => {
  const t = timer.value
  if (!t) return 0
  return t.running ? Math.max(0, t.endsAt - (now.value + board.skew)) : t.remaining
})
const label = computed(() => {
  const s = Math.ceil(remaining.value / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
const running = computed(() => !!timer.value?.running && remaining.value > 0)
const low = computed(() => running.value && remaining.value <= 30_000)
const ratio = computed(() => (timer.value ? Math.min(1, remaining.value / timer.value.length) : 1))

// Time is up: celebrate once per run.
const celebrated = ref(0)
const el = ref<HTMLElement | null>(null)
watch(remaining, (r) => {
  const t = timer.value
  if (t?.running && r === 0 && celebrated.value !== t.endsAt) {
    celebrated.value = t.endsAt
    if (settings.s.sound) chime()
    const rect = el.value?.getBoundingClientRect()
    if (rect) confetti(rect.left + rect.width / 2, rect.top + rect.height / 2, theme.theme.noteColors, 70)
    el.value?.classList.add('shake')
    setTimeout(() => el.value?.classList.remove('shake'), 700)
  }
})

const toggle = () => (running.value ? board.commands.pauseTimer() : board.commands.startTimer())
const reset = (minutes?: (typeof LIMITS.timerMinutes)[number]) => board.commands.resetTimer(minutes)
</script>

<template>
  <div ref="el" class="timer glass" role="group" :aria-label="t('timer.label')" :class="{ low, running }" :style="{ '--p': ratio }">
    <span class="clock mono" role="timer" data-testid="clock">{{ label }}</span>
    <button class="mini-btn go" type="button" :aria-label="running ? t('timer.pause') : t('timer.start')" data-testid="timer-toggle" @click="toggle">
      <Icon :name="running ? 'lucide:pause' : 'lucide:play'" />
    </button>
    <Dropdown align="start" width="150px">
      <template #trigger="{ toggle: tg, open }">
        <button class="mini-btn" type="button" :aria-label="t('timer.menu')" :aria-expanded="open" data-testid="timer-menu" @click="tg"><Icon name="lucide:rotate-ccw" /></button>
      </template>
      <template #default="{ close }">
        <span class="lbl-sm muted">{{ t('timer.resetTo') }}</span>
        <button v-for="m in LIMITS.timerMinutes" :key="m" class="dd-item" type="button" role="menuitem" @click="reset(m); close()">{{ t('timer.minutes', { n: m }) }}</button>
      </template>
    </Dropdown>
    <span class="bar" aria-hidden="true" />
  </div>
</template>

<style scoped>
.timer { position: relative; display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .5rem .3rem .9rem; border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
.clock { font-size: 1.55rem; font-weight: 700; min-width: 3.4ch; text-align: center; letter-spacing: .02em; }
.go { background: var(--accent); color: var(--accent-ink); width: 34px; height: 34px; border-radius: 50%; }
.go:hover { background: var(--accent); filter: brightness(1.1); }
.running .clock { color: var(--accent); }
.low .clock { color: var(--danger); animation: pulse-ring 1s infinite; border-radius: 8px; }
.bar { position: absolute; left: 0; bottom: 0; height: 3px; width: calc(var(--p) * 100%); background: var(--accent); transition: width .25s linear; opacity: .8; }
.low .bar { background: var(--danger); }
.lbl-sm { font-size: .72rem; font-weight: 700; padding: .2rem .65rem; text-transform: uppercase; letter-spacing: .05em; }
</style>
