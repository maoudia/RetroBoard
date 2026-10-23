import { describe, expect, it } from 'vitest'
import { en } from '../../app/i18n/en'
import { fr } from '../../app/i18n/fr'
import { THEMES_EN } from '../../app/i18n/themes.en'
import { detectLocale, translate } from '../../app/i18n'
import { THEMES } from '../../app/themes'
import { TEMPLATES, localizeTemplate } from '../../shared/domain/templates'
import { harness } from './helpers'

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  it('have the same keys and the same placeholders', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const k of Object.keys(fr) as (keyof typeof fr)[]) expect(params(en[k]), k).toEqual(params(fr[k]))
  })

  it('never contain typographic characters', () => {
    for (const v of Object.values(en)) expect(v).not.toMatch(/[‘’“”–—]/)
  })

  it('interpolates and picks plural forms', () => {
    expect(translate('en', 'votebar.votes', { n: 1 })).toBe('1 vote per person')
    expect(translate('en', 'votebar.votes', { n: 3 })).toBe('3 votes per person')
    expect(translate('fr', 'votebar.votes', { n: 0 })).toBe('0 vote par personne')
    expect(translate('fr', 'column.delete.msgNotes', { n: 2, title: 'X' })).toContain('2 post-its')
  })

  it('falls back to French, then to the key', () => {
    expect(translate('en', 'nope.key')).toBe('nope.key')
  })
})

describe('locale detection', () => {
  it('follows the browser unless a language is chosen', () => {
    expect(detectLocale('auto', ['fr-FR', 'en'])).toBe('fr')
    expect(detectLocale('auto', ['de-DE', 'en-US'])).toBe('en')
    expect(detectLocale('auto', ['de-DE'])).toBe('en')
    expect(detectLocale('fr', ['en-US'])).toBe('fr')
  })
})

describe('content translations', () => {
  it('translates every template with the same number of columns', () => {
    for (const t of TEMPLATES) {
      const loc = localizeTemplate(t, 'en')
      expect(loc.columns.length).toBe(t.columns.length)
      expect(loc.name, t.id).not.toBe('')
      expect(loc.columns.map((c) => c.icon)).toEqual(t.columns.map((c) => c.icon))
    }
  })

  it('translates every theme', () => {
    for (const th of THEMES) expect(THEMES_EN[th.id], th.id).toBeDefined()
  })

  it('creates the board columns in the language of the creator', () => {
    const h = harness()
    const out = h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', locale: 'en' })
    expect(out.ok).toBe(true)
    expect(h.state.columns.map((c) => c.subtitle)).toEqual(['To begin', 'To stop', 'To keep'])
    const h2 = harness()
    h2.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio' })
    expect(h2.state.columns[0]!.subtitle).toBe('À commencer')
  })
})
