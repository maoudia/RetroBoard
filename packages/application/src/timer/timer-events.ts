/**
 * Timer transitions (change phase-end-notifications). Pure: a UI tick feeds the previous and the
 * current sample and gets back the events to announce. Events come from transitions only, so a
 * reconnect (no previous sample), a re-render or a replay never announces the same thing twice.
 */
import { type AgendaState, phaseClock, type TimerState } from '@retroboard/domain'

export const WARNING_MS = 60_000

export interface TimerSample {
  /** Identifies one run: a new key resets the detection (next phase, restarted countdown). */
  key: string
  remainingMs: number
  paused: boolean
  /** Planned length of the run; a warning makes no sense on a run shorter than the warning. */
  totalMs: number
}

export type TimerEvent = 'warning' | 'ended'

/**
 * Events between two samples taken at consecutive ticks.
 * - `prev` null (first sample after a load or a reconnect): nothing, whatever the remaining time.
 * - Paused samples never fire. Added time (remaining going back up) re-arms both events.
 * - A jump over both thresholds (sleeping tab, clock skew) yields `ended` only.
 */
export function timerEvents(prev: TimerSample | null, next: TimerSample | null): TimerEvent[] {
  if (!prev || !next || prev.key !== next.key || prev.paused || next.paused) return []
  if (prev.remainingMs > 0 && next.remainingMs <= 0) return ['ended']
  if (prev.remainingMs > WARNING_MS && next.remainingMs <= WARNING_MS && next.totalMs > WARNING_MS) return ['warning']
  return []
}

/** Sample of the running agenda phase; null when no phase runs. */
export function sampleAgenda(agenda: AgendaState | null, now: number): TimerSample | null {
  if (!agenda) return null
  const clock = phaseClock(agenda, now)
  if (!clock.phase) return null
  return { key: `agenda:${clock.phase.id}:${agenda.current}`, remainingMs: clock.remainingMs, paused: clock.paused, totalMs: clock.phase.plannedMs }
}

/** Sample of the shared countdown; null when it is idle (nothing running and nothing paused). */
export function sampleCountdown(timer: TimerState | null | undefined, now: number): TimerSample | null {
  if (!timer || (!timer.running && timer.remaining <= 0)) return null
  const remainingMs = timer.running ? timer.endsAt - now : timer.remaining
  return { key: `countdown:${timer.length}`, remainingMs, paused: !timer.running, totalMs: timer.length }
}
