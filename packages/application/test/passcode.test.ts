import { describe, expect, it } from 'vitest'
import { DEFAULT_RANDOM, MAX_LENGTH, MIN_LENGTH, classes, estimateBits, passphrase, passphraseBits, randomBits, randomPasscode, readablePasscode, strengthOf } from '../src'

/** Deterministic generator (mulberry32) so failures are reproducible. */
const seeded = (seed: number) => { let a = seed; return (max: number) => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max) } }

describe('readable passcode', () => {
  it('is three groups of six with one digit and one capital', () => {
    for (let i = 1; i <= 50; i++) {
      const p = readablePasscode(seeded(i))
      expect(p).toMatch(/^[A-Za-z0-9]{6}-[A-Za-z0-9]{6}-[A-Za-z0-9]{6}$/)
      expect(p.match(/[0-9]/g)).toHaveLength(1)
      expect(p.match(/[A-Z]/g)).toHaveLength(1)
    }
  })
  it('differs between draws', () => {
    expect(new Set(Array.from({ length: 30 }, (_, i) => readablePasscode(seeded(i + 100)))).size).toBe(30)
  })
})

describe('random passcode', () => {
  it('respects length bounds', () => {
    expect(randomPasscode(seeded(1), { length: 3 })).toHaveLength(MIN_LENGTH)
    expect(randomPasscode(seeded(1), { length: 500 })).toHaveLength(MAX_LENGTH)
    expect(randomPasscode(seeded(1), { length: 33 })).toHaveLength(33)
  })
  it('uses every enabled class at least once', () => {
    for (let i = 1; i <= 40; i++) {
      const p = randomPasscode(seeded(i), { length: 8, symbols: true })
      expect(p).toMatch(/[a-z]/); expect(p).toMatch(/[A-Z]/); expect(p).toMatch(/[0-9]/); expect(p).toMatch(/[^A-Za-z0-9]/)
    }
  })
  it('excludes look-alike characters', () => {
    const p = Array.from({ length: 200 }, (_, i) => randomPasscode(seeded(i), { length: 64 })).join('')
    expect(p).not.toMatch(/[O0oIl1|B8S5Z2]/)
    expect(classes({ ...DEFAULT_RANDOM, excludeLookalikes: false }).join('')).toContain('O')
  })
  it('returns nothing when no class is enabled', () => {
    expect(randomPasscode(seeded(1), { lower: false, upper: false, digits: false })).toBe('')
  })
  it('is roughly uniform over the alphabet', () => {
    const counts = new Map<string, number>()
    const rnd = seeded(7)
    for (let i = 0; i < 400; i++) for (const c of randomPasscode(rnd, { length: 64, upper: false, digits: false, everyClass: false, excludeLookalikes: false })) counts.set(c, (counts.get(c) ?? 0) + 1)
    const expected = (400 * 64) / 26
    for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.1)
  })
})

describe('passphrase', () => {
  it('joins pronounceable words with the separator', () => {
    expect(passphrase(seeded(3), { words: 5, separator: '.' })).toMatch(/^([a-z]{6}\.){4}[a-z]{6}$/)
    expect(passphrase(seeded(3), { words: 3, capitalize: true })).toMatch(/^[A-Z][a-z]{5}-[A-Z][a-z]{5}-[A-Z][a-z]{5}$/)
  })
  it('clamps the word count', () => {
    expect(passphrase(seeded(3), { words: 99 }).split('-')).toHaveLength(10)
    expect(passphrase(seeded(3), { words: 0 }).split('-')).toHaveLength(2)
  })
})

describe('entropy', () => {
  it('matches the alphabet size', () => {
    expect(randomBits({ length: 20 })).toBe(Math.round(20 * Math.log2(classes(DEFAULT_RANDOM).join('').length)))
    expect(randomBits({ lower: false, upper: false, digits: false })).toBe(0)
    expect(passphraseBits({ words: 6 })).toBeGreaterThan(100)
  })
  it('rates typed passcodes and ignores repetition', () => {
    expect(estimateBits('')).toBe(0)
    expect(estimateBits('aaaaaaaaaaaa')).toBeLessThan(estimateBits('abcdefghijkl'))
    expect(strengthOf(estimateBits('1234'))).toBe('weak')
    expect(strengthOf(estimateBits(readablePasscode(seeded(5))))).not.toBe('weak')
  })
  it('maps bits to strength labels', () => {
    expect([30, 50, 70, 90].map(strengthOf)).toEqual(['weak', 'fair', 'good', 'strong'])
  })
})
