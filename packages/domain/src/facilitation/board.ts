import { DEFAULT_TALK_BUDGET_MS, emptyTalk } from './talk'
import { DEFAULT_COLUMN_ICON } from '../shared/icons'
import { DEFAULT_TIMER_MS, DEFAULT_VOTE_LIMIT } from '../shared/limits'
import { getTemplate, type RetroTemplate } from '../catalogue/templates'
import type { BoardState, Column, ReduceContext } from '../shared/types'

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
      maxVotesPerItem: 1,
      votable: 'both',
      secretVoting: false,
      votingClosed: false,
      locked: false,
      browserAgentsAllowed: true,
      openFacilitation: false,
      actionMode: 'checkbox',
      themeId: DEFAULT_THEME_ID,
      templateId: template.id,
      initialized: false,
      talkMode: 'off',
      talkBudgetMs: DEFAULT_TALK_BUDGET_MS,
      talkSelfStart: false,
    },
    columns: columnsFromTemplate(template, ctx.newId),
    notes: {},
    groups: {},
    actions: {},
    timer: { running: false, endsAt: 0, remaining: DEFAULT_TIMER_MS, length: DEFAULT_TIMER_MS },
    agenda: null,
    talk: emptyTalk(),
  }
}
