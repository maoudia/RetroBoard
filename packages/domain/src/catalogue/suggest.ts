import { type Goal, type RetroTemplate, TEMPLATES } from './templates'

export interface SuggestAnswers {
  goal: Goal
  /** 1 (rough sprint) to 5 (great sprint). */
  mood: number
  /** Time available, in minutes. */
  minutes: number
  /** Preferred theme (usually the seasonal one) to favour themed formats. */
  themeId?: string
}

export type Reason = 'goal' | 'mood' | 'time' | 'theme' | 'light'

export interface Suggestion {
  template: RetroTemplate
  score: number
  reasons: Reason[]
}

export function suggestTemplates(a: SuggestAnswers, limit = 3): Suggestion[] {
  const scored = TEMPLATES.map((template): Suggestion => {
    const reasons: Reason[] = []
    let score = 0
    if (template.goals.includes(a.goal)) {
      // First listed goal is the format's strength.
      score += template.goals[0] === a.goal ? 6 : 4
      reasons.push('goal')
    }
    if (a.mood >= template.mood[0] && a.mood <= template.mood[1]) {
      score += 2
      reasons.push('mood')
    }
    if (a.minutes >= template.minutes[0] && a.minutes <= template.minutes[1]) {
      score += 2
      reasons.push('time')
    } else if (a.minutes < template.minutes[0]) {
      score -= 2
    }
    if (a.minutes <= 20 && template.columns.length <= 3) {
      score += 1
      reasons.push('light')
    }
    if (template.themeId && template.themeId === a.themeId) {
      score += 3
      reasons.push('theme')
    }
    return { template, score, reasons }
  })
  return scored
    .sort((x, y) => y.score - x.score || x.template.id.localeCompare(y.template.id))
    .slice(0, limit)
}

export interface ThemeSuggestion {
  themeId: string
  reason: 'halloween-season' | 'christmas-season' | 'spring-season' | 'default'
}

/** Seasonal theme for a date. Pure: pass the date in. */
export function suggestThemeForDate(date: Date): ThemeSuggestion {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const md = m * 100 + d
  if (md >= 1015 && md <= 1102) return { themeId: 'halloween', reason: 'halloween-season' }
  if (md >= 1201 || md <= 106) return { themeId: 'noel', reason: 'christmas-season' }
  if (md >= 320 && md <= 430) return { themeId: 'sakura', reason: 'spring-season' }
  return { themeId: 'studio', reason: 'default' }
}
