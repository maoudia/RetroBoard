import type { Snapshot } from '@retroboard/domain'

/**
 * How recent a move to done must be to count as live (change done-celebration). A replay, an anti-entropy round, a history
 * load or a device that joins late hands over changes that are old: they are told apart by the time of the change.
 */
export const LIVE_WINDOW_MS = 10_000

export interface DoneTransition { actionId: string; sourceId: string | null }

/**
 * The actions that went to done between two snapshots, and only the live ones: the action was known and not done before,
 * is done now, and its last status change is recent. Nothing for the first snapshot, nothing for a reopened action.
 */
export function doneTransitions(prev: Snapshot | null, next: Snapshot, windowMs = LIVE_WINDOW_MS): DoneTransition[] {
  if (!prev) return []
  const before = new Map(prev.actions.map((a) => [a.id, a.status] as const))
  return next.actions.flatMap((a) => {
    const was = before.get(a.id)
    if (a.status !== 'done' || was === undefined || was === 'done') return []
    const last = a.history[a.history.length - 1]
    if (!last || last.status !== 'done' || next.now - last.at > windowMs) return []
    return [{ actionId: a.id, sourceId: a.sourceNote ?? null }]
  })
}

/** What may play for this person: the switch, and no celebration while presenting unless the animations are on. */
export function celebrationAllowed(s: { celebrations: boolean; motion: 'auto' | 'reduced' }, presenting: boolean, osReduced: boolean): boolean {
  if (!s.celebrations) return false
  return !(presenting && (s.motion === 'reduced' || osReduced))
}
