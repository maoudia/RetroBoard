import type { AgendaState } from '@retroboard/domain'
import { safeStorage } from './storage'

/** "Not now" of the one-time sync nudge, per device (a per-viewer convenience: change sync-ux, group 3). */
export const NUDGE_KEY = 'retroboard:sync-nudge'

/** A phase is running: the agenda has started and not ended (a retro is going on). */
export const phaseRunning = (a: AgendaState | null | undefined): boolean => !!a && a.current >= 0 && a.current < a.phases.length

export interface NudgeInput {
  /** This tab just created the board (the set-up hand-off is still there): the nudge follows the first board, never a visit. */
  readonly creator: boolean
  readonly connected: boolean
  readonly dismissed: boolean
  /** The browser can keep a "Not now": without that the nudge would come back at every board, so it stays away. */
  readonly canRemember: boolean
  readonly phaseRunning: boolean
  readonly dialogOpen: boolean
  readonly presenter: boolean
  /** Boards the library already holds before this one: the nudge is for the first board only. */
  readonly otherBoards: number
}

export const shouldNudgeSync = (i: NudgeInput): boolean =>
  i.creator && !i.connected && !i.dismissed && i.canRemember && !i.phaseRunning && !i.dialogOpen && !i.presenter && i.otherBoards === 0

export const nudgeDismissed = (): boolean => safeStorage.get<boolean>(NUDGE_KEY, false)
export const dismissNudge = (): void => safeStorage.set(NUDGE_KEY, true)

/** True when this browser keeps what is written to it (private windows and blocked storage do not). */
export function canRememberHere(): boolean {
  try {
    const probe = `${NUDGE_KEY}:probe`
    localStorage.setItem(probe, '1')
    const ok = localStorage.getItem(probe) === '1'
    localStorage.removeItem(probe)
    return ok
  } catch { return false }
}
