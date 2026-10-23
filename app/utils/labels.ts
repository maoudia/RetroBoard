import { td } from '~/i18n'
import type { Goal } from '~~/shared/domain/templates'
import type { Reason, ThemeSuggestion } from '~~/shared/domain/suggest'
import type { ErrorCode } from '~~/shared/domain/types'

export const errorLabel = (code: ErrorCode): string => td(`error.${code}`)
export const reasonLabel = (r: Reason): string => td(`reason.${r}`)
export const themeReasonLabel = (r: ThemeSuggestion['reason']): string => td(`themeReason.${r}`)

export const GOAL_DEFS: { id: Goal; icon: string }[] = [
  { id: 'fix', icon: 'wrench' },
  { id: 'celebrate', icon: 'party-popper' },
  { id: 'ideas', icon: 'lightbulb' },
  { id: 'learn', icon: 'graduation-cap' },
  { id: 'conflict', icon: 'heart' },
  { id: 'quick', icon: 'zap' },
]
export const goalLabel = (id: Goal): string => td(`goal.${id}`)
export const goalHint = (id: Goal): string => td(`goal.${id}.hint`)
export const MOOD_VALUES = [1, 2, 3, 4, 5] as const
export const moodLabel = (v: number): string => td(`mood.${v}`)
