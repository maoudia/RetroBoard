import { describe, expect, it } from 'vitest'
import type { Round } from '@retroboard/domain'
import { cardValue, isNumericDeck, openRound, presetCards, roundStatistics } from '../src'

const fib = presetCards('fibonacci')
const modified = presetCards('modified')
const tshirt = presetCards('tshirt')
const powers = presetCards('powers')
/** Deck indexes of cards, so a round reads like the cards on the table. */
const pick = (deck: readonly string[], ...cards: string[]) => cards.map((c) => deck.indexOf(c))

describe('card values', () => {
  it('reads numbers and one half, and nothing else', () => {
    expect(cardValue('13')).toBe(13)
    expect(cardValue('0.5')).toBe(0.5)
    expect(cardValue('½')).toBe(0.5)
    for (const c of ['?', '☕', 'XL', '', '1,5', '-1', '1e3']) expect(cardValue(c)).toBeNull()
  })

  it('numeric decks are the ones whose plain cards are all numbers', () => {
    expect([fib, modified, powers].map(isNumericDeck)).toEqual([true, true, true])
    expect([tshirt, ['a', 'b'], ['?', '☕'], ['1', 'S']].map(isNumericDeck)).toEqual([false, false, false, false])
  })
})

describe('numeric decks', () => {
  it('Fibonacci: average, median, mode, spread, consensus and the suggestion of 3, 5, 5, 8', () => {
    const s = roundStatistics(fib, pick(fib, '3', '5', '5', '8'))
    expect(s).toMatchObject({ cast: 4, counted: 4, ordinal: false, average: 5.25, median: 5, mode: ['5'], suggestion: '5', consensus: 0.5, unanimous: false })
    expect(s.counts).toEqual([{ card: '3', votes: 1 }, { card: '5', votes: 2 }, { card: '8', votes: 1 }])
    expect(s.spread).toEqual({ low: '3', high: '8', steps: 2 })
  })

  it('the median of an even count lies between two cards; the suggestion is the nearest, the higher on a tie', () => {
    const s = roundStatistics(fib, pick(fib, '3', '8'))
    expect(s.median).toBe(5.5)
    expect(s.suggestion).toBe('5')
    const tie = roundStatistics(fib, pick(fib, '2', '5'))
    expect(tie.median).toBe(3.5)
    expect(tie.suggestion).toBe('3')
    const high = roundStatistics(['1', '3'], [0, 1])
    expect(high.median).toBe(2)
    expect(high.suggestion).toBe('3')
  })

  it('the modal cards of a tie are all listed, in deck order, and unanimity is full consensus', () => {
    expect(roundStatistics(fib, pick(fib, '8', '3', '8', '3', '13')).mode).toEqual(['3', '8'])
    expect(roundStatistics(fib, pick(fib, '8', '3', '8', '3', '13')).consensus).toBeCloseTo(0.4)
    const same = roundStatistics(fib, pick(fib, '5', '5', '5'))
    expect(same).toMatchObject({ unanimous: true, consensus: 1, average: 5, median: 5, mode: ['5'], suggestion: '5' })
    expect(same.spread).toEqual({ low: '5', high: '5', steps: 0 })
  })

  it('modified Fibonacci reads one half', () => {
    const s = roundStatistics(modified, pick(modified, '½', '1', '2'))
    expect(s).toMatchObject({ average: 3.5 / 3, median: 1, suggestion: '1', mode: ['½', '1', '2'] })
    expect(roundStatistics(modified, pick(modified, '0', '½')).suggestion).toBe('½')
    expect(roundStatistics(modified, pick(modified, '20', '40', '100')).suggestion).toBe('40')
  })

  it('powers of two', () => {
    const s = roundStatistics(powers, pick(powers, '2', '4', '8', '8', '16'))
    expect(s).toMatchObject({ average: 7.6, median: 8, mode: ['8'], suggestion: '8' })
    expect(s.spread).toEqual({ low: '2', high: '16', steps: 3 })
  })

  it('special cards are counted as cards cast and kept out of the numbers and the spread', () => {
    const s = roundStatistics(fib, pick(fib, '5', '?', '☕', '8'))
    expect(s).toMatchObject({ cast: 4, counted: 2, average: 6.5, median: 6.5, mode: ['5', '8'], consensus: 0.25, suggestion: '8' })
    expect(s.spread).toEqual({ low: '5', high: '8', steps: 1 })
    expect(s.counts.map((c) => c.card)).toEqual(['5', '8', '?', '☕'])
  })

  it('a round of special cards only has votes and no numbers', () => {
    const s = roundStatistics(fib, pick(fib, '?', '?', '☕'))
    expect(s).toMatchObject({ cast: 3, counted: 0, average: null, median: null, mode: [], spread: null, suggestion: null, unanimous: false })
    expect(s.consensus).toBeCloseTo(2 / 3)
    expect(roundStatistics(fib, pick(fib, '?', '?'))).toMatchObject({ unanimous: true, consensus: 1, suggestion: null })
  })

  it('an empty round, or indexes outside the deck, give nothing', () => {
    expect(roundStatistics(fib, [])).toMatchObject({ cast: 0, counts: [], average: null, consensus: 0, unanimous: false, suggestion: null })
    expect(roundStatistics(fib, [-1, 99, 1.5])).toMatchObject({ cast: 0 })
    expect(roundStatistics(fib, [1, 99]).cast).toBe(1)
  })
})

describe('ordinal decks (T-shirt sizes)', () => {
  it('has a median card and no average; the middle card of an even count is the upper one', () => {
    const odd = roundStatistics(tshirt, pick(tshirt, 'S', 'M', 'XL'))
    expect(odd).toMatchObject({ ordinal: true, average: null, median: null, suggestion: 'M', mode: ['S', 'M', 'XL'] })
    expect(odd.spread).toEqual({ low: 'S', high: 'XL', steps: 3 })
    expect(roundStatistics(tshirt, pick(tshirt, 'S', 'M', 'L', 'XL')).suggestion).toBe('L')
    expect(roundStatistics(tshirt, pick(tshirt, 'M', 'M', 'XXL', 'XS')).suggestion).toBe('M')
  })

  it('counts the question mark and keeps it out of the order', () => {
    const s = roundStatistics(tshirt, pick(tshirt, '?', 'L', 'L', '?', '?'))
    expect(s).toMatchObject({ cast: 5, counted: 2, mode: ['L'], suggestion: 'L', consensus: 0.6 })
    expect(roundStatistics(tshirt, pick(tshirt, '?'))).toMatchObject({ counted: 0, suggestion: null, mode: [] })
  })

  it('a typed deck of words is ordinal by position', () => {
    const deck = ['low', 'mid', 'high']
    expect(roundStatistics(deck, pick(deck, 'high', 'low', 'high'))).toMatchObject({ ordinal: true, suggestion: 'high', mode: ['high'] })
  })
})

describe('opening a revealed round', () => {
  const round = (over: Partial<Round>): Round => ({ id: 'r1', opener: 'o', pub: 'p', revote: false, deck: fib, ballots: { a: 'sa', b: 'sb', c: 'sc' }, revealKey: 'k', ...over })

  it('opens every ballot with the key of the reveal and lists the ones that do not open', async () => {
    const seen: string[] = []
    const out = await openRound(round({}), async (r, voter, sealed) => { seen.push(`${r.id}:${voter}:${sealed}`); return voter === 'a' ? 3 : voter === 'b' ? null : 99 })
    expect(out).toEqual({ round: 'r1', picks: { a: 3 }, unreadable: ['b', 'c'] })
    expect(seen).toEqual(['r1:a:sa', 'r1:b:sb', 'r1:c:sc'])
  })

  it('opens nothing before the reveal', async () => {
    let called = false
    const out = await openRound(round({ revealKey: null }), async () => { called = true; return 1 })
    expect(out).toEqual({ round: 'r1', picks: {}, unreadable: [] })
    expect(called).toBe(false)
  })
})
