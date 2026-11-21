/**
 * Rules of the playing card of a poker room (change poker-design-v2, K4). Pure, so a unit test holds them.
 */

/** How large the centred value is, by the number of characters it has: a card holds at most 6, on a card that is 5:7 and not wide. */
export type ValueTier = 'xl' | 'lg' | 'md' | 'sm'

/** The tier of a value by its length in characters (not UTF-16 units: a coffee cup is one character). */
export function valueTier(value: string): ValueTier {
  const n = [...value].length
  return n <= 2 ? 'xl' : n === 3 ? 'lg' : n === 4 ? 'md' : 'sm'
}

/** The deck is one wrapping grid up to this many cards and one row that scrolls sideways beyond it (K4). */
export const WRAP_MAX = 14

/** Whether a deck is too long to wrap in a hand: a custom deck of 15 to 24 cards. */
export const scrolls = (cards: number): boolean => cards > WRAP_MAX
