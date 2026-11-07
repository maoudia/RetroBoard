import { alice, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type Actor, type BoardState, type Command, DEFAULT_COLUMN_ICON, LIMITS, NOTE_COLOR_COUNT, NOTE_COLOR_EXTENDED, type Outcome, reduce } from '../src'

const ctx = { now: 7_000, newId: (() => { let n = 0; return () => `gen${n++}` })() }
/** Straight to the reducer, so the wire schema cannot refuse before the rule is reached. */
const run = (state: BoardState, command: unknown, actor: Actor = alice): Outcome => reduce(state, command as Command, actor, ctx)
const ok = (o: Outcome) => { if (!o.ok) throw new Error(o.error); return o }
const CLEAN = { meta: false, notes: [], groups: [], actions: [], wipe: false }

function board() {
  const h = harness()
  const add = (text: string, col = 0, actor: Actor = alice) => { h.run({ t: 'note.add', columnId: h.col(col), text }, actor); return Object.values(h.state.notes).find((n) => n.text === text)!.id }
  return { h, add }
}

describe('colours, exactly', () => {
  const valid = [0, 1, NOTE_COLOR_EXTENDED - 1]
  const invalid = [-1, NOTE_COLOR_EXTENDED, NOTE_COLOR_EXTENDED + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]

  it('a cluster takes a colour from the first to the last of the extended palette, and nothing else', () => {
    const { h, add } = board()
    const a = add('a'); const b = add('b')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const g = h.state.notes[a]!.groupId!
    for (const color of valid) expect(run(h.state, { t: 'group.recolor', id: g, color }).ok, String(color)).toBe(true)
    for (const color of invalid) expect(run(h.state, { t: 'group.recolor', id: g, color }), String(color)).toEqual({ ok: false, error: 'not-found' })
  })

  it('a column takes the same colours when it is added or updated, and says invalid otherwise', () => {
    const { h } = board()
    for (const color of valid) {
      expect(run(h.state, { t: 'column.add', title: 'x', color }).ok, `add ${color}`).toBe(true)
      expect(run(h.state, { t: 'column.update', id: h.col(0), color }).ok, `update ${color}`).toBe(true)
    }
    for (const color of invalid) {
      expect(run(h.state, { t: 'column.add', title: 'x', color }), `add ${color}`).toEqual({ ok: false, error: 'invalid' })
      expect(run(h.state, { t: 'column.update', id: h.col(0), color }), `update ${color}`).toEqual({ ok: false, error: 'invalid' })
    }
  })

  it('a new note takes the colour of its column, else a colour from its id, and an asked-for colour wins, 0 included', () => {
    const { h } = board()
    const colored: BoardState = { ...h.state, columns: h.state.columns.map((c, i) => (i === 0 ? { ...c, color: 5 } : c)) }
    expect(Object.values(ok(run(colored, { t: 'note.add', columnId: h.col(0), text: 'x' })).state.notes)[0]!.color).toBe(5)
    expect(Object.values(ok(run(colored, { t: 'note.add', columnId: h.col(0), text: 'x', color: 0 })).state.notes)[0]!.color).toBe(0)
    expect(Object.values(ok(run(colored, { t: 'note.add', columnId: h.col(1), text: 'x' })).state.notes)[0]!.color).toBeLessThan(NOTE_COLOR_COUNT)
    const many = ok(run(colored, { t: 'note.addMany', items: [{ columnId: h.col(0), text: 'a' }, { columnId: h.col(0), text: 'b', color: 0 }, { columnId: h.col(1), text: 'c' }] }))
    expect(Object.values(many.state.notes).map((n) => n.color).slice(0, 2)).toEqual([5, 0])
    expect(Object.values(many.state.notes)[2]!.color).toBeLessThan(NOTE_COLOR_COUNT)
  })
})

describe('adding notes, exactly', () => {
  it('says not found for a column that is not there, one by one for a batch', () => {
    const { h } = board()
    expect(run(h.state, { t: 'note.add', columnId: 'nope', text: 'x' })).toEqual({ ok: false, error: 'not-found' })
    expect(run(h.state, { t: 'note.addMany', items: [{ columnId: h.col(0), text: 'a' }, { columnId: 'nope', text: 'b' }] })).toEqual({ ok: false, error: 'not-found' })
  })

  it('keeps the order of a batch through the created time, and names every note', () => {
    const { h } = board()
    const out = ok(run(h.state, { t: 'note.addMany', items: [{ columnId: h.col(0), text: 'a' }, { columnId: h.col(1), text: 'b' }] }))
    const notes = Object.values(out.state.notes)
    expect(notes.map((n) => n.createdAt)).toEqual([7_000, 7_001])
    expect(out.dirty).toEqual({ ...CLEAN, notes: notes.map((n) => n.id) })
  })
})

describe('editing, exactly', () => {
  it('says nothing changed when the text is the same', () => {
    const { h, add } = board()
    const id = add('same')
    const out = ok(run(h.state, { t: 'note.edit', id, text: 'same' }))
    expect(out.dirty).toEqual(CLEAN)
    expect(out.state).toBe(h.state)
  })
})

describe('clusters, exactly', () => {
  function clusters() {
    const { h, add } = board()
    const [a, b, c, d] = [add('a'), add('b'), add('c', 1), add('d', 1)] as [string, string, string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: d })
    return { h, a, b, c, d, g1: h.state.notes[a]!.groupId!, g2: h.state.notes[c]!.groupId! }
  }

  it('dissolves the one cluster it is told to, freeing its notes and keeping the others', () => {
    const { h, a, b, g1, g2 } = clusters()
    const out = ok(run(h.state, { t: 'group.dissolve', id: g1 }))
    expect(Object.keys(out.state.groups)).toEqual([g2])
    expect([a, b].map((id) => out.state.notes[id]!.groupId)).toEqual([null, null])
    expect(out.dirty).toEqual({ ...CLEAN, notes: [a, b], groups: [g1] })
  })

  it('deleting a column takes its notes and clusters and nothing from the others', () => {
    const { h, a, b, c, d, g1, g2 } = clusters()
    const out = ok(run(h.state, { t: 'column.delete', id: h.col(1) }))
    expect(Object.keys(out.state.groups)).toEqual([g1])
    expect(Object.keys(out.state.notes).sort()).toEqual([a, b].sort())
    expect(out.dirty).toMatchObject({ meta: true, groups: [g2] })
    expect([...out.dirty.notes].sort()).toEqual([c, d].sort())
    expect(out.state.columns.map((x) => x.id)).not.toContain(h.col(1))
    expect(out.state.settings.templateId).toBeNull()
  })

  it('a note that leaves a cluster through a move frees a cluster of one, but not one that keeps two notes', () => {
    const { h, add } = board()
    const [a, b, c] = [add('a'), add('b'), add('c')] as [string, string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: b })
    const g = h.state.notes[a]!.groupId!
    const one = ok(run(h.state, { t: 'note.move', id: a, columnId: h.col(1) }))
    expect(one.state.groups[g]).toBeDefined()
    expect(one.dirty).toEqual({ ...CLEAN, notes: [a] })
    const two = ok(run(one.state, { t: 'note.move', id: c, columnId: h.col(1) }))
    expect(two.state.groups[g]).toBeUndefined()
    expect(two.dirty).toEqual({ ...CLEAN, notes: [c, b], groups: [g] })
  })

  it('renaming a cluster to the title it has changes nothing, and an empty title clears it', () => {
    const { h, g1 } = clusters()
    const named = ok(run(h.state, { t: 'group.rename', id: g1, title: 'Theme' }))
    expect(named.dirty).toEqual({ ...CLEAN, groups: [g1] })
    const again = ok(run(named.state, { t: 'group.rename', id: g1, title: 'Theme' }))
    expect(again.dirty).toEqual(CLEAN)
    expect(again.state).toBe(named.state)
    const none = ok(run(h.state, { t: 'group.rename', id: g1, title: '' }))
    expect(none.dirty).toEqual(CLEAN)
    expect(ok(run(named.state, { t: 'group.rename', id: g1, title: '' })).state.groups[g1]!.title).toBeNull()
  })
})

describe('columns, exactly', () => {
  it('a column without an icon gets the default one, and one with an icon keeps it', () => {
    const { h } = board()
    const plain = ok(run(h.state, { t: 'column.add', title: 'Plain' }))
    expect(plain.state.columns.at(-1)).toMatchObject({ title: 'Plain', subtitle: '', icon: DEFAULT_COLUMN_ICON })
    const chosen = ok(run(h.state, { t: 'column.add', title: 'Chosen', subtitle: 'sub', icon: 'bug', votable: false }))
    expect(chosen.state.columns.at(-1)).toMatchObject({ title: 'Chosen', subtitle: 'sub', icon: 'bug', votable: false })
    expect(chosen.dirty).toEqual({ ...CLEAN, meta: true })
  })

  it('moves a column to the index asked, to the last place when the index is past the end, and changes nothing when it is already there', () => {
    const { h } = board()
    const ids = h.state.columns.map((c) => c.id)
    const last = ids.length - 1
    const first = ok(run(h.state, { t: 'column.move', id: ids[0], toIndex: 99 }))
    expect(first.state.columns.map((c) => c.id)).toEqual([...ids.slice(1), ids[0]])
    expect(first.dirty).toEqual({ ...CLEAN, meta: true })
    const already = ok(run(h.state, { t: 'column.move', id: ids[last], toIndex: 99 }))
    expect(already.state).toBe(h.state)
    expect(already.dirty).toEqual(CLEAN)
    expect(ok(run(h.state, { t: 'column.move', id: ids[last], toIndex: 0 })).state.columns[0]!.id).toBe(ids[last])
    expect(LIMITS.maxColumns).toBeGreaterThan(last)
  })
})
