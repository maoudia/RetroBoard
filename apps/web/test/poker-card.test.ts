import { describe, expect, it } from 'vitest'
import { scrolls, valueTier, WRAP_MAX } from '../app/poker/card'

/** The rules of the playing card of a poker room (change poker-design-v2, task 1.1). */
describe('valueTier', () => {
  it('one or two characters take the largest value size', () => {
    expect(['5', '?', '☕', '13', '89', 'XL', 'S'].map(valueTier)).toEqual(['xl', 'xl', 'xl', 'xl', 'xl', 'xl', 'xl'])
  })
  it('three characters take the next size', () => {
    expect(['XXL', '100', '1/2'].map(valueTier)).toEqual(['lg', 'lg', 'lg'])
  })
  it('four characters take the next one, and five or six the smallest', () => {
    expect(valueTier('1000')).toBe('md')
    expect(valueTier('12345')).toBe('sm')
    expect(valueTier('123456')).toBe('sm')
  })
  it('counts characters and not UTF-16 units: an emoji outside the basic plane is one character', () => {
    expect(valueTier('🍕')).toBe('xl')
    expect(valueTier('🍕🍕')).toBe('xl')
    expect(valueTier('🍕🍕🍕')).toBe('lg')
  })
  it('an empty value (a card without a face) takes the largest size and never throws', () => {
    expect(valueTier('')).toBe('xl')
  })
})

describe('scrolls', () => {
  it('a deck wraps up to 14 cards and is a row that scrolls from 15', () => {
    expect(WRAP_MAX).toBe(14)
    expect([2, 13, 14].map(scrolls)).toEqual([false, false, false])
    expect([15, 20, 24].map(scrolls)).toEqual([true, true, true])
  })
})
