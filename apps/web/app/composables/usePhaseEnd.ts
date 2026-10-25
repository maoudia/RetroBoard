import { sampleAgenda, sampleCountdown, type TimerSample, timerEvents } from '@retroboard/application'
import type { AgendaState, PhaseKind } from '@retroboard/domain'
import { chime } from '~/utils/sound'
import { systemNotify } from '~/utils/system-notify'

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
  const settings = useSettingsStore()
  const { push } = useToasts()
  const { t } = useT()
  const announcer = useLiveAnnouncer()
  const ended = ref<PhaseEnded | null>(null)
  const phaseName = (kind: PhaseKind | null) => (kind ? t(`agenda.phase.${kind}` as never) : '')

  function warn(kind: PhaseKind | null) {
    if (!settings.s.phaseWarning) return
    push(kind ? t('phaseEnd.warningFor', { phase: phaseName(kind) }) : t('phaseEnd.warning'), 'warn', 5000)
  }
  function announce(e: PhaseEnded) {
    ended.value = e
    const title = e.source === 'agenda' ? t('phaseEnd.title', { phase: phaseName(e.phase) }) : t('phaseEnd.timer')
    const next = e.next ? t('phaseEnd.next', { phase: phaseName(e.next) }) : ''
    announcer.assertive(next ? `${title}. ${next}` : title)
    if (settings.s.sound) chime()
    if (settings.s.systemNotify) systemNotify(title, next)
  }
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
      if (e === 'warning') warn(agenda?.phases[agenda.current]?.kind ?? null)
      else if (agenda) {
        announce({ id: ++seq, source: 'agenda', phase: agenda.phases[agenda.current]?.kind ?? null, next: agenda.phases[agenda.current + 1]?.kind ?? null })
      }
    }
    agendaPrev = a
    const c = sampleCountdown(snap.timer, now)
    for (const e of timerEvents(countPrev, c)) {
      if (e === 'warning') warn(null)
      else announce({ id: ++seq, source: 'countdown', phase: null, next: null })
    }
    countPrev = c
    // Time was added or the phase moved on: the popup is obsolete.
    if (ended.value?.source === 'agenda' && (!a || a.remainingMs > 0)) ended.value = null
  }

  onMounted(() => { tick = setInterval(step, 500) })
  onBeforeUnmount(() => clearInterval(tick))
  return { ended, dismiss: () => { ended.value = null } }
}
