import { describe, expect, it } from 'vitest'
import { DECK_MAX, isValidDeck } from '@retroboard/domain'
import { cardKey, DEFAULT_PRESET, isSpecialCard, matchTyped, parseCustomDeck, PRESETS, presetCards, presetOf, splitCards } from '../src'

describe('preset decks', () => {
  it('are the four chips of the start page, in order, each a valid deck', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['fibonacci', 'modified', 'tshirt', 'powers'])
    for (const p of PRESETS) expect(isValidDeck(p.cards)).toBe(true)
    expect(DEFAULT_PRESET).toBe('fibonacci')
  })

  it('hold the expected cards', () => {
    expect(presetCards('fibonacci')).toEqual(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'])
    expect(presetCards('modified')).toEqual(['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'])
    expect(presetCards('tshirt')).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'])
    expect(presetCards('powers')).toEqual(['1', '2', '4', '8', '16', '32', '64', '?'])
  })

  it('are recognised by their cards, and a typed deck is none', () => {
    expect(presetOf(presetCards('tshirt'))).toBe('tshirt')
    expect(presetOf(['1', '2', '3'])).toBeNull()
    expect(presetOf(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'X'])).toBeNull()
  })

  it('know the special cards', () => {
    expect(['?', '☕', '∞'].every(isSpecialCard)).toBe(true)
    expect(isSpecialCard('5')).toBe(false)
  })
})

describe('typed deck', () => {
  it('splits on commas, trims and drops empty entries', () => {
    expect(splitCards(' 1 ,2,, 3 ,')).toEqual(['1', '2', '3'])
    expect(splitCards('')).toEqual([])
  })

  it('accepts 2 to 24 different short cards', () => {
    expect(parseCustomDeck('1, 2, 4, 8, ?')).toEqual({ ok: true, cards: ['1', '2', '4', '8', '?'] })
    expect(parseCustomDeck('S,M')).toEqual({ ok: true, cards: ['S', 'M'] })
    expect(parseCustomDeck(Array.from({ length: DECK_MAX }, (_, i) => `c${i}`).join(','))).toMatchObject({ ok: true })
    expect(parseCustomDeck('abcdef, 123456')).toMatchObject({ ok: true })
  })

  it.each([
    ['', 'too-few'], ['  ,  ', 'too-few'], ['1', 'too-few'],
    [Array.from({ length: DECK_MAX + 1 }, (_, i) => `c${i}`).join(','), 'too-many'],
    ['1, 2, 1234567', 'too-long'], ['1, 2, 2', 'duplicate'], ['1, 2\u0007', 'too-long'],
  ])('refuses %j as %s', (text, error) => {
    expect(parseCustomDeck(text)).toEqual({ ok: false, error })
  })
})

describe('keys of the hand', () => {
  const fib = presetCards('fibonacci')
  const shirts = presetCards('tshirt')

  it('match the label of a card, whatever the case', () => {
    expect(matchTyped(fib, '5')).toEqual({ exact: fib.indexOf('5'), more: true })
    expect(matchTyped(fib, '8')).toEqual({ exact: fib.indexOf('8'), more: true })
    expect(matchTyped(fib, '3')).toEqual({ exact: fib.indexOf('3'), more: true })
    expect(matchTyped(fib, '13')).toEqual({ exact: fib.indexOf('13'), more: false })
    expect(matchTyped(fib, '?')).toEqual({ exact: fib.indexOf('?'), more: false })
    expect(matchTyped(shirts, 'm')).toEqual({ exact: 2, more: false })
    expect(matchTyped(shirts, 'xl')).toEqual({ exact: 4, more: false })
    expect(matchTyped(shirts, 'XXL')).toEqual({ exact: 5, more: false })
  })

  it('wait when the key starts a longer label, and say so when nothing matches', () => {
    expect(matchTyped(shirts, 'x')).toEqual({ exact: null, more: true })
    expect(matchTyped(fib, '9')).toEqual({ exact: null, more: false })
    expect(matchTyped(fib, '')).toEqual({ exact: null, more: false })
    expect(matchTyped(fib, '1').more).toBe(true)
  })

  it('take a printable character with no modifier as a card key', () => {
    expect(cardKey({ key: '5' })).toBe('5')
    expect(cardKey({ key: '?' })).toBe('?')
    for (const e of [{ key: 'Tab' }, { key: ' ' }, { key: 'ArrowLeft' }, { key: 'c', ctrlKey: true }, { key: 'c', metaKey: true }, { key: 'c', altKey: true }]) expect(cardKey(e)).toBeNull()
  })
})
