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

/** The colour of a card back of a hue the moderator picked (one of the eight of the avatar picker), or null for the colours of the theme: mid-dark, so the lattice keeps its edge on a light and on a dark surface. */
export const backColour = (hue: number | null): string | null => (hue === null ? null : `hsl(${hue} 60% 40%)`)
