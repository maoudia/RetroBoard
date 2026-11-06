import { describe, expect, it } from 'vitest'
import { type BoardState, type Command, emptyLedger, foldAll, type NoteRecord, reduce, type VerifiedEvent } from '@retroboard/domain'
import { alice, bob, harness } from '@retroboard/testkit'
import { historyOf, REWIND_MAX_COMMANDS, restoreCommands, rewindPlan } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const BOB = 'b'.repeat(42) + 'A'
const eid = (n: number) => `01J${String(n).padStart(23, '0')}`

/** A signed-event log by hand: genesis, then commands by the facilitator or Bob. */
function log() {
  const events: VerifiedEvent[] = [{ id: eid(1), at: 10, author: FAC, body: { t: 'genesis', roomId, facilitatorKey: FAC } }]
  const add = (cmd: Command, author = FAC, name: string | null = 'Alice', showName = true): string => {
    events.push({ id: eid(events.length + 1), at: 10 + events.length * 100, author, body: { t: 'cmd', cmd, name, showName } })
    return eid(events.length)
  }
  const board = () => foldAll(emptyLedger(roomId), events).board
  return { events, add, board }
}

/** A started board with two ideas by Alice (the facilitator) in the first column. */
function started() {
  const l = log()
  l.add({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
  const col = l.board().columns.map((c) => c.id)
  l.add({ t: 'note.add', columnId: col[0]!, text: 'one' })
  l.add({ t: 'note.add', columnId: col[0]!, text: 'two' })
  const ids = Object.fromEntries(Object.values(l.board().notes).map((n) => [n.text, n.id])) as Record<'one' | 'two', string>
  return { ...l, col, ids }
}

describe('historyOf', () => {
  it('is empty for a board nobody changed', () => {
    expect(historyOf(roomId, started().events)).toEqual([])
  })

  it('lists reversible actions with author, idea and column, newest last', () => {
    const l = started()
    const move = l.add({ t: 'note.move', id: l.ids.one, columnId: l.col[1]! })
    const group = l.add({ t: 'note.group', id: l.ids.two, ontoId: l.ids.one }, BOB, 'Bob', false)
    const entries = historyOf(roomId, l.events)
    expect(entries.map((e) => [e.id, e.kind, e.by, e.text, e.columnId])).toEqual([
      [move, 'move', 'Alice', 'one', l.col[1]],
      [group, 'group', null, 'two', l.col[1]],
    ])
    expect(entries[1]!.key).toBe(BOB)
  })

  it('leaves no entry for a no-op, a refused command or a command that is not reversible', () => {
    const l = started()
    l.add({ t: 'note.move', id: l.ids.one, columnId: l.col[0]! })
    l.add({ t: 'note.edit', id: l.ids.one, text: 'one' })
    l.add({ t: 'note.edit', id: l.ids.one, text: 'hijacked' }, BOB, 'Bob')
    l.add({ t: 'note.add', columnId: l.col[0]!, text: 'three' })
    expect(historyOf(roomId, l.events)).toEqual([])
  })

  it('shows the cluster title for a rename, and nothing for the same title again', () => {
    const l = started()
    l.add({ t: 'note.group', id: l.ids.two, ontoId: l.ids.one })
    const gid = l.board().notes[l.ids.one]!.groupId!
    const rename = l.add({ t: 'group.rename', id: gid, title: 'Theme' })
    l.add({ t: 'group.rename', id: gid, title: 'Theme' })
    const last = historyOf(roomId, l.events).at(-1)!
    expect(last).toMatchObject({ id: rename, kind: 'rename', text: 'Theme', columnId: l.col[0] })
    expect(historyOf(roomId, l.events).filter((e) => e.kind === 'rename')).toHaveLength(1)
  })

  it('shows what a deleted idea said, and only the newest actions when capped', () => {
    const l = started()
    for (let i = 0; i < 5; i++) l.add({ t: 'note.color', id: l.ids.one, color: i + 1 })
    l.add({ t: 'note.delete', id: l.ids.two })
    const entries = historyOf(roomId, l.events, 3)
    expect(entries).toHaveLength(3)
    expect(entries.at(-1)).toMatchObject({ kind: 'delete', text: 'two' })
  })
})

describe('rewindPlan', () => {
  it('is null for an unknown entry', () => {
    expect(rewindPlan(roomId, started().events, 'nope')).toBeNull()
  })

  it('restores the board as it was before the chosen action, and the actions after it', () => {
    const l = started()
    const before = l.board()
    const bad = l.add({ t: 'note.group', id: l.ids.two, ontoId: l.ids.one })
    l.add({ t: 'note.move', id: l.ids.one, columnId: l.col[2]! })
    const plan = rewindPlan(roomId, l.events, bad)!
    expect(plan.tooMany).toBe(false)
    expect(plan.skipped).toBe(0)
    const restored = apply(l.board(), plan.commands)
    expect(shape(restored)).toEqual(shape(before))
    expect(partition(restored)).toEqual(partition(before))
  })
})

/** Board with four ideas in the first column, used by the rewind tests. */
function board() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
  for (const [i, text] of ['one', 'two', 'three', 'four'].entries()) h.run({ t: 'note.add', columnId: h.col(0), text }, i % 2 ? bob : alice)
  const ids = Object.fromEntries(Object.values(h.state.notes).map((n) => [n.text, n.id])) as Record<'one' | 'two' | 'three' | 'four', string>
  return { h, ids }
}

/** Applies a plan with the real reducer, as a facilitator would. */
function apply(state: BoardState, commands: Command[]): BoardState {
  let s = state
  let n = 0
  for (const c of commands) {
    const out = reduce(s, c, { cid: 'fac', name: null, showName: false, moderator: true }, { now: 1, newId: () => `real${n++}` })
    if (out.ok) s = out.state
  }
  return s
}
const shape = (s: BoardState) => Object.values(s.notes).map((n) => `${n.id}|${n.columnId}|${n.text}|${n.color}`).sort()
const partition = (s: BoardState) => {
  const byGroup = new Map<string, string[]>()
  for (const n of Object.values(s.notes)) if (n.groupId) byGroup.set(n.groupId, [...(byGroup.get(n.groupId) ?? []), n.id])
  return [...byGroup.values()].map((v) => v.sort().join(',')).sort()
}

describe('restoreCommands', () => {
  it('does nothing when nothing changed', () => {
    const { h } = board()
    expect(restoreCommands(h.state, h.state)).toEqual({ commands: [], skipped: 0, tooMany: false })
  })

  it('puts a wrong grouping back', () => {
    const { h, ids } = board()
    const before = h.state
    h.run({ t: 'note.group', id: ids.two, ontoId: ids.one })
    const plan = restoreCommands(before, h.state)
    expect(plan.commands.length).toBeGreaterThan(0)
    expect(plan.commands.length).toBeLessThanOrEqual(2)
    const restored = apply(h.state, plan.commands)
    expect(partition(restored)).toEqual([])
    expect(shape(restored)).toEqual(shape(before))
  })

  it('brings back moved ideas, edited text and colours, whoever wrote them', () => {
    const { h, ids } = board()
    const before = h.state
    h.run({ t: 'note.move', id: ids.one, columnId: h.col(2) })
    h.run({ t: 'note.edit', id: ids.two, text: 'changed' }, bob)
    h.run({ t: 'note.color', id: ids.three, color: 4 })
    const plan = restoreCommands(before, h.state)
    expect(shape(apply(h.state, plan.commands))).toEqual(shape(before))
    expect(plan.skipped).toBe(0)
  })

  it('rebuilds a cluster that was dissolved and keeps a cluster that only changed column', () => {
    const { h, ids } = board()
    h.run({ t: 'note.group', id: ids.two, ontoId: ids.one })
    h.run({ t: 'note.group', id: ids.four, ontoId: ids.three })
    const before = h.state
    const [first] = Object.keys(before.groups)
    const kept = before.notes[ids.one]!.groupId!
    h.run({ t: 'note.ungroup', id: ids.three })
    h.run({ t: 'group.move', id: kept, columnId: h.col(1) })
    const restored = apply(h.state, restoreCommands(before, h.state).commands)
    expect(first).toBeDefined()
    expect(partition(restored)).toEqual(partition(before))
    expect(shape(restored)).toEqual(shape(before))
    expect(restored.groups[kept]).toBeDefined()
  })

  it('puts a cluster title back when the cluster kept its ideas, and leaves a rebuilt cluster untitled', () => {
    const { h, ids } = board()
    h.run({ t: 'note.group', id: ids.two, ontoId: ids.one })
    const g = h.state.notes[ids.one]!.groupId!
    h.run({ t: 'group.rename', id: g, title: 'CI' })
    const before = h.state
    h.run({ t: 'group.rename', id: g, title: 'Pipeline' })
    const restored = apply(h.state, restoreCommands(before, h.state).commands)
    expect(restored.groups[g]!.title).toBe('CI')
    h.run({ t: 'note.ungroup', id: ids.two })
    const rebuilt = apply(h.state, restoreCommands(before, h.state).commands)
    expect(partition(rebuilt)).toEqual(partition(before))
    expect(Object.values(rebuilt.groups).every((x) => x.title === null)).toBe(true)
  })

  it('leaves ideas written since alone and brings a deleted idea back as a new one, without its votes', () => {
    const { h, ids } = board()
    h.run({ t: 'vote.add', kind: 'note', id: ids.four })
    const before = h.state
    h.run({ t: 'note.add', columnId: h.col(0), text: 'late' })
    expect(h.run({ t: 'note.delete', id: ids.four }, bob).ok).toBe(true)
    const plan = restoreCommands(before, h.state)
    expect(plan.commands).toEqual([{ t: 'note.add', columnId: h.col(0), text: 'four', color: before.notes[ids.four]!.color }])
    expect(plan.skipped).toBe(0)
    const notes = Object.values(apply(h.state, plan.commands).notes)
    expect(notes.some((n) => n.text === 'late')).toBe(true)
    const back = notes.find((n) => n.text === 'four')!
    expect(back.id).not.toBe(ids.four)
    expect(back.voters).toEqual([])
  })

  it('does not bring a deleted idea back twice, and skips one whose column is gone', () => {
    const { h, ids } = board()
    const before = h.state
    h.run({ t: 'note.delete', id: ids.four }, bob)
    const once = apply(h.state, restoreCommands(before, h.state).commands)
    expect(restoreCommands(before, once).commands).toEqual([])
    const gone = { ...once, columns: once.columns.filter((c) => c.id !== h.col(0)) }
    const plan = restoreCommands({ ...before, columns: gone.columns }, { ...gone, notes: {} })
    expect(plan.commands).toEqual([])
    expect(plan.skipped).toBe(Object.keys(before.notes).length)
  })

  it('never takes apart a cluster that carries votes', () => {
    const { h, ids } = board()
    h.run({ t: 'note.group', id: ids.two, ontoId: ids.one })
    const before = h.state
    h.run({ t: 'note.group', id: ids.three, ontoId: ids.one })
    const g = h.state.notes[ids.one]!.groupId!
    h.run({ t: 'vote.add', kind: 'cluster', id: g })
    expect(h.state.groups[g]!.voters.length).toBeGreaterThan(0)
    const plan = restoreCommands(before, h.state)
    expect(plan.commands.some((c) => c.t === 'note.ungroup')).toBe(false)
    expect(plan.skipped).toBeGreaterThan(0)
    expect(apply(h.state, plan.commands).groups[g]!.voters.length).toBeGreaterThan(0)
  })

  it('refuses a plan the fold rate limit would cut', () => {
    const { h } = board()
    for (let i = 0; i < REWIND_MAX_COMMANDS + 1; i++) h.run({ t: 'note.add', columnId: h.col(0), text: `n${i}` })
    const before = h.state
    for (const n of Object.values(before.notes)) h.run({ t: 'note.edit', id: n.id, text: `${n.text}!` })
    const plan = restoreCommands(before, h.state)
    expect(plan.commands.length).toBeGreaterThan(REWIND_MAX_COMMANDS)
    expect(plan.tooMany).toBe(true)
  })
})

describe('rewind plans are exact', () => {
  const base = () => harness().state
  const col = (s: BoardState, i: number) => s.columns[i]!.id
  const idea = (s: BoardState, id: string, over: Partial<NoteRecord> = {}): NoteRecord => ({ id, columnId: col(s, 0), text: id, color: 0, author: null, ownerCid: 'o', groupId: null, voters: [], createdAt: 1, ...over })
  const put = (s: BoardState, notes: NoteRecord[], groups: BoardState['groups'] = {}): BoardState => ({ ...s, notes: Object.fromEntries(notes.map((n) => [n.id, n])), groups })
  const group = (s: BoardState, id: string, over: Partial<BoardState['groups'][string]> = {}) => ({ id, columnId: col(s, 0), title: null, voters: [], ...over })

  it('restores ideas in the order they were written, and by id when written together', () => {
    const s = base()
    const target = put(s, [idea(s, 'c', { createdAt: 3, text: 'old' }), idea(s, 'a', { createdAt: 1, text: 'old' }), idea(s, 'b', { createdAt: 2, text: 'old' })])
    const now = put(s, Object.values(target.notes).map((n) => ({ ...n, text: 'new' })))
    expect(restoreCommands(target, now).commands.map((c) => (c as { id: string }).id)).toEqual(['a', 'b', 'c'])
    const tied = put(s, [idea(s, 'z', { text: 'old' }), idea(s, 'm', { text: 'old' })])
    const tiedNow = put(s, Object.values(tied.notes).map((n) => ({ ...n, text: 'new' })))
    expect(restoreCommands(tied, tiedNow).commands.map((c) => (c as { id: string }).id)).toEqual(['m', 'z'])
  })

  it('brings deleted ideas back oldest first, with their text, colour and column', () => {
    const s = base()
    const target = put(s, [idea(s, 'y', { createdAt: 5, columnId: col(s, 1), color: 2, text: 'Y' }), idea(s, 'x', { createdAt: 4, text: 'X', color: 1 })])
    expect(restoreCommands(target, put(s, []))).toEqual({
      commands: [{ t: 'note.add', columnId: col(s, 0), text: 'X', color: 1 }, { t: 'note.add', columnId: col(s, 1), text: 'Y', color: 2 }],
      skipped: 0,
      tooMany: false,
    })
  })

  it('does not take an idea written since for the twin of a deleted one unless text and colour both match', () => {
    const s = base()
    const gone = idea(s, 'gone', { text: 'dup', color: 1 })
    const add = [{ t: 'note.add', columnId: col(s, 0), text: 'dup', color: 1 }]
    expect(restoreCommands(put(s, [gone]), put(s, [idea(s, 'late', { text: 'dup', color: 3 })])).commands).toEqual(add)
    expect(restoreCommands(put(s, [gone]), put(s, [idea(s, 'late', { text: 'other', color: 1 })])).commands).toEqual(add)
    expect(restoreCommands(put(s, [gone]), put(s, [idea(s, 'late', { text: 'dup', color: 1 })])).commands).toEqual([])
  })

  it('counts an idea that is still there as no twin, and uses up a twin once', () => {
    const s = base()
    const keep = idea(s, 'keep', { text: 'dup', color: 2 })
    const gone = idea(s, 'gone', { text: 'dup', color: 2, createdAt: 2 })
    expect(restoreCommands(put(s, [keep, gone]), put(s, [keep])).commands).toEqual([{ t: 'note.add', columnId: col(s, 0), text: 'dup', color: 2 }])
    const g1 = idea(s, 'g1', { text: 'dup' })
    const g2 = idea(s, 'g2', { text: 'dup', createdAt: 2 })
    expect(restoreCommands(put(s, [g1, g2]), put(s, [idea(s, 'late', { text: 'dup' })])).commands).toEqual([{ t: 'note.add', columnId: col(s, 0), text: 'dup', color: 0 }])
  })

  it('skips what points at a column that no longer exists, and moves what points at one that does', () => {
    const s = base()
    expect(restoreCommands(put(s, [idea(s, 'g', { columnId: 'gone-col' })]), put(s, []))).toEqual({ commands: [], skipped: 1, tooMany: false })
    expect(restoreCommands(put(s, [idea(s, 'm', { columnId: 'gone-col' })]), put(s, [idea(s, 'm')]))).toEqual({ commands: [], skipped: 1, tooMany: false })
    expect(restoreCommands(put(s, [idea(s, 'm', { columnId: col(s, 1) })]), put(s, [idea(s, 'm')]))).toEqual({ commands: [{ t: 'note.move', id: 'm', columnId: col(s, 1) }], skipped: 0, tooMany: false })
  })

  it('counts a command the board refuses instead of sending it', () => {
    const s = base()
    const now = { ...put(s, [idea(s, 'a', { text: 'ok' })]), settings: { ...s.settings, noteMaxLength: 3 } }
    expect(restoreCommands(put(s, [idea(s, 'a', { text: 'too long' })]), now)).toEqual({ commands: [], skipped: 1, tooMany: false })
  })

  it('changes nothing for clusters that are the same, and puts a cluster back in its column whole', () => {
    const s = base()
    const grouped = (columnId: string) => put(s, [idea(s, 'a', { groupId: 'g1', columnId }), idea(s, 'b', { groupId: 'g1', columnId })], { g1: group(s, 'g1', { columnId }) })
    expect(restoreCommands(grouped(col(s, 0)), grouped(col(s, 0)))).toEqual({ commands: [], skipped: 0, tooMany: false })
    expect(restoreCommands(grouped(col(s, 0)), grouped(col(s, 1)))).toEqual({ commands: [{ t: 'group.move', id: 'g1', columnId: col(s, 0) }], skipped: 0, tooMany: false })
    const target = put(s, [idea(s, 'a', { groupId: 'g1', columnId: 'gone-col' }), idea(s, 'b', { groupId: 'g1', columnId: 'gone-col' })], { g1: group(s, 'g1', { columnId: 'gone-col' }) })
    expect(restoreCommands(target, grouped(col(s, 1)))).toEqual({ commands: [], skipped: 2, tooMany: false })
  })

  it('takes apart a cluster that was not there, and rebuilds one that was dissolved, one command per idea', () => {
    const s = base()
    const pair = put(s, [idea(s, 'a', { groupId: 'g1' }), idea(s, 'b', { groupId: 'g1' })], { g1: group(s, 'g1') })
    const apart = put(s, [idea(s, 'a'), idea(s, 'b')])
    expect(restoreCommands(apart, pair)).toEqual({ commands: [{ t: 'note.ungroup', id: 'a' }], skipped: 0, tooMany: false })
    const trio = put(s, [idea(s, 'a', { groupId: 'g1' }), idea(s, 'b', { groupId: 'g1' }), idea(s, 'c', { groupId: 'g1' })], { g1: group(s, 'g1') })
    expect(restoreCommands(trio, put(s, [idea(s, 'a'), idea(s, 'b'), idea(s, 'c')]))).toEqual({
      commands: [{ t: 'note.group', id: 'b', ontoId: 'a' }, { t: 'note.group', id: 'c', ontoId: 'a' }],
      skipped: 0,
      tooMany: false,
    })
  })

  it('counts every idea of a voted cluster it leaves alone', () => {
    const s = base()
    const voted = put(s, [idea(s, 'a', { groupId: 'g1' }), idea(s, 'b', { groupId: 'g1' })], { g1: group(s, 'g1', { voters: ['v'] }) })
    expect(restoreCommands(put(s, [idea(s, 'a'), idea(s, 'b')]), voted)).toEqual({ commands: [], skipped: 2, tooMany: false })
    const target = put(s, [idea(s, 'a', { groupId: 'g1' }), idea(s, 'b', { groupId: 'g1' }), idea(s, 'c', { groupId: 'g1' })], { g1: group(s, 'g1') })
    const now = put(s, [idea(s, 'a', { groupId: 'g2' }), idea(s, 'b', { groupId: 'g2' }), idea(s, 'c')], { g2: group(s, 'g2', { voters: ['v'] }) })
    expect(restoreCommands(target, now).skipped).toBeGreaterThan(0)
  })

  it('puts a cluster title back only when it differs, and an empty title back as empty', () => {
    const s = base()
    const titled = (title: string | null) => put(s, [idea(s, 'a', { groupId: 'g1' }), idea(s, 'b', { groupId: 'g1' })], { g1: group(s, 'g1', { title }) })
    expect(restoreCommands(titled('CI'), titled('Pipe')).commands).toEqual([{ t: 'group.rename', id: 'g1', title: 'CI' }])
    expect(restoreCommands(titled(null), titled('X')).commands).toEqual([{ t: 'group.rename', id: 'g1', title: '' }])
    expect(restoreCommands(titled('CI'), titled(null)).commands).toEqual([{ t: 'group.rename', id: 'g1', title: 'CI' }])
    expect(restoreCommands(titled('CI'), titled('CI')).commands).toEqual([])
    expect(restoreCommands(titled(null), titled(null)).commands).toEqual([])
  })

  it('allows exactly the number of commands the fold rate limit allows', () => {
    const s = base()
    const many = (n: number) => Array.from({ length: n }, (_, i) => idea(s, `n${String(i).padStart(3, '0')}`, { createdAt: i, text: 'old' }))
    const edited = (n: number) => put(s, many(n).map((x) => ({ ...x, text: 'new' })))
    expect(restoreCommands(put(s, many(REWIND_MAX_COMMANDS)), edited(REWIND_MAX_COMMANDS))).toMatchObject({ tooMany: false })
    expect(restoreCommands(put(s, many(REWIND_MAX_COMMANDS)), edited(REWIND_MAX_COMMANDS)).commands).toHaveLength(REWIND_MAX_COMMANDS)
    expect(restoreCommands(put(s, many(REWIND_MAX_COMMANDS + 1)), edited(REWIND_MAX_COMMANDS + 1)).tooMany).toBe(true)
  })
})

describe('history of the log is exact', () => {
  it('plans the rewind of the chosen entry, not of the first one', () => {
    const l = started()
    l.add({ t: 'note.move', id: l.ids.one, columnId: l.col[1]! })
    const second = l.add({ t: 'note.edit', id: l.ids.two, text: 'zz' })
    expect(rewindPlan(roomId, l.events, second)).toEqual({ commands: [{ t: 'note.edit', id: l.ids.two, text: 'two' }], skipped: 0, tooMany: false })
  })

  it('cuts a long idea text for the panel', () => {
    const l = started()
    l.add({ t: 'note.edit', id: l.ids.one, text: 'x'.repeat(150) })
    expect(historyOf(roomId, l.events).at(-1)!.text).toHaveLength(140)
  })
})
