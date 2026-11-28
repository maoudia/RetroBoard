/**
 * Phase transition guidance (change phase-transition-guidance): two pure read models over the snapshot.
 * `reviewState` says what the Previous actions phase has to show; `writingHidden` says whether the
 * writing areas collapse because the agenda went back before Write.
 */
import { agendaRunning, isOpenAction, type Snapshot } from '@retroboard/domain'

export type ReviewState = 'none' | 'open' | 'allDone'

/** none: no carried-over action; open: at least one is still open; allDone: all are done or dropped. */
export function reviewState(snapshot: Pick<Snapshot, 'actions'>): ReviewState {
  const carried = snapshot.actions.filter((a) => a.carriedFrom !== null)
  if (carried.length === 0) return 'none'
  return carried.some(isOpenAction) ? 'open' : 'allDone'
}

/** True when the option is on (absent = on), phase rules run, the phase is before the first Write and an idea exists. */
export function writingHidden(snapshot: Pick<Snapshot, 'settings' | 'agenda' | 'notes'>): boolean {
  const agenda = snapshot.agenda
  if (snapshot.settings.hideWritingOnReturn === false) return false
  if (!agendaRunning(agenda) || !agenda.rules) return false
  const firstWrite = agenda.phases.findIndex((p) => p.kind === 'write')
  // No Write phase gives -1, and a running agenda is at 0 or more: that case is closed here too.
  if (agenda.current >= firstWrite) return false
  return snapshot.notes.length > 0
}
