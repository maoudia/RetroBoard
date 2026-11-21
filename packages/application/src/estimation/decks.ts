/** Decks of a poker room (change scrum-poker, task 1.3): the presets of the start page and the typed list, validated by the domain's rules. */
import { CARD_MAX, DECK_MAX, DECK_MIN, DEFAULT_DECK, isValidDeck } from '@retroboard/domain'

const COFFEE = '☕'

export type PresetId = 'fibonacci' | 'modified' | 'tshirt' | 'powers'

export interface Preset { readonly id: PresetId; readonly cards: readonly string[] }

/** The presets, in the order of the chips on the start page. `?` (no idea) and the coffee card (a break) are cards of the deck but never a number. */
export const PRESETS: readonly Preset[] = [
  { id: 'fibonacci', cards: DEFAULT_DECK },
  { id: 'modified', cards: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', COFFEE] },
  { id: 'tshirt', cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'] },
  { id: 'powers', cards: ['1', '2', '4', '8', '16', '32', '64', '?'] },
]

export const DEFAULT_PRESET: PresetId = 'fibonacci'

export const presetCards = (id: PresetId): readonly string[] => PRESETS.find((p) => p.id === id)!.cards

/** Why a typed deck is refused: the screen turns each into a sentence. */
export type DeckError = 'too-few' | 'too-many' | 'too-long' | 'duplicate'

export type CustomDeck = { readonly ok: true; readonly cards: readonly string[] } | { readonly ok: false; readonly error: DeckError }

/** The cards of a comma separated list: spaces around a card go, empty entries go. */
export const splitCards = (text: string): string[] => text.split(',').map((c) => c.trim()).filter((c) => c !== '')

/** A typed deck: `1, 2, 4, 8, ?` is five cards. Between 2 and 24 different cards of at most 6 characters. */
export function parseCustomDeck(text: string): CustomDeck {
  const cards = splitCards(text)
  if (cards.length < DECK_MIN) return { ok: false, error: 'too-few' }
  if (cards.length > DECK_MAX) return { ok: false, error: 'too-many' }
  if (cards.some((c) => [...c].length > CARD_MAX)) return { ok: false, error: 'too-long' }
  if (new Set(cards).size !== cards.length) return { ok: false, error: 'duplicate' }
  // The domain is the judge of what a deck is (a control character is the one case left): the fold would ignore anything else.
  return isValidDeck(cards) ? { ok: true, cards } : { ok: false, error: 'too-long' }
}

/** The preset a deck is, or null for a typed one. */
export const presetOf = (cards: readonly string[]): PresetId | null => PRESETS.find((p) => p.cards.length === cards.length && p.cards.every((c, i) => c === cards[i]))?.id ?? null

export const isSpecialCard = (card: string): boolean => card === '?' || card === COFFEE || card === '∞'
