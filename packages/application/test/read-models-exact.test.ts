import { type AgendaState, localizeTemplate, MIN, type Snapshot, type SnapshotGroup, type SnapshotNote, suggestTemplates, TEMPLATES } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { type AgentTool, type ColumnItem, createSetupAgentTools, EMPTY_FILTER, filterItems, groupSimilarPlan, phaseAvailability, phaseStepper, similarIdeas, similarity, tokens, voteStats } from '../src'

const note = (id: string, over: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: `idea ${id}`, color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...over,
})

describe('phase availability, exactly', () => {
  const agenda = (over: Partial<AgendaState> = {}): AgendaState => ({
    phases: [{ id: 'a', kind: 'write', plannedMs: MIN }, { id: 'b', kind: 'vote', plannedMs: MIN }], current: 0, startedAt: 0, pausedAt: null, rules: true, autoPublish: true, ...over,
  })
  it('keeps every vote command open while the facilitator opened voting, and nothing else', () => {
    const open = { allowed: true, canOverride: false, closedBy: null, opensAt: null }
    for (const command of ['vote.add', 'vote.remove', 'vote.toggle'] as const) {
      expect(phaseAvailability(agenda(), command, false)).toMatchObject({ allowed: false, closedBy: 'write', opensAt: 'vote' })
      expect(phaseAvailability(agenda({ voteOpen: true }), command, false), command).toEqual(open)
    }
    expect(phaseAvailability(agenda({ voteOpen: true }), 'note.add', false)).toEqual(open)
    expect(phaseAvailability(agenda({ voteOpen: true }), 'note.group', false)).toMatchObject({ allowed: false, closedBy: 'write' })
  })
})

describe('setup tools, exactly', () => {
  const make = (locale: 'fr' | 'en' = 'en') => {
    const prepared: unknown[] = []
    const tools = createSetupAgentTools({ locale: () => locale, prepare: (c) => prepared.push(c), themeIds: () => ['studio', 'noel'] })
    return { prepared, tool: (name: string) => tools.find((t) => t.name === name) as AgentTool<Record<string, unknown>> }
  }

  it('describes its inputs exactly', () => {
    const { tool } = make()
    expect(tool('retro_suggest_format').inputSchema).toStrictEqual({ type: 'object', properties: {
      goal: { type: 'string', enum: ['celebrate', 'fix', 'ideas', 'learn', 'conflict', 'quick'] }, mood: { type: 'integer', minimum: 1, maximum: 5 }, minutes: { type: 'integer', minimum: 10, maximum: 180 },
    }, required: ['goal'], additionalProperties: false })
    expect(tool('retro_prepare_board').inputSchema).toStrictEqual({ type: 'object', properties: { title: { type: 'string', maxLength: 80 }, formatId: { type: 'string' }, themeId: { type: 'string' } }, required: ['formatId'], additionalProperties: false })
  })

  it('lists the column titles of every format', async () => {
    const out = await make('fr').tool('retro_list_formats').run({})
    const formats = (out as { data: { formats: { id: string; columns: unknown[] }[] } }).data.formats
    for (const f of formats) {
      const t = localizeTemplate(TEMPLATES.find((x) => x.id === f.id)!, 'fr')
      expect(f.columns).toEqual(t.columns.map((c) => c.title))
    }
  })

  it('suggests in the language of the page, with time and mood kept within bounds', async () => {
    const run = async (input: Record<string, unknown>, locale: 'fr' | 'en' = 'en') => ((await make(locale).tool('retro_suggest_format').run(input)) as { data: { suggestions: { id: string; name: string }[] } }).data.suggestions
    const ids = async (input: Record<string, unknown>) => (await run(input)).map((s) => s.id)
    const direct = (minutes: number, mood = 3) => suggestTemplates({ goal: 'fix', mood, minutes }).map((s) => s.template.id)
    expect(await ids({ goal: 'fix', minutes: 500 })).toEqual(direct(180))
    expect(await ids({ goal: 'fix', minutes: 1 })).toEqual(direct(10))
    expect(await ids({ goal: 'fix', minutes: 20 })).toEqual(direct(20))
    expect(await ids({ goal: 'fix' })).toEqual(direct(45))
    expect(await ids({ goal: 'fix', mood: 9 })).toEqual(direct(45, 5))
    expect(await ids({ goal: 'fix', mood: -3 })).toEqual(direct(45, 1))
    const fr = await run({ goal: 'fix' }, 'fr')
    const first = suggestTemplates({ goal: 'fix', mood: 3, minutes: 45 })[0]!.template
    expect(fr[0]!.name).toBe(localizeTemplate(first, 'fr').name)
  })

  it('prepares the form with a trimmed title, and refuses anything but a known format', async () => {
    const { prepared, tool } = make()
    const prepare = tool('retro_prepare_board')
    await prepare.run({ formatId: 'daki', title: '  Sprint  ', themeId: 'noel' })
    await prepare.run({ formatId: 'daki', title: '   ' })
    expect(prepared).toEqual([{ templateId: 'daki', title: 'Sprint', themeId: 'noel' }, { templateId: 'daki', title: undefined, themeId: undefined }])
    for (const input of [{ formatId: 5 }, {}, { formatId: 'nope' }]) expect(await prepare.run(input as never), JSON.stringify(input)).toMatchObject({ ok: false })
    expect(await prepare.run({ formatId: 'daki', themeId: 'nope' })).toMatchObject({ ok: false })
  })
})

describe('phase stepper, exactly', () => {
  const agenda = (current: number, phases: AgendaState['phases'], startedAt = 0): AgendaState => ({ phases, current, startedAt, pausedAt: null, rules: true, autoPublish: true })
  const three = [{ id: 'a', kind: 'checkin' as const, plannedMs: 10 * MIN, actualMs: 4 * MIN }, { id: 'b', kind: 'write' as const, plannedMs: 20 * MIN }, { id: 'c', kind: 'vote' as const, plannedMs: 30 * MIN }]

  it('fills a done step, a part of the running one, and nothing for a step to come', () => {
    const s = phaseStepper(agenda(1, three, 0), 5 * MIN)
    expect(s.steps.map((x) => [x.state, x.fill, x.spentMs, x.skipped])).toEqual([['done', 1, 4 * MIN, false], ['current', 0.25, 5 * MIN, false], ['todo', 0, null, false]])
    expect(s.next).toBe('vote')
    expect(s.started).toBe(true)
    expect(s.ended).toBe(false)
  })

  it('has no fill for a running phase without a plan, and marks skipped ones', () => {
    const phases = [{ id: 'a', kind: 'checkin' as const, plannedMs: 10 * MIN }, { id: 'b', kind: 'write' as const, plannedMs: 0 }]
    const s = phaseStepper(agenda(1, phases), 5 * MIN)
    expect(s.steps[1]).toMatchObject({ state: 'current', fill: 0 })
    expect(s.steps[0]).toMatchObject({ state: 'done', skipped: true, spentMs: 0 })
  })

  it('names the first phase as next before the start, and the one after the first when it runs', () => {
    expect(phaseStepper(agenda(-1, three), 0)).toMatchObject({ next: 'checkin', started: false, ended: false })
    expect(phaseStepper(agenda(0, three), 0)).toMatchObject({ next: 'write', started: true })
    expect(phaseStepper(agenda(2, three), 0).next).toBeNull()
    expect(phaseStepper(agenda(3, three), 0)).toMatchObject({ ended: true, next: null })
    expect(phaseStepper(agenda(3, three), 0).steps.every((x) => x.state === 'done')).toBe(true)
  })
})

describe('vote statistics, exactly', () => {
  const col = (id: string, votable?: boolean) => ({ id, title: id, ...(votable === undefined ? {} : { votable }) })
  const snap = (notes: SnapshotNote[], columns = [col('c1'), col('c2')], voteLimit = 5, groups: SnapshotGroup[] = []) => ({ notes, groups, columns, settings: { voteLimit } }) as unknown as Pick<Snapshot, 'notes' | 'groups' | 'columns' | 'settings'>

  it('copes with a board without any idea', () => {
    expect(voteStats(snap([]))).toMatchObject({ totalVotes: 0, top: [], votedIdeas: 0, spread: null, usedShare: null })
  })

  it('leaves out columns without voting', () => {
    const s = voteStats(snap([note('a', { votes: 1 }), note('b', { columnId: 'c2', votes: 1 })], [col('c1'), col('c2', false), col('c3', true)]))!
    expect(s.perColumn.map((c) => c.columnId)).toEqual(['c1', 'c3'])
  })

  it('knows the votes available only for a number of participants above zero', () => {
    const notes = [note('a', { votes: 2 })]
    expect(voteStats(snap(notes))!.votesAvailable).toBeNull()
    expect(voteStats(snap(notes), 0)!.votesAvailable).toBeNull()
    expect(voteStats(snap(notes), -2)!.votesAvailable).toBeNull()
    expect(voteStats(snap(notes), -2)!.usedShare).toBeNull()
    expect(voteStats(snap(notes), 1)).toMatchObject({ votesAvailable: 5, usedShare: 0.4 })
    expect(voteStats(snap([note('a', { votes: 9 })]), 1)!.usedShare).toBe(1)
  })

  it('calls the vote concentrated from exactly 70% on the top three', () => {
    const at = (votes: number[]) => voteStats(snap(votes.map((v, i) => note(`n${i}`, { votes: v }))))!.spread
    expect(at([3, 2, 2, 1, 1, 1])).toBe('concentrated')
    expect(at([3, 2, 2, 1, 1, 2])).toBe('balanced')
  })
})

describe('grouping similar ideas, exactly', () => {
  it('labels with the shortest idea and keeps the creation order of the notes', () => {
    const notes = [note('a', { text: 'Slow deployments every single week' }), note('b', { text: 'Slow deployments every week' }), note('c', { text: 'Slow deployments' })]
    const plan = groupSimilarPlan({ notes }, 'c1')
    expect(plan).toEqual([{ label: 'Slow deployments', noteIds: ['a', 'b', 'c'] }])
    const padded = groupSimilarPlan({ notes: [note('a', { text: 'Slow deployments every week' }), note('b', { text: '  Slow deployments  ' })] }, 'c1')
    expect(padded[0]!.label).toBe('Slow deployments')
  })

  it('needs the overlap to reach the threshold, measured on the smaller idea', () => {
    const at = (a: string, b: string) => groupSimilarPlan({ notes: [note('a', { text: a }), note('b', { text: b })] }, 'c1').length
    expect(at('alpha beta gamma delta', 'alpha beta gamma epsilon')).toBe(1)
    expect(at('alpha beta gamma delta', 'alpha beta epsilon zeta')).toBe(0)
    expect(at('alpha beta', 'alpha beta gamma delta epsilon zeta')).toBe(1)
    expect(at('', '')).toBe(0)
    expect(at('the', 'alpha')).toBe(0)
  })
})

describe('similar ideas and filters, exactly', () => {
  it('takes an idea at exactly the threshold, not under', () => {
    const notes = [note('a', { text: 'alpha beta gamma epsilon' }), note('b', { text: 'alpha beta zeta eta' })]
    expect(similarIdeas('alpha beta gamma delta', notes, 'c1').map((n) => n.id)).toEqual(['a'])
  })

  it('stems plurals, endings and the final e, only on words long enough', () => {
    const stem = (w: string) => [...tokens(w)][0]
    const cases: [string, string][] = [
      ['boxes', 'box'], ['ones', 'one'], ['syringes', 'syr'], ['impedes', 'imp'], ['escape', 'escap'],
      ['bugs', 'bug'], ['bus', 'bus'], ['index', 'ind'], ['meetings', 'meet'], ['meeting', 'meet'], ['bring', 'bring'], ['string', 'str'], ['garden', 'garden'],
      ['deployed', 'deploy'], ['need', 'need'], ['speed', 'spe'], ['garden', 'garden'], ['make', 'mak'], ['one', 'one'], ['rate', 'rat'], ['mess', 'mes'],
    ]
    for (const [word, expected] of cases) expect(stem(word), word).toBe(expected)
  })

  it('drops one-letter words, stop words and punctuation', () => {
    expect([...tokens('x the Deploy !!! of')]).toEqual(['deploy'])
    expect(tokens('!!!').size).toBe(0)
    expect(tokens('').size).toBe(0)
  })

  it('scores close forms by trigrams, exactly from 0.7 and for words of five letters', () => {
    expect(similarity('abcdefghij', 'abcdefghxy')).toBeCloseTo(0.7, 10)
    expect(similarity('abcdefgxyz', 'abcdefghij')).toBe(0)
    expect(similarity('abcdp', 'abcdpq')).toBeCloseTo(8 / 11, 10)
    expect(similarity('abcdpq', 'abcdp')).toBeCloseTo(8 / 11, 10)
    expect(similarity('abcdp', 'abcdq')).toBe(0)
    expect(similarity('abcd', 'abcdcd')).toBe(0)
    expect(similarity('abcdcd', 'abcd')).toBe(0)
    expect(similarity('bug', 'bug')).toBe(1)
    expect(similarity('', 'deploy')).toBe(0)
    expect(similarity('deploy', '')).toBe(0)
    expect(similarity('deploy', 'deploy fast')).toBe(1)
    expect(similarity('deploy', 'deploy fast quickly')).toBeCloseTo(0.6, 10)
  })

  it('measures from the smaller idea, and from the first one when they have the same size', () => {
    expect(similarity('abcdefghxy abcdefghzw', 'abcdefghij qrstuvwxyz')).toBeCloseTo(0.7, 10)
    expect(similarity('abcdefghij qrstuvwxyz', 'abcdefghxy abcdefghzw')).toBeCloseTo(0.35, 10)
    expect(similarity('abcdefghij', 'abcdefghxy abcdefghzw qrstuvwxyz')).toBeCloseTo(0.7 * 0.6, 10)
  })

  it('keeps a cluster that has no notes when nothing is filtered, and a cluster whose title matches whatever the spaces', () => {
    const empty: ColumnItem = { kind: 'group', key: 'g', group: { id: 'g', title: 'Empty' } as unknown as SnapshotGroup, notes: [], votes: 0, title: 'Empty' }
    expect(filterItems([empty], EMPTY_FILTER)).toEqual([empty])
    const g: ColumnItem = { kind: 'group', key: 'h', group: { id: 'h', title: 'Deploy' } as unknown as SnapshotGroup, notes: [note('x', { text: 'unrelated' })], votes: 0, title: 'Deploy' }
    expect(filterItems([g], { ...EMPTY_FILTER, text: ' DEPLOY ' })).toEqual([g])
    expect(filterItems([g], { ...EMPTY_FILTER, text: 'other' })).toEqual([])
  })
})
