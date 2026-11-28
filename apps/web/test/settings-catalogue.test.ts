import { describe, expect, it } from 'vitest'
import { en, fr } from '@retroboard/i18n'
import { MAX_SIMPLE_HINT, SETTINGS_CATALOGUE, SIMPLE_BUDGETS, budgetViolations, simpleUsage, type CatalogueEntry, type SettingsSurface } from '../app/utils/settings-catalogue'

const SURFACES = Object.keys(SIMPLE_BUDGETS) as SettingsSurface[]
const keysOf = (e: CatalogueEntry) => [e.label, ...(e.hint ? [e.hint] : [])]

describe('settings catalogue (change simple-mode-ux-pass)', () => {
  it('has unique ids and every surface', () => {
    const ids = SETTINGS_CATALOGUE.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of SURFACES) expect(SETTINGS_CATALOGUE.some((e) => e.surface === s)).toBe(true)
  })

  it('holds the simple budgets of every surface', () => {
    expect(budgetViolations()).toEqual([])
    for (const s of SURFACES) {
      const u = simpleUsage(s)
      expect(u.groups.length, s).toBeLessThanOrEqual(SIMPLE_BUDGETS[s].groups)
      expect(u.collapsed.length, s).toBeLessThanOrEqual(SIMPLE_BUDGETS[s].collapsed)
    }
  })

  it('fails naming the surface and its controls when a budget is exceeded', () => {
    const extra = (id: string): CatalogueEntry => ({ id, surface: 'profile', class: 'essential', group: `extra-${id}`, label: 'profile.title', simple: true })
    const failures = budgetViolations([...SETTINGS_CATALOGUE, extra('P98'), extra('P99')])
    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('profile')
    expect(failures[0]).toContain('extra-P98, extra-P99')
  })

  it('shows only essential settings, plus occasional ones folded in a group an essential one opens', () => {
    for (const e of SETTINGS_CATALOGUE.filter((x) => x.simple && x.class === 'expert')) throw new Error(`${e.surface} ${e.id} is expert and shown in simple mode`)
    // an expert control stays advanced (e.g. the density of the profile)
    expect(SETTINGS_CATALOGUE.find((e) => e.label === 'profile.density')).toMatchObject({ class: 'expert', simple: false })
  })

  it('has every label and hint key in fr and en', () => {
    const missing = SETTINGS_CATALOGUE.flatMap((e) => keysOf(e).flatMap((k) => (['fr', 'en'] as const).filter((l) => !((l === 'fr' ? fr : en) as Record<string, string>)[k]).map((l) => `${e.surface} ${e.id}: ${k} (${l})`)))
    expect(missing).toEqual([])
  })

  it('keeps the hint of every simple control to one short line', () => {
    const long = SETTINGS_CATALOGUE.filter((e) => e.simple && e.hint).flatMap((e) => (['fr', 'en'] as const).map((l) => ({ e, l, text: ((l === 'fr' ? fr : en) as Record<string, string>)[e.hint!] ?? '' })))
      .filter((x) => x.text.length > MAX_SIMPLE_HINT).map((x) => `${x.e.surface} ${x.e.id} (${x.l}): ${x.text.length} > ${MAX_SIMPLE_HINT}`)
    expect(long).toEqual([])
  })

  it('has no jargon in the labels and hints of simple controls', () => {
    const jargon = /\b(p2p|ledger|vote spread|webmcp|passcode|cluster|e2e|relay|hash)\b/i
    const hits = SETTINGS_CATALOGUE.filter((e) => e.simple).flatMap((e) => keysOf(e).flatMap((k) => (['fr', 'en'] as const).filter((l) => jargon.test(((l === 'fr' ? fr : en) as Record<string, string>)[k] ?? '')).map((l) => `${e.surface} ${e.id}: ${k} (${l})`)))
    expect(hits).toEqual([])
  })
})
