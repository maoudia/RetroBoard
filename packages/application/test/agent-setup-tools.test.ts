import { TEMPLATES } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { type AgentTool, createSetupAgentTools } from '../src'

function make(locale: 'fr' | 'en' = 'en') {
  const prepared: unknown[] = []
  const tools = createSetupAgentTools({ locale: () => locale, prepare: (c) => prepared.push(c), themeIds: () => ['studio', 'halloween'] })
  const tool = (name: string) => tools.find((t) => t.name === name) as AgentTool<Record<string, unknown>>
  return { prepared, tools, tool }
}
type Suggest = { suggestions: { id: string; name: string; reasons: string[] }[] }

describe('setup agent tools: contract', () => {
  it('exposes exactly three tools with a title, a description and an object schema without extra properties', () => {
    const { tools } = make()
    expect(tools.map((t) => t.name)).toEqual(['retro_list_formats', 'retro_suggest_format', 'retro_prepare_board'])
    for (const t of tools) {
      expect(t.title.length).toBeGreaterThan(3)
      expect(t.description.length).toBeGreaterThan(20)
      expect(t.inputSchema).toMatchObject({ type: 'object', additionalProperties: false })
    }
  })

  it('only the preparation tool is a write, and the form is never created by it', () => {
    const { tool } = make()
    expect(tool('retro_list_formats').readOnly).toBe(true)
    expect(tool('retro_suggest_format').readOnly).toBe(true)
    expect(tool('retro_prepare_board').readOnly).toBe(false)
    expect(tool('retro_prepare_board').description).toContain('nothing is created')
  })

  it('requires the goal to suggest and the format to prepare, with bounded numbers', () => {
    const { tool } = make()
    const suggest = tool('retro_suggest_format').inputSchema as { required: string[]; properties: Record<string, Record<string, unknown>> }
    expect(suggest.required).toEqual(['goal'])
    expect(suggest.properties.goal!.enum).toEqual(['celebrate', 'fix', 'ideas', 'learn', 'conflict', 'quick'])
    expect(suggest.properties.mood).toMatchObject({ minimum: 1, maximum: 5 })
    expect(suggest.properties.minutes).toMatchObject({ minimum: 10, maximum: 180 })
    const prepare = tool('retro_prepare_board').inputSchema as { required: string[]; properties: Record<string, Record<string, unknown>> }
    expect(prepare.required).toEqual(['formatId'])
    expect(prepare.properties.title).toMatchObject({ maxLength: 80 })
  })
})

describe('setup agent tools: formats and suggestions', () => {
  it('lists every format with its columns and duration, in the UI language', async () => {
    const en = await make('en').tool('retro_list_formats').run({})
    const fr = await make('fr').tool('retro_list_formats').run({})
    const list = (en.ok ? (en.data as { formats: { id: string; name: string; description: string; minutes: [number, number]; columns: string[] }[] }).formats : [])
    expect(list).toHaveLength(TEMPLATES.length)
    for (const f of list) {
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.description).toBeTruthy()
      expect(f.minutes[0]).toBeGreaterThan(0)
      expect(f.minutes[1]).toBeGreaterThanOrEqual(f.minutes[0])
      expect(f.columns.length).toBeGreaterThan(1)
    }
    expect(JSON.stringify(en)).not.toEqual(JSON.stringify(fr))
  })

  it('suggestions carry the id, the localised name and the reasons', async () => {
    const out = await make('en').tool('retro_suggest_format').run({ goal: 'fix', mood: 2, minutes: 60 })
    const s = (out.ok ? (out.data as Suggest).suggestions : [])
    expect(s.length).toBeGreaterThan(0)
    for (const x of s) {
      expect(TEMPLATES.some((t) => t.id === x.id)).toBe(true)
      expect(x.name).toBeTruthy()
      expect(x.reasons.length).toBeGreaterThan(0)
    }
    const fr = await make('fr').tool('retro_suggest_format').run({ goal: 'fix', mood: 2, minutes: 60 })
    expect((fr.ok ? (fr.data as Suggest).suggestions : [])[0]!.id).toBe(s[0]!.id)
    expect((fr.ok ? (fr.data as Suggest).suggestions : [])[0]!.name).not.toBe(s[0]!.name)
  })

  it('clamps mood to 1..5 and minutes to 10..180, defaults to mood 3 and 45 minutes', async () => {
    const { tool } = make()
    const run = async (input: Record<string, unknown>) => JSON.stringify(await tool('retro_suggest_format').run({ goal: 'ideas', ...input }))
    expect(await run({ mood: 99 })).toBe(await run({ mood: 5 }))
    expect(await run({ mood: -4 })).toBe(await run({ mood: 1 }))
    expect(await run({ mood: 2.6 })).toBe(await run({ mood: 3 }))
    expect(await run({ minutes: 9999 })).toBe(await run({ minutes: 180 }))
    expect(await run({ minutes: 1 })).toBe(await run({ minutes: 10 }))
    expect(await run({})).toBe(await run({ mood: 3, minutes: 45 }))
  })

  it('refuses an unknown goal and names the valid ones', async () => {
    const out = await make().tool('retro_suggest_format').run({ goal: 'party' })
    expect(out).toEqual({ ok: false, error: 'goal must be one of celebrate, fix, ideas, learn, conflict, quick' })
    expect((await make().tool('retro_suggest_format').run({})).ok).toBe(false)
  })
})

describe('setup agent tools: prepare the form', () => {
  it('refuses an unknown or missing format and points to the list tool', async () => {
    const { tool, prepared } = make()
    expect(await tool('retro_prepare_board').run({ formatId: 'nope' })).toEqual({ ok: false, error: 'Unknown format. Use retro_list_formats.' })
    expect((await tool('retro_prepare_board').run({})).ok).toBe(false)
    expect((await tool('retro_prepare_board').run({ formatId: 42 })).ok).toBe(false)
    expect(prepared).toEqual([])
  })

  it('refuses an unknown theme and lists the valid ones', async () => {
    const { tool, prepared } = make()
    expect(await tool('retro_prepare_board').run({ formatId: 'daki', themeId: 'neon' })).toEqual({ ok: false, error: 'themeId must be one of studio, halloween' })
    expect(prepared).toEqual([])
  })

  it('prepares the form with a trimmed title, drops a blank title, and tells the human to click Create', async () => {
    const { tool, prepared } = make()
    const out = await tool('retro_prepare_board').run({ formatId: 'daki', title: '  Sprint 43  ', themeId: 'studio' })
    expect(out).toEqual({ ok: true, data: { prepared: true, next: 'Ask the participant to review the form and click Create.' } })
    await tool('retro_prepare_board').run({ formatId: 'daki', title: '   ' })
    await tool('retro_prepare_board').run({ formatId: 'daki' })
    expect(prepared).toEqual([
      { templateId: 'daki', title: 'Sprint 43', themeId: 'studio' },
      { templateId: 'daki', title: undefined, themeId: undefined },
      { templateId: 'daki', title: undefined, themeId: undefined },
    ])
  })
})
