import { sampleAgenda, sampleCountdown, type TimerSample, timerEvents } from '@retroboard/application'
import type { AgendaState, PhaseKind } from '@retroboard/domain'

export interface PhaseEnded {
  /** Unique per occurrence, so the popup re-opens for a later run. */
  id: number
  source: 'agenda' | 'countdown'
  phase: PhaseKind | null
  next: PhaseKind | null
}

/**
 * Watches the agenda phase and the shared countdown once a second and reports when one ends
 * (change phase-end-notifications). Transitions only: nothing fires for a timer that was
 * already over when this tab loaded or reconnected.
 */
export function usePhaseEnd() {
  const board = useBoardStore()
  const ended = ref<PhaseEnded | null>(null)
  const warning = ref(0)
  let seq = 0
  let agendaPrev: TimerSample | null = null
  let countPrev: TimerSample | null = null
  let tick: ReturnType<typeof setInterval> | undefined

  function step() {
    const snap = board.snapshot
    if (!snap) { agendaPrev = null; countPrev = null; return }
    const now = Date.now() + board.skew
    const agenda = (snap.agenda ?? null) as AgendaState | null
    const a = sampleAgenda(agenda, now)
    for (const e of timerEvents(agendaPrev, a)) {
      if (e === 'warning') warning.value++
      else if (agenda) {
        ended.value = { id: ++seq, source: 'agenda', phase: agenda.phases[agenda.current]?.kind ?? null, next: agenda.phases[agenda.current + 1]?.kind ?? null }
      }
    }
    agendaPrev = a
    const c = sampleCountdown(snap.timer, now)
    for (const e of timerEvents(countPrev, c)) {
      if (e === 'warning') warning.value++
      else ended.value = { id: ++seq, source: 'countdown', phase: null, next: null }
    }
    countPrev = c
    // Time was added or the phase moved on: the popup is obsolete.
    if (ended.value?.source === 'agenda' && (!a || a.remainingMs > 0)) ended.value = null
  }

  onMounted(() => { tick = setInterval(step, 500) })
  onBeforeUnmount(() => clearInterval(tick))
  return { ended, warning, dismiss: () => { ended.value = null } }
}
