/**
 * Playing the hand from the keyboard (change scrum-poker): the keys typed are matched to the labels of the cards, so `5` picks the card 5,
 * `1` then `3` picks 13, `x` then `l` picks XL, `?` picks the question mark. Case does not matter.
 */
export interface TypedCard {
  /** Index of the card whose label is exactly what was typed, or null. */
  readonly exact: number | null
  /** Another card has a longer label that starts with what was typed: wait a moment for the next key before picking. */
  readonly more: boolean
}

export const TYPED_RESET_MS = 700

/** Typing buffers are short: the longest card has 6 characters. */
export const TYPED_MAX = 6

export function matchTyped(deck: readonly string[], typed: string): TypedCard {
  const want = typed.toLowerCase()
  if (!want) return { exact: null, more: false }
  const labels = deck.map((c) => c.toLowerCase())
  const exact = labels.indexOf(want)
  return { exact: exact === -1 ? null : exact, more: labels.some((l) => l.length > want.length && l.startsWith(want)) }
}

/** The key that adds to the typed text: one printable character, with no modifier. Anything else (arrows, Tab, Ctrl+C) is not a card key. */
export const cardKey = (e: { readonly key: string; readonly ctrlKey?: boolean; readonly metaKey?: boolean; readonly altKey?: boolean }): string | null =>
  !e.ctrlKey && !e.metaKey && !e.altKey && [...e.key].length === 1 && e.key.trim() !== '' ? e.key : null
