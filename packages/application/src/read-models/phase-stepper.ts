/**
 * Phase stepper (change board-activity-feed): the agenda as a compact step progress.
 * Pure read model: earlier phases done, the running one current with its time left, the next one named.
 */
import { type AgendaState, phaseClock, type PhaseKind } from '@retroboard/domain'

export type StepState = 'done' | 'current' | 'todo'

export interface Step {
  id: string
  kind: PhaseKind
  state: StepState
  /** Planned time, the width of the segment. */
  plannedMs: number
  /** Share of the segment already used, 0..1 (1 for done, 0 for todo). */
  fill: number
}

export interface PhaseStepper {
  steps: Step[]
  current: { kind: PhaseKind; plannedMs: number; elapsedMs: number; remainingMs: number; overtime: boolean; paused: boolean } | null
  next: PhaseKind | null
  started: boolean
  ended: boolean
}

export function phaseStepper(agenda: AgendaState, now: number): PhaseStepper {
  const clock = phaseClock(agenda, now)
  const ended = agenda.current >= agenda.phases.length
  const steps = agenda.phases.map<Step>((p, i) => {
    const state: StepState = ended || i < agenda.current ? 'done' : i === agenda.current ? 'current' : 'todo'
    const fill = state === 'done' ? 1 : state === 'current' && p.plannedMs > 0 ? Math.min(1, Math.max(0, clock.elapsedMs / p.plannedMs)) : 0
    return { id: p.id, kind: p.kind, state, plannedMs: p.plannedMs, fill }
  })
  const cur = clock.phase
  return {
    steps,
    current: cur ? { kind: cur.kind, plannedMs: cur.plannedMs, elapsedMs: clock.elapsedMs, remainingMs: clock.remainingMs, overtime: clock.overtime, paused: clock.paused } : null,
    // Before the start, the first phase is the next one.
    next: agenda.phases[agenda.current < 0 ? 0 : agenda.current + 1]?.kind ?? null,
    started: agenda.current >= 0,
    ended,
  }
}
