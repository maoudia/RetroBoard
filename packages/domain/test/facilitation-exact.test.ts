import { alice, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type AgendaState, type BoardState, type Command, createBoard, DEFAULT_COLUMN_ICON, getTemplate, LIMITS, MIN, NOTE_TEXT_MIN, type Outcome, reduce } from '../src'

const CLEAN = { meta: false, notes: [], groups: [], actions: [], wipe: false }
const META = { ...CLEAN, meta: true }
let n = 0
/** Straight to the reducer, with a fixed clock, so the wire schema cannot refuse first. */
const run = (state: BoardState, command: unknown, now = 10_000): Outcome => reduce(state, command as Command, alice, { now, newId: () => `id${n++}` })
const ok = (o: Outcome) => { if (!o.ok) throw new Error(o.error); return o }
const fresh = () => createBoard({ newId: () => `c${n++}` })
const phase = (id: string, kind: AgendaState['phases'][number]['kind'], minutes: number, actualMs?: number) => ({ id, kind, plannedMs: minutes * MIN, ...(actualMs === undefined ? {} : { actualMs }) })
const withAgenda = (state: BoardState, over: Partial<AgendaState> = {}): BoardState => ({ ...state, agenda: { phases: [phase('p0', 'write', 10), phase('p1', 'group', 10), phase('p2', 'close', 5)], current: 0, startedAt: 0, pausedAt: null, rules: true, autoPublish: true, ...over } })

describe('setting up a board, exactly', () => {
  it('needs an empty board and a template that exists', () => {
    const done = { ...fresh(), settings: { ...fresh().settings, initialized: true } }
    expect(run(done, { t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio' })).toEqual({ ok: false, error: 'not-empty' })
    expect(run(fresh(), { t: 'board.init', templateId: 'nope', themeId: 'studio' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('takes the columns of the template, the theme, the title and the options it is given, and says the board was wiped', () => {
    const out = ok(run(fresh(), { t: 'board.init', templateId: 'start-stop-continue', themeId: 'noel', title: 'Sprint 9', locale: 'en', openFacilitation: true, announceArrivals: false }))
    expect(out.state.settings).toMatchObject({ initialized: true, templateId: 'start-stop-continue', themeId: 'noel', title: 'Sprint 9', locale: 'en', openFacilitation: true, announceArrivals: false })
    expect(out.state.columns).toHaveLength(getTemplate('start-stop-continue')!.columns.length)
    expect(out.dirty).toEqual({ ...META, wipe: true })
    const plain = ok(run(fresh(), { t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio' }))
    expect(plain.state.settings.title).toBe(fresh().settings.title)
    for (const key of ['locale', 'announceArrivals']) expect(plain.state.settings, key).not.toHaveProperty(key)
    expect(plain.state.settings.openFacilitation).toBe(fresh().settings.openFacilitation)
  })

  it('takes custom columns when there are some, each with a new id, its subtitle, its icon, and its colour or vote setting only when given', () => {
    const out = ok(run(fresh(), { t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', columns: [{ title: 'One' }, { title: 'Two', subtitle: 'sub', icon: 'bug', color: 0, votable: false }, { title: 'Three', votable: true }] }))
    const [one, two, three] = out.state.columns
    expect(one).toStrictEqual({ id: expect.any(String), title: 'One', subtitle: '', icon: DEFAULT_COLUMN_ICON })
    expect(two).toStrictEqual({ id: expect.any(String), title: 'Two', subtitle: 'sub', icon: 'bug', color: 0, votable: false })
    expect(three).toStrictEqual({ id: expect.any(String), title: 'Three', subtitle: '', icon: DEFAULT_COLUMN_ICON })
    expect(new Set(out.state.columns.map((c) => c.id)).size).toBe(3)
    const none = ok(run(fresh(), { t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', columns: [] }))
    expect(none.state.columns).toHaveLength(getTemplate('start-stop-continue')!.columns.length)
  })
})

describe('changing the format, exactly', () => {
  const many = getTemplate('starfish')!
  const few = getTemplate('start-stop-continue')!

  it('refuses an unknown format, and a format change that would lose notes unless it says how', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x' }, alice)
    expect(run(h.state, { t: 'template.apply', templateId: 'nope' })).toEqual({ ok: false, error: 'not-found' })
    expect(run(h.state, { t: 'template.apply', templateId: 'daki' })).toEqual({ ok: false, error: 'not-empty' })
  })

  it('wipes the board when asked to (mode or the old flag), or when there is nothing to keep', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x' }, alice)
    for (const cmd of [{ t: 'template.apply', templateId: 'daki', mode: 'wipe' }, { t: 'template.apply', templateId: 'daki', wipe: true }]) {
      const out = ok(run(h.state, cmd))
      expect(out.state.notes).toEqual({})
      expect(out.state.groups).toEqual({})
      expect(out.state.settings.templateId).toBe('daki')
      expect(out.dirty).toEqual({ ...META, wipe: true })
    }
    const empty = ok(run(harness().state, { t: 'template.apply', templateId: 'daki' }))
    expect(empty.dirty).toEqual({ ...META, wipe: true })
    expect(empty.state.columns).toHaveLength(getTemplate('daki')!.columns.length)
  })

  it('keeps the notes when asked to migrate: columns keep their ids by position, extra old columns collapse into the last new one', () => {
    const h = harness()
    h.run({ t: 'board.init', templateId: 'starfish', themeId: 'studio' })
    const cols = h.state.columns.map((c) => c.id)
    expect(cols).toHaveLength(many.columns.length)
    const add = (text: string, col: number) => { h.run({ t: 'note.add', columnId: cols[col]!, text }, alice); return Object.values(h.state.notes).find((x) => x.text === text)!.id }
    const first = add('first', 0)
    const last = add('last', cols.length - 1)
    const second = add('second', 1)
    h.run({ t: 'note.group', id: second, ontoId: add('also second', 1) })
    const out = ok(run(h.state, { t: 'template.apply', templateId: 'start-stop-continue', mode: 'migrate' }))
    const ids = out.state.columns.map((c) => c.id)
    expect(ids).toEqual(cols.slice(0, few.columns.length))
    expect(out.state.notes[first]!.columnId).toBe(ids[0])
    expect(out.state.notes[second]!.columnId).toBe(ids[1])
    expect(out.state.notes[last]!.columnId).toBe(ids[ids.length - 1])
    const g = h.state.notes[second]!.groupId!
    expect(out.state.groups[g]!.columnId).toBe(ids[1])
    expect(out.dirty.meta).toBe(true)
    expect(out.dirty.wipe).toBe(false)
    expect([...out.dirty.notes].sort()).toEqual(Object.values(h.state.notes).filter((x) => out.state.notes[x.id]!.columnId !== x.columnId).map((x) => x.id).sort())
    expect(out.dirty.notes).not.toContain(first)
    expect(out.dirty.groups).toEqual([])
    expect(out.state.settings.templateId).toBe('start-stop-continue')
  })

  it('moves a cluster and its notes to the last new column when its column is gone, and names it as changed', () => {
    const h = harness()
    h.run({ t: 'board.init', templateId: 'starfish', themeId: 'studio' })
    const lastCol = h.state.columns[h.state.columns.length - 1]!.id
    h.run({ t: 'note.add', columnId: lastCol, text: 'a' }, alice)
    h.run({ t: 'note.add', columnId: lastCol, text: 'b' }, alice)
    const [a, b] = Object.keys(h.state.notes) as [string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    const g = h.state.notes[a]!.groupId!
    const out = ok(run(h.state, { t: 'template.apply', templateId: 'start-stop-continue', mode: 'migrate' }))
    const newLast = out.state.columns[out.state.columns.length - 1]!.id
    expect(out.state.groups[g]!.columnId).toBe(newLast)
    expect(out.dirty.groups).toEqual([g])
    expect(out.state.notes[a]!.columnId).toBe(newLast)
    expect(out.dirty.notes).toEqual(expect.arrayContaining([a, b]))
  })

  it('sends a note or cluster whose column is unknown to the last new column', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
    const [id] = Object.keys(h.state.notes) as [string]
    const state = { ...h.state, notes: { ...h.state.notes, [id]: { ...h.state.notes[id]!, columnId: 'ghost' } }, groups: { g: { id: 'g', columnId: 'ghost', title: '', voters: [] } } } as unknown as BoardState
    const out = ok(run(state, { t: 'template.apply', templateId: 'start-stop-continue', mode: 'migrate' }))
    const last = out.state.columns[out.state.columns.length - 1]!.id
    expect(out.state.notes[id]!.columnId).toBe(last)
    expect(out.state.groups.g!.columnId).toBe(last)
  })

  it('leaves a note whose column already has its place where it is', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'stay' }, alice)
    const out = ok(run(h.state, { t: 'template.apply', templateId: 'went-well', mode: 'migrate' }))
    expect(out.dirty.notes).toEqual([])
    expect(out.dirty.groups).toEqual([])
  })
})

describe('settings, exactly', () => {
  const settings = harness().state.settings

  it('keeps every setting that is not named', () => {
    const base = { ...harness().state, settings: { ...settings, title: 'T', voteLimit: 4, maxVotesPerItem: 2, votable: 'clusters' as const, secretVoting: true, locked: true, browserAgentsAllowed: true, openFacilitation: true, actionMode: 'workflow' as const, themeId: 'noel', talkMode: 'ring' as const, talkBudgetMs: 90_000, talkSelfStart: true, noteMaxLength: 80 } }
    const out = ok(run(base, { t: 'settings.update' }))
    expect(out.state.settings).toEqual(base.settings)
    expect(out.dirty).toEqual(META)
  })

  it('applies every setting that is named, the talk budget in seconds', () => {
    const out = ok(run(harness().state, { t: 'settings.update', title: 'New', voteLimit: 7, maxVotesPerItem: 3, votable: 'notes', secretVoting: true, locked: true, browserAgentsAllowed: true, openFacilitation: true, actionMode: 'workflow', themeId: 'sakura', talkMode: 'popup', talkBudgetSec: 45, talkSelfStart: true, noteMaxLength: 100 }))
    expect(out.state.settings).toMatchObject({ title: 'New', voteLimit: 7, maxVotesPerItem: 3, votable: 'notes', secretVoting: true, locked: true, browserAgentsAllowed: true, openFacilitation: true, actionMode: 'workflow', themeId: 'sakura', talkMode: 'popup', talkBudgetMs: 45_000, talkSelfStart: true, noteMaxLength: 100 })
  })

  it('never lets the cap on one item go above the budget of a person, whichever is changed', () => {
    const base = { ...harness().state, settings: { ...settings, voteLimit: 6, maxVotesPerItem: 4 } }
    expect(ok(run(base, { t: 'settings.update', voteLimit: 2 })).state.settings).toMatchObject({ voteLimit: 2, maxVotesPerItem: 2 })
    expect(ok(run(base, { t: 'settings.update', maxVotesPerItem: 9 })).state.settings).toMatchObject({ voteLimit: 6, maxVotesPerItem: 6 })
    expect(ok(run(base, { t: 'settings.update', voteLimit: 9, maxVotesPerItem: 1 })).state.settings).toMatchObject({ voteLimit: 9, maxVotesPerItem: 1 })
  })

  it('takes a note length from the minimum to the maximum, whole numbers only', () => {
    for (const good of [NOTE_TEXT_MIN, LIMITS.noteText, 100]) expect(run(harness().state, { t: 'settings.update', noteMaxLength: good }).ok, String(good)).toBe(true)
    for (const bad of [NOTE_TEXT_MIN - 1, LIMITS.noteText + 1, 50.5, Number.NaN, -1]) expect(run(harness().state, { t: 'settings.update', noteMaxLength: bad }), String(bad)).toEqual({ ok: false, error: 'invalid' })
  })

  it('records whether voting is enabled when it is said or was said before, and nothing otherwise', () => {
    const state = harness().state
    expect(state.settings.votingEnabled).toBeUndefined()
    expect(ok(run(state, { t: 'settings.update', title: 'x' })).state.settings).not.toHaveProperty('votingEnabled')
    expect(ok(run(state, { t: 'settings.update', votingEnabled: false })).state.settings.votingEnabled).toBe(false)
    expect(ok(run(state, { t: 'settings.update', votingEnabled: true })).state.settings.votingEnabled).toBe(true)
    const was = { ...state, settings: { ...state.settings, votingEnabled: false } }
    expect(ok(run(was, { t: 'settings.update', title: 'x' })).state.settings.votingEnabled).toBe(false)
    expect(ok(run(was, { t: 'settings.update', votingEnabled: true })).state.settings.votingEnabled).toBe(true)
  })

  it('records arrivals and display sizes only when they are given, and only valid sizes', () => {
    const plain = ok(run(harness().state, { t: 'settings.update', title: 'x' })).state.settings
    for (const key of ['announceArrivals', 'noteSize', 'noteText']) expect(plain, key).not.toHaveProperty(key)
    expect(ok(run(harness().state, { t: 'settings.update', announceArrivals: false })).state.settings.announceArrivals).toBe(false)
    expect(ok(run(harness().state, { t: 'settings.update', noteSize: 'large', noteText: 'small' })).state.settings).toMatchObject({ noteSize: 'large', noteText: 'small' })
    const bad = ok(run(harness().state, { t: 'settings.update', noteSize: 'huge', noteText: 'tiny' })).state.settings
    expect(bad).not.toHaveProperty('noteSize')
    expect(bad).not.toHaveProperty('noteText')
  })
})

describe('the reveal countdown and the timer, exactly', () => {
  it('counts down from 3 to 30 seconds, 5 by default, whole seconds, and marks the room as changed', () => {
    const at = (seconds?: number) => ok(run(harness().state, { t: 'drafts.reveal', ...(seconds === undefined ? {} : { seconds }) }, 1_000))
    expect(at().state.reveal).toEqual({ endsAt: 6_000 })
    expect(at(10).state.reveal).toEqual({ endsAt: 11_000 })
    expect(at(1).state.reveal).toEqual({ endsAt: 4_000 })
    expect(at(99).state.reveal).toEqual({ endsAt: 31_000 })
    expect(at(7.9).state.reveal).toEqual({ endsAt: 8_000 })
    expect(at().dirty).toEqual(META)
  })

  it('starts from what was left, else the whole length, and does nothing when it already runs', () => {
    const base = harness().state
    const idle = { ...base, timer: { running: false, endsAt: 0, remaining: 0, length: 300_000 } }
    expect(ok(run(idle, { t: 'timer.start' }, 1_000)).state.timer).toEqual({ running: true, endsAt: 301_000, remaining: 300_000, length: 300_000 })
    const paused = { ...base, timer: { running: false, endsAt: 0, remaining: 40_000, length: 300_000 } }
    expect(ok(run(paused, { t: 'timer.start' }, 1_000)).state.timer).toMatchObject({ running: true, endsAt: 41_000, remaining: 40_000 })
    const running = { ...base, timer: { running: true, endsAt: 9_000, remaining: 1, length: 300_000 } }
    const again = ok(run(running, { t: 'timer.start' }))
    expect(again.dirty).toEqual(CLEAN)
    expect(again.state).toBe(running)
  })

  it('pauses with what is left, never below zero, and does nothing when it is not running', () => {
    const base = harness().state
    const running = { ...base, timer: { running: true, endsAt: 9_000, remaining: 1, length: 300_000 } }
    expect(ok(run(running, { t: 'timer.pause' }, 4_000)).state.timer).toEqual({ running: false, endsAt: 0, remaining: 5_000, length: 300_000 })
    expect(ok(run(running, { t: 'timer.pause' }, 20_000)).state.timer.remaining).toBe(0)
    const idle = ok(run(base, { t: 'timer.pause' }))
    expect(idle.dirty).toEqual(CLEAN)
    expect(idle.state).toBe(base)
  })

  it('resets to the length asked for, or the last one, stopped', () => {
    const base = { ...harness().state, timer: { running: true, endsAt: 9_000, remaining: 1, length: 300_000 } }
    expect(ok(run(base, { t: 'timer.reset', minutes: 2 })).state.timer).toEqual({ running: false, endsAt: 0, remaining: 120_000, length: 120_000 })
    expect(ok(run(base, { t: 'timer.reset' })).state.timer).toEqual({ running: false, endsAt: 0, remaining: 300_000, length: 300_000 })
    expect(ok(run(base, { t: 'timer.reset' })).dirty).toEqual(META)
  })

  it('restarts the clock of the running phase with the timer when asked, a paused phase staying paused', () => {
    const running = withAgenda(harness().state, { startedAt: 500, pausedAt: null })
    const paused = withAgenda(harness().state, { startedAt: 500, pausedAt: 700 })
    expect(ok(run(running, { t: 'timer.reset', agendaClock: true }, 9_000)).state.agenda).toMatchObject({ startedAt: 9_000, pausedAt: null })
    expect(ok(run(paused, { t: 'timer.reset', agendaClock: true }, 9_000)).state.agenda).toMatchObject({ startedAt: 9_000, pausedAt: 9_000 })
    expect(ok(run(running, { t: 'timer.reset' }, 9_000)).state.agenda).toMatchObject({ startedAt: 500, pausedAt: null })
    expect(ok(run(withAgenda(harness().state, { current: -1 }), { t: 'timer.reset', agendaClock: true }, 9_000)).state.agenda).toMatchObject({ startedAt: 0 })
    expect(ok(run(harness().state, { t: 'timer.reset', agendaClock: true })).state.agenda).toBeNull()
  })
})

describe('emptying and closing, exactly', () => {
  function filled() {
    const h = harness()
    h.run({ t: 'settings.update', secretVoting: true })
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
    h.run({ t: 'note.add', columnId: h.col(0), text: 'b' }, alice)
    h.run({ t: 'note.add', columnId: h.col(1), text: 'c' }, alice)
    const [a, b, c] = Object.keys(h.state.notes) as [string, string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'vote.add', kind: 'note', id: c }, alice)
    return { h, a, b, c, group: h.state.notes[a]!.groupId! }
  }

  it('empties one column, its notes and clusters, and keeps the others', () => {
    const { h, c, group } = filled()
    const out = ok(run(h.state, { t: 'column.reset', id: h.col(0) }))
    expect(Object.keys(out.state.notes)).toEqual([c])
    expect(out.state.groups).toEqual({})
    expect(out.dirty).toEqual({ ...META, wipe: true })
    const other = ok(run(h.state, { t: 'column.reset', id: h.col(1) }))
    expect(Object.keys(other.state.groups)).toEqual([group])
    expect(Object.keys(other.state.notes)).toHaveLength(2)
    expect(run(h.state, { t: 'column.reset', id: 'nope' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('clears every vote and reopens voting', () => {
    const { h, c, group } = filled()
    h.run({ t: 'vote.add', kind: 'cluster', id: group }, alice)
    const closed = { ...h.state, settings: { ...h.state.settings, votingClosed: true } }
    const out = ok(run(closed, { t: 'vote.reset' }))
    expect(Object.values(out.state.notes).every((x) => x.voters.length === 0)).toBe(true)
    expect(out.state.groups[group]!.voters).toEqual([])
    expect(out.state.notes[c]!.text).toBe('c')
    expect(out.state.settings.votingClosed).toBe(false)
    expect(out.dirty).toEqual({ ...META, wipe: true })
  })

  it('resets the board: content, actions and clocks go, and the agenda starts over', () => {
    const { h } = filled()
    h.run({ t: 'action.add', text: 'x', owner: '' })
    const state = withAgenda({ ...h.state, timer: { running: true, endsAt: 99, remaining: 1, length: 600_000 }, reveal: { endsAt: 5 }, roti: { x: 3 } }, { current: 1, startedAt: 7, pausedAt: 8 })
    const out = ok(run(state, { t: 'board.reset' }))
    expect(out.state).toMatchObject({ notes: {}, groups: {}, actions: {}, reveal: null, roti: {}, timer: { running: false, endsAt: 0, remaining: 600_000, length: 600_000 }, agenda: { current: -1, startedAt: 0, pausedAt: null } })
    expect(out.state.talk).toEqual({ active: null, totals: {} })
    expect(out.dirty).toEqual({ ...META, wipe: true })
    expect(ok(run(h.state, { t: 'board.reset' })).state.agenda).toBeNull()
  })

  it('destroys the board for good: locked, destroyed, empty, no agenda', () => {
    const state = withAgenda(filled().h.state)
    const out = ok(run(state, { t: 'board.destroy' }))
    expect(out.state).toMatchObject({ notes: {}, groups: {}, actions: {}, agenda: null, settings: { locked: true, destroyed: true } })
    expect(out.dirty).toEqual({ ...META, wipe: true })
  })
})

describe('the agenda, exactly', () => {
  const idle = (over: Partial<AgendaState> = {}) => withAgenda(harness().state, over)
  const agendaOf = (o: Outcome) => ok(o).state.agenda!

  it('sets phases before the start or after the end, never while it runs, with the options given', () => {
    const phases = [{ kind: 'write', minutes: 5 }, { kind: 'close', minutes: 2 }]
    expect(run(idle(), { t: 'agenda.set', phases })).toEqual({ ok: false, error: 'invalid' })
    for (const current of [-1, 3]) {
      const out = ok(run(idle({ current }), { t: 'agenda.set', phases, rules: false, autoPublish: false, chain: true }))
      expect(out.state.agenda).toMatchObject({ current: -1, rules: false, autoPublish: false, chain: true })
      expect(out.state.agenda!.phases.map((p) => [p.kind, p.plannedMs])).toEqual([['write', 5 * MIN], ['close', 2 * MIN]])
      expect(out.dirty).toEqual(META)
    }
    expect(ok(run(harness().state, { t: 'agenda.set', phases })).state.agenda).toMatchObject({ rules: true, autoPublish: true, chain: false })
  })

  it('changes each option on its own, and says when there is no agenda', () => {
    expect(run(harness().state, { t: 'agenda.options', rules: false })).toEqual({ ok: false, error: 'not-found' })
    const base = idle({ rules: true, autoPublish: true, chain: false })
    expect(agendaOf(run(base, { t: 'agenda.options', rules: false }))).toMatchObject({ rules: false, autoPublish: true, chain: false })
    expect(agendaOf(run(base, { t: 'agenda.options', autoPublish: false }))).toMatchObject({ rules: true, autoPublish: false, chain: false })
    expect(agendaOf(run(base, { t: 'agenda.options', chain: true }))).toMatchObject({ rules: true, autoPublish: true, chain: true })
    expect(agendaOf(run(base, { t: 'agenda.options' }))).toMatchObject({ rules: true, autoPublish: true, chain: false })
    expect(ok(run(base, { t: 'agenda.options', chain: true })).dirty).toEqual(META)
  })

  it('clears the agenda', () => {
    const out = ok(run(idle(), { t: 'agenda.clear' }))
    expect(out.state.agenda).toBeNull()
    expect(out.dirty).toEqual(META)
  })

  it('starts the first phase now, resumes a paused phase without counting the pause, and does nothing when it already runs', () => {
    expect(run(harness().state, { t: 'agenda.start' })).toEqual({ ok: false, error: 'invalid' })
    expect(run(idle({ current: 3 }), { t: 'agenda.start' })).toEqual({ ok: false, error: 'invalid' })
    const started = ok(run(idle({ current: -1 }), { t: 'agenda.start' }, 5_000))
    expect(started.state.agenda).toMatchObject({ current: 0, startedAt: 5_000, pausedAt: null })
    expect(started.dirty).toEqual(META)
    const resumed = ok(run(idle({ current: 1, startedAt: 1_000, pausedAt: 4_000 }), { t: 'agenda.start' }, 9_000))
    expect(resumed.state.agenda).toMatchObject({ current: 1, startedAt: 6_000, pausedAt: null })
    expect(resumed.dirty).toEqual(META)
    const running = idle({ current: 1, startedAt: 1_000 })
    const again = ok(run(running, { t: 'agenda.start' }))
    expect(again.dirty).toEqual(CLEAN)
    expect(again.state).toBe(running)
  })

  it('pauses a running phase now, once', () => {
    expect(run(idle({ current: -1 }), { t: 'agenda.pause' })).toEqual({ ok: false, error: 'invalid' })
    expect(run(idle({ current: 3 }), { t: 'agenda.pause' })).toEqual({ ok: false, error: 'invalid' })
    const paused = ok(run(idle({ startedAt: 1_000 }), { t: 'agenda.pause' }, 6_000))
    expect(paused.state.agenda).toMatchObject({ pausedAt: 6_000 })
    expect(paused.dirty).toEqual(META)
    const again = ok(run(paused.state, { t: 'agenda.pause' }, 9_000))
    expect(again.dirty).toEqual(CLEAN)
    expect(again.state.agenda!.pausedAt).toBe(6_000)
  })

  it('goes to the next phase, recording the time of the one it leaves, dropping the voting override, and closing voting at the end', () => {
    expect(run(harness().state, { t: 'agenda.next' })).toEqual({ ok: false, error: 'invalid' })
    expect(run(idle({ current: 3 }), { t: 'agenda.next' })).toEqual({ ok: false, error: 'invalid' })
    const next = ok(run(idle({ startedAt: 1_000, voteOpen: true }), { t: 'agenda.next' }, 1_000 + 4 * MIN))
    expect(next.state.agenda).toMatchObject({ current: 1, startedAt: 1_000 + 4 * MIN, pausedAt: null })
    expect(next.state.agenda).not.toHaveProperty('voteOpen')
    expect(next.state.agenda!.phases[0]!.actualMs).toBe(4 * MIN)
    expect(next.state.settings.votingClosed).toBe(false)
    expect(next.dirty).toEqual(META)
    const last = ok(run(idle({ current: 2, startedAt: 0 }), { t: 'agenda.next' }, 2 * MIN))
    expect(last.state.agenda).toMatchObject({ current: 3 })
    expect(last.state.settings.votingClosed).toBe(true)
  })

  describe('handing over by itself', () => {
    const chained = (over: Partial<AgendaState> = {}) => idle({ chain: true, current: 0, startedAt: 0, ...over })
    const at = (state: BoardState, now: number, from = 0) => ok(run(state, { t: 'agenda.advance', from }, now))

    it('moves on once the planned time is nearly over, naming the phase it comes from, and not a moment sooner', () => {
      const state = chained()
      const planned = 10 * MIN
      expect(at(state, planned - 1_501).dirty).toEqual(CLEAN)
      const near = at(state, planned - 1_500)
      expect(near.state.agenda).toMatchObject({ current: 1, startedAt: planned - 1_500 })
      expect(near.dirty).toEqual(META)
      expect(near.state.agenda!.phases[0]!.actualMs).toBeDefined()
      expect(at(state, planned).state.agenda!.current).toBe(1)
    })

    it('never moves on when chaining is off, paused, for another phase, from the last phase, or without a running agenda', () => {
      const late = 99 * MIN
      expect(at(chained({ chain: false }), late).state.agenda!.current).toBe(0)
      expect(at(chained({ pausedAt: 99 * MIN }), late).state.agenda!.current).toBe(0)
      expect(at(chained(), late, 1).state.agenda!.current).toBe(0)
      expect(at(chained({ current: 2 }), late, 2).state.agenda!.current).toBe(2)
      expect(at(chained({ current: -1 }), late, -1).state.agenda!.current).toBe(-1)
      expect(at(harness().state, late).state.agenda).toBeNull()
      const state = chained()
      expect(at(state, late).dirty.meta).toBe(true)
      expect(at(chained({ chain: false }), late).state).toEqual(chained({ chain: false }))
    })
  })

  it('goes back to the previous phase, which continues with the time it had spent, and refuses at the start', () => {
    expect(run(harness().state, { t: 'agenda.prev' })).toEqual({ ok: false, error: 'invalid' })
    expect(run(idle({ current: 0 }), { t: 'agenda.prev' })).toEqual({ ok: false, error: 'invalid' })
    const base = idle({ current: 2, startedAt: 50_000, voteOpen: true })
    base.agenda!.phases[1]!.actualMs = 3 * MIN
    base.agenda!.phases[2]!.actualMs = 1 * MIN
    const out = ok(run(base, { t: 'agenda.prev' }, 100_000))
    expect(out.state.agenda).toMatchObject({ current: 1, startedAt: 100_000 - 3 * MIN, pausedAt: null })
    expect(out.state.agenda).not.toHaveProperty('voteOpen')
    expect(out.state.agenda!.phases.map((p) => p.actualMs)).toEqual([undefined, undefined, undefined])
    expect(out.dirty).toEqual(META)
    const other = idle({ current: 1 })
    other.agenda!.phases[0]!.actualMs = 7 * MIN
    other.agenda!.phases[1]!.actualMs = 2 * MIN
    other.agenda!.phases[2]!.actualMs = 9 * MIN
    expect(ok(run(other, { t: 'agenda.prev' })).state.agenda!.phases.map((p) => p.actualMs)).toEqual([undefined, undefined, 9 * MIN])
    const capped = idle({ current: 1 })
    capped.agenda!.phases[0]!.actualMs = 99 * MIN
    expect(ok(run(capped, { t: 'agenda.prev' }, 500 * MIN)).state.agenda!.startedAt).toBe(500 * MIN - 10 * MIN)
  })

  it('lengthens the running phase, borrowing from the following ones when asked, and refuses when nothing runs', () => {
    expect(run(idle({ current: -1 }), { t: 'agenda.extend', minutes: 2, borrow: false })).toEqual({ ok: false, error: 'invalid' })
    const out = ok(run(idle(), { t: 'agenda.extend', minutes: 2, borrow: false }))
    expect(out.state.agenda!.phases[0]!.plannedMs).toBe(12 * MIN)
    expect(out.state.agenda!.phases[1]!.plannedMs).toBe(10 * MIN)
    expect(out.dirty).toEqual(META)
    expect(ok(run(idle(), { t: 'agenda.extend', minutes: 2, borrow: true })).state.agenda!.phases[1]!.plannedMs).toBeLessThan(10 * MIN)
  })

  it('ends the agenda, recording the running phase, closing voting and dropping the override', () => {
    expect(run(harness().state, { t: 'agenda.end' })).toEqual({ ok: false, error: 'not-found' })
    const out = ok(run(idle({ startedAt: 0, pausedAt: 1, voteOpen: true }), { t: 'agenda.end' }, 2 * MIN))
    expect(out.state.agenda).toMatchObject({ current: 3, pausedAt: null })
    expect(out.state.agenda).not.toHaveProperty('voteOpen')
    expect(out.state.agenda!.phases[0]!.actualMs).toBe(1)
    expect(out.state.settings.votingClosed).toBe(true)
    expect(out.dirty).toEqual(META)
  })

  it('restarts everything: the first phase with no time spent, the timer reset, voting reopened', () => {
    expect(run(harness().state, { t: 'agenda.restart' })).toEqual({ ok: false, error: 'not-found' })
    const base = idle({ current: 2, startedAt: 7, pausedAt: 9, voteOpen: true })
    base.agenda!.phases[0]!.actualMs = 5
    const state = { ...base, timer: { running: true, endsAt: 99, remaining: 1, length: 600_000 }, settings: { ...base.settings, votingClosed: true } }
    const out = ok(run(state, { t: 'agenda.restart' }, 20_000))
    expect(out.state.agenda).toMatchObject({ current: 0, startedAt: 20_000, pausedAt: null })
    expect(out.state.agenda).not.toHaveProperty('voteOpen')
    expect(out.state.agenda!.phases.every((p) => !('actualMs' in p))).toBe(true)
    expect(out.state.timer).toEqual({ running: false, endsAt: 0, remaining: 600_000, length: 600_000 })
    expect(out.state.settings.votingClosed).toBe(false)
    expect(out.dirty).toEqual(META)
  })

  it('opens and ends voting outside the vote phase, once, and refuses when nothing runs', () => {
    expect(run(idle({ current: -1 }), { t: 'agenda.voteOpen', on: true })).toEqual({ ok: false, error: 'invalid' })
    const on = ok(run(idle(), { t: 'agenda.voteOpen', on: true }))
    expect(on.state.agenda!.voteOpen).toBe(true)
    expect(on.dirty).toEqual(META)
    const again = ok(run(on.state, { t: 'agenda.voteOpen', on: true }))
    expect(again.dirty).toEqual(CLEAN)
    expect(again.state).toBe(on.state)
    const off = ok(run(on.state, { t: 'agenda.voteOpen', on: false }))
    expect(off.state.agenda).not.toHaveProperty('voteOpen')
    expect(off.dirty).toEqual(META)
    const already = ok(run(idle(), { t: 'agenda.voteOpen', on: false }))
    expect(already.dirty).toEqual(CLEAN)
  })

  it('jumps to the close phase from any earlier one, skipping what is between, and refuses without one', () => {
    expect(run(idle({ current: -1 }), { t: 'agenda.toClose' })).toEqual({ ok: false, error: 'invalid' })
    const jumped = ok(run(idle({ startedAt: 0, voteOpen: true }), { t: 'agenda.toClose' }, 3 * MIN))
    expect(jumped.state.agenda).toMatchObject({ current: 2, startedAt: 3 * MIN, pausedAt: null })
    expect(jumped.state.agenda).not.toHaveProperty('voteOpen')
    expect(jumped.state.agenda!.phases[0]!.actualMs).toBe(3 * MIN)
    expect(jumped.dirty).toEqual(META)
    for (const current of [2]) {
      const there = ok(run(idle({ current }), { t: 'agenda.toClose' }))
      expect(there.dirty).toEqual(CLEAN)
    }
    const noClose = { ...idle(), agenda: { ...idle().agenda!, phases: [phase('p0', 'write', 10), phase('p1', 'group', 10)] } }
    expect(run(noClose, { t: 'agenda.toClose' })).toEqual({ ok: false, error: 'not-found' })
    const closeFirst = { ...idle(), agenda: { ...idle().agenda!, phases: [phase('p0', 'close', 10), phase('p1', 'group', 10)] } }
    expect(ok(run(closeFirst, { t: 'agenda.toClose' })).dirty).toEqual(CLEAN)
  })
})
