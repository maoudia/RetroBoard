import { DEFAULT_TALK_BUDGET_MS, emptyTalk } from './talk'
import { DEFAULT_COLUMN_ICON } from '../shared/icons'
import { DEFAULT_TIMER_MS, DEFAULT_VOTE_LIMIT, NOTE_COLOR_COUNT, NEW_BOARD_NOTE_MAX_LENGTH } from '../shared/limits'
import { getTemplate, type RetroTemplate } from '../catalogue/templates'
import type { BoardState, Column, ReduceContext } from '../shared/types'

export const DEFAULT_TEMPLATE_ID = 'start-stop-continue'
export const DEFAULT_THEME_ID = 'studio'

export function columnsFromTemplate(template: RetroTemplate, newId: () => string): Column[] {
  return template.columns.map((c, i) => ({
    id: newId(),
    color: i % NOTE_COLOR_COUNT,
    title: c.title,
    subtitle: c.subtitle,
    icon: c.icon || DEFAULT_COLUMN_ICON,
  }))
}

/**
 * Column mapping of a format change that keeps the notes: old column i goes to new column i;
 * when the new format has fewer columns the extra old columns go to the last new column.
 * Pure and deterministic, so every peer reaches the same state.
 */
export function mapColumns(oldIds: readonly string[], newIds: readonly string[]): Record<string, string> {
  const last = newIds.length - 1
  return Object.fromEntries(oldIds.map((id, i) => [id, newIds[Math.min(i, last)]!]))
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
      noteMaxLength: NEW_BOARD_NOTE_MAX_LENGTH,
      destroyed: false,
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
