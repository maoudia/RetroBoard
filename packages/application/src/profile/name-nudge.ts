/**
 * Name nudge (change name-nudge): when to invite a participant without a name to choose one.
 * Pure rule; the popup, the timers and the local flags live in the web app.
 */
export const NAME_NUDGE_DELAY_MS = 8_000

export interface NudgeInput {
  /** The name the person is known by (empty: anonymous). */
  name: string
  /** Time since the person joined this board, ms. */
  joinedForMs: number
  /** Notes this person has published on this board. */
  ownNotes: number
  /** A board for one person (solo): nobody to be known by. */
  solo: boolean
  presenter: boolean
  dismissedHere: boolean
  dismissedEverywhere: boolean
  /** The name dialog, another dialog or another popup is on screen: one thing at a time. */
  busy: boolean
}

export function shouldNudgeName(i: NudgeInput): boolean {
  if (i.name.trim() !== '' || i.solo || i.presenter || i.dismissedHere || i.dismissedEverywhere || i.busy) return false
  return i.ownNotes > 0 || i.joinedForMs >= NAME_NUDGE_DELAY_MS
}
