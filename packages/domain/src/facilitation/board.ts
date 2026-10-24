import { DEFAULT_COLUMN_ICON } from './icons'
import { DEFAULT_TIMER_MS, DEFAULT_VOTE_LIMIT } from './limits'
import { getTemplate, type RetroTemplate } from './templates'
import type { BoardState, Column, ReduceContext } from './types'

export const DEFAULT_TEMPLATE_ID = 'start-stop-continue'
export const DEFAULT_THEME_ID = 'studio'

export function columnsFromTemplate(template: RetroTemplate, newId: () => string): Column[] {
  return template.columns.map((c) => ({
    id: newId(),
    title: c.title,
    subtitle: c.subtitle,
    icon: c.icon || DEFAULT_COLUMN_ICON,
  }))
}

export function createBoard(ctx: Pick<ReduceContext, 'newId'>): BoardState {
  const template = getTemplate(DEFAULT_TEMPLATE_ID)!
  return {
    settings: {
      title: 'Rétrospective',
      voteLimit: DEFAULT_VOTE_LIMIT,
      secretVoting: false,
      locked: false,
      themeId: DEFAULT_THEME_ID,
      templateId: template.id,
      initialized: false,
    },
    columns: columnsFromTemplate(template, ctx.newId),
    notes: {},
    groups: {},
    actions: {},
    timer: { running: false, endsAt: 0, remaining: DEFAULT_TIMER_MS, length: DEFAULT_TIMER_MS },
  }
}
