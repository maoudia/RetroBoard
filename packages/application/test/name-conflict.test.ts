import { describe, expect, it } from 'vitest'
import { nameConflict, nameKey } from '../src'

const me = (name: string | null) => ({ name, me: true, key: 'me' })
const other = (name: string | null, key: string) => ({ name, me: false, key })

describe('nameKey', () => {
  it('ignores case, accents and spacing', () => {
    expect(nameKey('  Éloïse  Martin ')).toBe('eloise martin')
    expect(nameKey(null)).toBe('')
  })
})

describe('nameConflict', () => {
  it('reports the name of someone who was here first', () => {
    expect(nameConflict([other('Alex', 'a'), me('alex')], new Set(['a']))).toBe('Alex')
  })
  it('matches names with accents and case apart', () => {
    expect(nameConflict([other('Éloïse', 'a'), me('eloise')], new Set(['a']))).toBe('Éloïse')
  })
  it('never asks the one who was there first (the other joined later)', () => {
    expect(nameConflict([other('Alex', 'a'), me('alex')], new Set())).toBeNull()
  })
  it('ignores empty names and different names', () => {
    expect(nameConflict([other(null, 'a'), me('')], new Set(['a']))).toBeNull()
    expect(nameConflict([other('Alex', 'a'), me('Alexandre')], new Set(['a']))).toBeNull()
  })
  it('ignores peers without a key', () => {
    expect(nameConflict([{ name: 'Alex', me: false }, me('Alex')], new Set(['a']))).toBeNull()
  })
})
