/**
 * Activity rings (change activity-rings-timer): the progress of the retro as concentric rings.
 * Pure read model: outer = whole retro, current = running phase, next = the phase after it.
 * A ring past a full turn keeps going in the overtime colour; it never goes negative.
 */
import { type AgendaState, phaseClock, type PhaseKind } from '@retroboard/domain'

export interface Ring {
  /** Share of the first turn, 0..1. */
  fill: number
  /** Share of the second turn (overtime), 0..1; 0 while within the plan. */
  over: number
  /** Raw elapsed over planned, may exceed 1. */
  turns: number
  /** True when the first turn is closed (the celebration moment). */
  complete: boolean
  plannedMs: number
}

export interface PhaseRing extends Ring { phaseId: string; kind: PhaseKind }

export interface RingProgress {
  outer: Ring
  current: PhaseRing | null
  next: PhaseRing | null
  paused: boolean
  /** The running phase is over its plan. */
  overtime: boolean
  ended: boolean
}

function ring(elapsedMs: number, plannedMs: number): Ring {
  const turns = plannedMs > 0 ? Math.max(0, elapsedMs) / plannedMs : 0
  return { fill: Math.min(1, turns), over: turns > 1 ? Math.min(1, turns - 1) : 0, turns, complete: turns >= 1, plannedMs }
}

export function ringProgress(agenda: AgendaState, now: number): RingProgress {
  const clock = phaseClock(agenda, now)
  const outer = ring(clock.totalElapsedMs, clock.totalPlannedMs)
  const ended = agenda.current >= agenda.phases.length
  const cur = clock.phase
  const nextPhase = agenda.phases[agenda.current + 1] ?? null
  const mk = (p: { id: string; kind: PhaseKind; plannedMs: number }, elapsed: number): PhaseRing => ({ ...ring(elapsed, p.plannedMs), phaseId: p.id, kind: p.kind })
  return {
    outer,
    current: cur ? mk(cur, clock.elapsedMs) : null,
    // Before the start, the first phase is "next".
    next: agenda.current < 0 ? (agenda.phases[0] ? mk(agenda.phases[0], 0) : null) : nextPhase ? mk(nextPhase, 0) : null,
    paused: clock.paused,
    overtime: clock.overtime,
    ended,
  }
}
