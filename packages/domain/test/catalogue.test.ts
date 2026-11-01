import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { COLUMN_ICONS, LIMITS , suggestTemplates, suggestThemeForDate , TEMPLATES  } from '@retroboard/domain'

const lucide = createRequire(import.meta.url)('@iconify-json/lucide/icons.json') as {
  icons: Record<string, unknown>
  aliases: Record<string, unknown>
}
const hasIcon = (n: string) => n in lucide.icons || n in lucide.aliases

describe('catalogue integrity', () => {
  it('every icon exists in the Lucide set', () => {
    expect(COLUMN_ICONS.filter((i) => !hasIcon(i))).toEqual([])
  })

  it('every template column uses an allowed icon and fits the limits', () => {
    for (const t of TEMPLATES) {
      expect(t.columns.length).toBeGreaterThan(0)
      expect(t.columns.length).toBeLessThanOrEqual(LIMITS.maxColumns)
      for (const c of t.columns) {
        expect(COLUMN_ICONS, `${t.id}/${c.title}`).toContain(c.icon)
        expect(c.title.length).toBeLessThanOrEqual(LIMITS.columnTitle)
        expect(c.subtitle.length).toBeLessThanOrEqual(LIMITS.columnSubtitle)
      }
    }
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
  })
})

describe('suggestTemplates', () => {
  it('returns the requested number, best first', () => {
    const r = suggestTemplates({ goal: 'conflict', mood: 1, minutes: 45 })
    expect(r).toHaveLength(3)
    expect(r[0]!.template.id).toBe('mad-sad-glad')
    expect(r[0]!.score).toBeGreaterThanOrEqual(r[1]!.score)
  })

  it('favours a quick, light format when time is short', () => {
    const r = suggestTemplates({ goal: 'quick', mood: 3, minutes: 15 })
    expect(r[0]!.template.columns.length).toBeLessThanOrEqual(3)
    expect(r[0]!.reasons).toContain('time')
  })

  it('boosts the themed format of the current theme', () => {
    const base = suggestTemplates({ goal: 'celebrate', mood: 4, minutes: 45 }, 11)
    const themed = suggestTemplates({ goal: 'celebrate', mood: 4, minutes: 45, themeId: 'noel' }, 11)
    const rank = (r: typeof base) => r.findIndex((s) => s.template.id === 'noel')
    expect(rank(themed)).toBeLessThan(rank(base))
  })

  it('is deterministic', () => {
    const a = { goal: 'ideas', mood: 3, minutes: 30 } as const
    expect(suggestTemplates(a)).toEqual(suggestTemplates(a))
  })
})

describe('suggestThemeForDate', () => {
  it.each([
    ['2026-10-23', 'halloween'],
    ['2026-12-24', 'noel'],
    ['2027-01-03', 'noel'],
    ['2026-04-02', 'sakura'],
    ['2026-07-14', 'studio'],
  ])('%s -> %s', (d, expected) => {
    expect(suggestThemeForDate(new Date(`${d}T12:00:00`)).themeId).toBe(expected)
  })
})

describe('votable columns by template (change column-voting-scope)', () => {
  it('every format keeps at least one votable column and marks only celebration columns as not votable', () => {
    for (const t of TEMPLATES) expect(t.columns.some((c) => c.votable !== false), t.id).toBe(true)
    const ssc = TEMPLATES.find((t) => t.id === 'start-stop-continue')!
    expect(ssc.columns.map((c) => c.votable !== false)).toEqual([true, true, false])
  })
})
