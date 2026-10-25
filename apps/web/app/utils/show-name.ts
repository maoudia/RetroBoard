/**
 * "Show my name on my notes": on by default as soon as a name is typed, unless the person
 * already made a choice with a name in place (a saved choice is never switched behind their back).
 */
export interface SavedIdentity { named: boolean; name: string }

/** True when the person already decided: they saw the dialog and kept a name. */
export const hasChosen = (saved: SavedIdentity): boolean => saved.named && saved.name.trim() !== ''

/** The value of the checkbox after the name field changed. `touched`: the person set it themselves. */
export function showNameAfterTyping(name: string, touched: boolean, current: boolean): boolean {
  if (touched) return current
  return name.trim() !== ''
}
