/**
 * Statistics of a revealed round (change scrum-poker, task 1.3): one pure function from the deck and the cards cast.
 *
 * Numeric decks (every card but `?`, the coffee card and the infinity card is a number, `½` is one half) give average, median, mode and
 * spread over the numeric cards. Any other deck (T-shirt sizes, words) is ordinal: its cards are ranked by their place in the deck, the
 * median is a card and the average is not defined. Special cards are counted as cards cast and kept out of every number.
 * Ties: the median of an even count lies between two cards, the suggestion is the card nearest to it and goes to the higher one when two
 * are as near; the mode lists every card with the top count, in deck order.
 */
import { isSpecialCard } from './decks'

export interface CardCount { readonly card: string; readonly votes: number }

export interface Statistics {
  /** Cards cast, special ones included. */
  readonly cast: number
  /** Cards cast that count in the numbers (not `?`, coffee, infinity). */
  readonly counted: number
  /** A count for every card cast, in deck order. */
  readonly counts: readonly CardCount[]
  readonly ordinal: boolean
  /** Mean of the numeric cards; null for an ordinal deck or no numeric card. */
  readonly average: number | null
  /** Middle numeric value (the mean of the two middle ones for an even count); null for an ordinal deck. */
  readonly median: number | null
  /** The cards with the top count among the counted cards, in deck order. */
  readonly mode: readonly string[]
  /** Lowest and highest counted card, and the number of deck steps between them. */
  readonly spread: { readonly low: string; readonly high: string; readonly steps: number } | null
  /** Share of the cards cast on the card cast most (several cards share it on a tie): 1 is unanimity. */
  readonly consensus: number
  readonly unanimous: boolean
  /** The card nearest to the median (to the middle card of an ordinal deck), never applied by itself. */
  readonly suggestion: string | null
}

/** The numeric value of a card, or null for a special card and a word. */
export function cardValue(card: string): number | null {
  if (card === '½') return 0.5
  return /^\d+(\.\d+)?$/.test(card) ? Number(card) : null
}

/** A deck is numeric when every card that is not special is a number; a deck with no such card is ordinal too. */
export const isNumericDeck = (deck: readonly string[]): boolean => {
  const plain = deck.filter((c) => !isSpecialCard(c))
  return plain.length > 0 && plain.every((c) => cardValue(c) !== null)
}

const nothing = (ordinal: boolean): Statistics => ({ cast: 0, counted: 0, counts: [], ordinal, average: null, median: null, mode: [], spread: null, consensus: 0, unanimous: false, suggestion: null })

/** `picks` are deck indexes (what a ballot opens to); an index outside the deck is not a card and is left out. */
export function roundStatistics(deck: readonly string[], picks: readonly number[]): Statistics {
  const cards = picks.filter((i) => Number.isInteger(i) && i >= 0 && i < deck.length)
  const ordinal = !isNumericDeck(deck)
  if (cards.length === 0) return nothing(ordinal)
  const tally = new Map<number, number>()
  for (const i of cards) tally.set(i, (tally.get(i) ?? 0) + 1)
  const counts = [...tally].sort(([a], [b]) => a - b).map(([i, votes]) => ({ card: deck[i]!, votes }))
  const top = Math.max(...tally.values())

  // Ranks: the value of a numeric card, the place in the deck of a card of an ordinal deck. Special cards have none.
  const rankOf = (i: number): number | null => (ordinal ? (isSpecialCard(deck[i]!) ? null : i) : cardValue(deck[i]!))
  const ranked = cards.map((i) => ({ i, rank: rankOf(i) })).filter((c): c is { i: number; rank: number } => c.rank !== null).sort((a, b) => a.rank - b.rank)
  const base = { cast: cards.length, counts, ordinal, consensus: top / cards.length, unanimous: tally.size === 1 }
  if (ranked.length === 0) return { ...nothing(ordinal), ...base }

  const modeTop = Math.max(...[...tally].filter(([i]) => rankOf(i) !== null).map(([, n]) => n))
  const mode = [...tally].filter(([i, n]) => rankOf(i) !== null && n === modeTop).sort(([a], [b]) => a - b).map(([i]) => deck[i]!)
  const low = ranked[0]!
  const high = ranked[ranked.length - 1]!
  const spread = { low: deck[low.i]!, high: deck[high.i]!, steps: stepsBetween(deck, low.i, high.i) }
  const mid = Math.floor(ranked.length / 2)

  if (ordinal) {
    // The middle card of an even count is the upper one.
    return { ...base, counted: ranked.length, average: null, median: null, mode, spread, suggestion: deck[ranked[mid]!.i]! }
  }
  const values = ranked.map((c) => c.rank)
  const median = ranked.length % 2 === 1 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2
  const average = values.reduce((a, b) => a + b, 0) / values.length
  return { ...base, counted: ranked.length, average, median, mode, spread, suggestion: nearestCard(deck, median) }
}

/** Deck steps between two cards, special cards not counted: the distance the room sees between its low and its high card. */
function stepsBetween(deck: readonly string[], from: number, to: number): number {
  return deck.slice(Math.min(from, to) + 1, Math.max(from, to) + 1).filter((c) => !isSpecialCard(c)).length
}

/** The numeric card nearest to `value` (a deck with a counted numeric card has one); the higher one when two are as near, the first of the deck when they are the same number. */
function nearestCard(deck: readonly string[], value: number): string {
  const numeric = deck.flatMap((card) => { const v = cardValue(card); return v === null ? [] : [{ card, v }] })
  return numeric.sort((a, b) => Math.abs(a.v - value) - Math.abs(b.v - value) || b.v - a.v)[0]!.card
}
