/**
 * Passcode generator (change password-by-default). Pure: randomness is injected, so tests are
 * deterministic and the browser adapter supplies `crypto.getRandomValues`.
 *
 * Three styles:
 * - readable: Apple-like groups of pronounceable letters (`kofbe2-Zyxpaw-myhgub`), easy to read aloud
 * - random: KeePassXC-like, length and character classes, optional look-alike exclusion
 * - passphrase: pronounceable words joined by a separator
 */

/** Uniform integer in [0, max). */
export type RandomInt = (max: number) => number

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/'
const EXTENDED = 'éèàùçñüöäß€£'
const LOOKALIKES = new Set('O0oIl1|B8S5Z2'.split(''))

const CONSONANTS = 'bdfghjklmnprstvz'
const VOWELS = 'aeiou'

export interface RandomOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  extended: boolean
  excludeLookalikes: boolean
  /** Each enabled class appears at least once. */
  everyClass: boolean
}
export interface PassphraseOptions {
  words: number
  separator: string
  capitalize: boolean
}

export const MIN_LENGTH = 8
export const MAX_LENGTH = 64
export const DEFAULT_RANDOM: RandomOptions = { length: 20, lower: true, upper: true, digits: true, symbols: false, extended: false, excludeLookalikes: true, everyClass: true }
export const DEFAULT_PASSPHRASE: PassphraseOptions = { words: 4, separator: '-', capitalize: false }

const pick = (set: string, rnd: RandomInt) => set[rnd(set.length)]!
const shuffle = <T>(a: T[], rnd: RandomInt): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j]!, a[i]!] }
  return a
}

/** Characters of each enabled class after the look-alike filter. */
export function classes(o: RandomOptions): string[] {
  const keep = (s: string) => (o.excludeLookalikes ? [...s].filter((c) => !LOOKALIKES.has(c)).join('') : s)
  return [o.lower && keep(LOWER), o.upper && keep(UPPER), o.digits && keep(DIGITS), o.symbols && SYMBOLS, o.extended && EXTENDED].filter((s): s is string => !!s)
}

export function randomPasscode(rnd: RandomInt, options: Partial<RandomOptions> = {}): string {
  const o = { ...DEFAULT_RANDOM, ...options }
  const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(o.length)))
  const sets = classes(o)
  if (sets.length === 0) return ''
  const all = sets.join('')
  const out: string[] = []
  if (o.everyClass) for (const s of sets.slice(0, length)) out.push(pick(s, rnd))
  while (out.length < length) out.push(pick(all, rnd))
  return shuffle(out, rnd).join('')
}

/** A pronounceable group of consonant-vowel pairs (`bafomi`). */
const syllables = (n: number, rnd: RandomInt) => Array.from({ length: n }, () => pick(CONSONANTS, rnd) + pick(VOWELS, rnd)).join('')

export function passphrase(rnd: RandomInt, options: Partial<PassphraseOptions> = {}): string {
  const o = { ...DEFAULT_PASSPHRASE, ...options }
  const words = Math.min(10, Math.max(2, Math.round(o.words)))
  return Array.from({ length: words }, () => {
    const w = syllables(3, rnd)
    return o.capitalize ? w[0]!.toUpperCase() + w.slice(1) : w
  }).join(o.separator)
}

/**
 * Readable default (Apple-like): three groups of six letters, one digit and one capital
 * placed at random (`kofbe2-Zyxpaw-myhgub`). About 72 bits.
 */
export function readablePasscode(rnd: RandomInt): string {
  const chars = [...syllables(9, rnd)]
  const digitAt = rnd(chars.length)
  chars[digitAt] = pick(DIGITS, rnd)
  let capAt = rnd(chars.length)
  while (capAt === digitAt) capAt = rnd(chars.length)
  chars[capAt] = chars[capAt]!.toUpperCase()
  const s = chars.join('')
  return `${s.slice(0, 6)}-${s.slice(6, 12)}-${s.slice(12)}`
}

/** Entropy estimate in bits of a generated passcode, from its generator settings. */
export const randomBits = (o: Partial<RandomOptions> = {}): number => {
  const opts = { ...DEFAULT_RANDOM, ...o }
  const size = classes(opts).join('').length
  return size < 2 ? 0 : Math.round(Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, opts.length)) * Math.log2(size))
}
export const passphraseBits = (o: Partial<PassphraseOptions> = {}): number => Math.round((o.words ?? DEFAULT_PASSPHRASE.words) * 3 * Math.log2(CONSONANTS.length * VOWELS.length))
/** Readable style: 18 letters from the pair alphabet minus the replaced ones (conservative figure). */
export const READABLE_BITS = 64

/** Entropy of any typed string (character pool estimate), used for the strength meter of own passcodes. */
export function estimateBits(value: string): number {
  if (!value) return 0
  let pool = 0
  if (/[a-z]/.test(value)) pool += 26
  if (/[A-Z]/.test(value)) pool += 26
  if (/[0-9]/.test(value)) pool += 10
  if (/[^A-Za-z0-9]/.test(value)) pool += 28
  const distinct = new Set(value).size
  // Repeated characters add little: weigh by distinct characters.
  return Math.round(Math.log2(Math.max(2, pool)) * (distinct + (value.length - distinct) * 0.3))
}

export type Strength = 'weak' | 'fair' | 'good' | 'strong'
export const strengthOf = (bits: number): Strength => (bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'good' : 'strong')
