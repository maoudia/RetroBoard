import { describe, expect, it } from 'vitest'
import { fr, pseudolocalize, translate, translatePseudo, wantsPseudo } from '../src'

const placeholders = (s: string) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0])
/** Strings long enough for a +40% growth to be measurable once the two brackets are counted. */
const sample = Object.values(fr).filter((v) => v.length >= 12)

describe('pseudolocalize', () => {
  it('brackets, accents and lengthens by 35 to 45%', () => {
    expect(sample.length).toBeGreaterThan(100)
    for (const v of sample) {
      const p = pseudolocalize(v)
      expect(p, v).toMatch(/^\[.*\]$/)
      const growth = p.length / v.length
      expect(growth, v).toBeGreaterThanOrEqual(1.35)
      expect(growth, v).toBeLessThanOrEqual(1.45)
    }
  })

  it('keeps every placeholder intact and in order', () => {
    for (const v of Object.values(fr)) expect(placeholders(pseudolocalize(v)), v).toEqual(placeholders(v))
    expect(pseudolocalize('Publier {n} notes de {name}')).toContain('{n}')
  })

  it('accents the vowels it knows and leaves digits, spaces and punctuation alone', () => {
    expect(pseudolocalize('Publish 12, now.')).toMatch(/^\[Pú+blí+sh 12, ñó+w\.~*\]$/)
    expect(pseudolocalize('aeiou')).toMatch(/^\[áé+í+ó+ú+\]$/)
  })

  it('is deterministic', () => {
    expect(pseudolocalize('Voter pour une idée')).toBe(pseudolocalize('Voter pour une idée'))
  })

  it('pads with tildes a text that has no vowel to stretch, and never shrinks a short one', () => {
    expect(pseudolocalize('1 / 2 / 3 / 4 / 5')).toMatch(/^\[1 \/ 2 \/ 3 \/ 4 \/ 5~+\]$/)
    expect(pseudolocalize('OK')).toBe('[ÓK]')
    expect(pseudolocalize('')).toBe('[]')
  })
})

describe('translatePseudo', () => {
  it('is the French dictionary, pseudo-localized, with the parameters filled in', () => {
    const raw = translate('fr', 'votebar.votes', { n: 3 })
    const out = translatePseudo('votebar.votes', { n: 3 })
    expect(out.startsWith('[') && out.endsWith(']')).toBe(true)
    expect(out).toContain('3')
    expect(out.length).toBeGreaterThan(raw.length)
  })

  it('shows a key that no dictionary has as it is, without markers', () => {
    expect(translatePseudo('nope.key')).toBe('nope.key')
    expect(translatePseudo('nope.key', { n: 2 })).toBe('nope.key')
  })
})

describe('wantsPseudo', () => {
  it('only the lang=pseudo parameter asks for it', () => {
    expect(wantsPseudo('?lang=pseudo')).toBe(true)
    expect(wantsPseudo('?room=a&lang=pseudo')).toBe(true)
    expect(wantsPseudo('')).toBe(false)
    expect(wantsPseudo('?lang=fr')).toBe(false)
    expect(wantsPseudo('?lang=Pseudo')).toBe(false)
    expect(wantsPseudo('?pseudo=1')).toBe(false)
  })
})
