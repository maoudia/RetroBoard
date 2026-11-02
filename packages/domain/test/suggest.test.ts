import { describe, expect, it } from 'vitest'
import { type Goal, type Reason, suggestTemplates, suggestThemeForDate, TEMPLATES } from '@retroboard/domain'

const GOALS: Goal[] = ['celebrate', 'fix', 'ideas', 'learn', 'conflict', 'quick']
const all = (a: Parameters<typeof suggestTemplates>[0]) => suggestTemplates(a, TEMPLATES.length)

/** The scoring rules written as a table: goal 6 or 4, mood 2, time 2 (or -2 when too short), light 1, theme 3. */
function expected(t: (typeof TEMPLATES)[number], a: { goal: Goal; mood: number; minutes: number; themeId?: string }) {
  let score = 0
  const reasons: Reason[] = []
  if (t.goals.includes(a.goal)) { score += t.goals[0] === a.goal ? 6 : 4; reasons.push('goal') }
  if (a.mood >= t.mood[0] && a.mood <= t.mood[1]) { score += 2; reasons.push('mood') }
  if (a.minutes >= t.minutes[0] && a.minutes <= t.minutes[1]) { score += 2; reasons.push('time') } else if (a.minutes < t.minutes[0]) score -= 2
  if (a.minutes <= 20 && t.columns.length <= 3) { score += 1; reasons.push('light') }
  if (t.themeId && t.themeId === a.themeId) { score += 3; reasons.push('theme') }
  return { score, reasons }
}

describe('suggestTemplates scoring', () => {
  it('scores every format as documented across goals, moods and durations (boundaries included)', () => {
    const minutes = new Set<number>([5, 9, 10, 19, 20, 21, 180])
    for (const t of TEMPLATES) for (const m of t.minutes) { minutes.add(m - 1); minutes.add(m); minutes.add(m + 1) }
    for (const goal of GOALS) for (const mood of [1, 2, 3, 4, 5]) for (const mn of minutes) {
      const a = { goal, mood, minutes: mn }
      for (const s of all(a)) {
        const e = expected(s.template, a)
        expect(s.score, `${s.template.id} ${JSON.stringify(a)}`).toBe(e.score)
        expect(s.reasons, `${s.template.id} ${JSON.stringify(a)}`).toEqual(e.reasons)
      }
    }
  })

  it('favours the themed formats of the seasonal theme by 3 points and says why', () => {
    const themes = [...new Set(TEMPLATES.flatMap((t) => (t.themeId ? [t.themeId] : [])))]
    expect(themes.length).toBeGreaterThan(0)
    for (const themeId of themes) {
      const a = { goal: 'celebrate' as Goal, mood: 3, minutes: 45 }
      const base = new Map(all(a).map((s) => [s.template.id, s.score]))
      for (const s of all({ ...a, themeId })) {
        const themed = s.template.themeId === themeId
        expect(s.score).toBe((base.get(s.template.id) ?? 0) + (themed ? 3 : 0))
        expect(s.reasons.includes('theme')).toBe(themed)
      }
    }
  })

  it('sorts by score then id, honours the limit (default 3) and never returns more than exist', () => {
    const a = { goal: 'fix' as Goal, mood: 2, minutes: 30 }
    const full = all(a)
    expect(full).toHaveLength(TEMPLATES.length)
    for (let i = 1; i < full.length; i++) {
      const [p, c] = [full[i - 1]!, full[i]!]
      expect(p.score > c.score || (p.score === c.score && p.template.id.localeCompare(c.template.id) < 0)).toBe(true)
    }
    expect(suggestTemplates(a)).toEqual(full.slice(0, 3))
    expect(suggestTemplates(a, 1)).toEqual(full.slice(0, 1))
    expect(suggestTemplates(a, 0)).toEqual([])
    expect(suggestTemplates(a, 999)).toHaveLength(TEMPLATES.length)
  })
})

describe('suggestThemeForDate boundaries', () => {
  const at = (y: number, m: number, d: number) => suggestThemeForDate(new Date(y, m - 1, d, 12))
  it.each([
    [10, 14, 'studio', 'default'], [10, 15, 'halloween', 'halloween-season'], [11, 2, 'halloween', 'halloween-season'], [11, 3, 'studio', 'default'],
    [11, 30, 'studio', 'default'], [12, 1, 'noel', 'christmas-season'], [12, 31, 'noel', 'christmas-season'], [1, 1, 'noel', 'christmas-season'],
    [1, 6, 'noel', 'christmas-season'], [1, 7, 'studio', 'default'],
    [3, 19, 'studio', 'default'], [3, 20, 'sakura', 'spring-season'], [4, 30, 'sakura', 'spring-season'], [5, 1, 'studio', 'default'],
    [7, 14, 'studio', 'default'],
  ])('%i/%i gives %s', (m, d, themeId, reason) => {
    expect(at(2026, m, d)).toEqual({ themeId, reason })
  })
})
