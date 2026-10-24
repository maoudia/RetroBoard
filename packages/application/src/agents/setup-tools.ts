import { type Goal, localizeTemplate, suggestTemplates, TEMPLATES, type TemplateLocale } from '@retroboard/domain'
import type { AgentTool, ToolOutput } from '../ports/browser-agent'

export interface BoardDraftConfig { title?: string; templateId: string; themeId?: string }

export interface SetupToolDeps {
  locale(): TemplateLocale
  /** Fills the creation form; the human still clicks Create. */
  prepare(config: BoardDraftConfig): void
  themeIds(): string[]
}

const GOALS: Goal[] = ['celebrate', 'fix', 'ideas', 'learn', 'conflict', 'quick']
const ok = (data: unknown): ToolOutput => ({ ok: true, data })
const fail = (error: string): ToolOutput => ({ ok: false, error })

/** Tools for the landing and creation pages. Nothing is created without a human click. */
export function createSetupAgentTools(deps: SetupToolDeps): AgentTool[] {
  const format = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)
    return t && localizeTemplate(t, deps.locale())
  }

  const listFormats: AgentTool = {
    name: 'retro_list_formats', title: 'List retro formats', readOnly: true,
    description: 'Retro formats available in RetroBoard with their columns and typical duration.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => ok({ formats: TEMPLATES.map((t) => localizeTemplate(t, deps.locale())).map((t) => ({
      id: t.id, name: t.name, description: t.description, minutes: t.minutes, columns: t.columns.map((c) => c.title),
    })) }),
  }

  const suggest: AgentTool<{ goal?: string; mood?: number; minutes?: number }> = {
    name: 'retro_suggest_format', title: 'Suggest a retro format', readOnly: true,
    description: 'Ranks formats from the retro goal, the team mood (1 rough to 5 great) and the time available.',
    inputSchema: { type: 'object', properties: {
      goal: { type: 'string', enum: GOALS }, mood: { type: 'integer', minimum: 1, maximum: 5 }, minutes: { type: 'integer', minimum: 10, maximum: 180 },
    }, required: ['goal'], additionalProperties: false },
    run: (input) => {
      if (!GOALS.includes(input.goal as Goal)) return fail(`goal must be one of ${GOALS.join(', ')}`)
      const mood = Math.min(5, Math.max(1, Math.round(Number(input.mood ?? 3))))
      const minutes = Math.min(180, Math.max(10, Math.round(Number(input.minutes ?? 45))))
      return ok({ suggestions: suggestTemplates({ goal: input.goal as Goal, mood, minutes }).map((s) => ({
        id: s.template.id, name: format(s.template.id)?.name, reasons: s.reasons,
      })) })
    },
  }

  const prepare: AgentTool<{ title?: string; formatId?: string; themeId?: string }> = {
    name: 'retro_prepare_board', title: 'Prepare a new retro', readOnly: false,
    description: 'Fills the new retro form (title, format, theme). The participant reviews it and clicks Create; nothing is created by this tool.',
    inputSchema: { type: 'object', properties: { title: { type: 'string', maxLength: 80 }, formatId: { type: 'string' }, themeId: { type: 'string' } }, required: ['formatId'], additionalProperties: false },
    run: (input) => {
      const id = typeof input.formatId === 'string' ? input.formatId : ''
      if (!format(id)) return fail('Unknown format. Use retro_list_formats.')
      if (input.themeId && !deps.themeIds().includes(input.themeId)) return fail(`themeId must be one of ${deps.themeIds().join(', ')}`)
      deps.prepare({ templateId: id, title: input.title?.trim() || undefined, themeId: input.themeId })
      return ok({ prepared: true, next: 'Ask the participant to review the form and click Create.' })
    },
  }

  return [listFormats, suggest, prepare] as AgentTool[]
}
