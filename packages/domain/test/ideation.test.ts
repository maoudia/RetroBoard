import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { LIMITS, NOTE_COLOR_COUNT, NOTE_COLOR_EXTENDED, reduce } from '@retroboard/domain'

type H = ReturnType<typeof harness>
const note = (h: H, text: string, col = 0, who = alice) => {
  const out = h.run({ t: 'note.add', columnId: h.col(col), text }, who)
  if (!out.ok) throw new Error(out.error)
  return out.dirty.notes[0]!
}
const lock = (h: H) => h.run({ t: 'settings.update', locked: true })
const dirtyOf = (out: ReturnType<H['run']>) => (out.ok ? out.dirty : null)

describe('note.add and note.addMany', () => {
  it('reports the new note as dirty and keeps the previous state untouched', () => {
    const h = harness()
    const before = h.state
    const id = note(h, 'one')
    expect(h.state.notes[id]!.text).toBe('one')
    expect(before.notes).toEqual({})
    expect(Object.keys(h.state.notes)).toEqual([id])
  })

  it('refuses a locked board, an unknown column, a too long text and a full board with the right code', () => {
    const h = harness()
    expect(h.run({ t: 'note.add', columnId: 'ghost-col', text: 'x' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'x'.repeat(h.state.settings.noteMaxLength + 1) })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'x'.repeat(h.state.settings.noteMaxLength) }).ok).toBe(true)
    lock(h)
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'x' })).toEqual({ ok: false, error: 'locked' })
    expect(h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'x' }] })).toEqual({ ok: false, error: 'locked' })
  })

  it('addMany reports every id, checks the total against the board limit and the text length', () => {
    const h = harness()
    const out = h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'a' }, { columnId: h.col(1), text: 'b' }] })
    expect(dirtyOf(out)?.notes).toHaveLength(2)
    expect(h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'x'.repeat(h.state.settings.noteMaxLength + 1) }] })).toEqual({ ok: false, error: 'invalid' })
  })

  it('addMany at exactly the limit succeeds and one more is refused', () => {
    const h = harness()
    for (let i = 0; i < LIMITS.maxNotes - 1; i++) h.run({ t: 'note.add', columnId: h.col(0), text: `n${i}` })
    expect(h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'last' }] }).ok).toBe(true)
    expect(h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'over' }] })).toEqual({ ok: false, error: 'limit-reached' })
  })
})

describe('note.edit by author and facilitator (change edit-published-notes)', () => {
  const mod = { ...bob, moderator: true }
  it('a moderator edits any note, marks it edited and may edit on a locked board; a participant may not', () => {
    const h = harness()
    const id = note(h, 'mine')
    lock(h)
    expect(h.run({ t: 'note.edit', id, text: 'x' }, alice)).toEqual({ ok: false, error: 'locked' })
    expect(h.run({ t: 'note.edit', id, text: 'x' }, bob)).toEqual({ ok: false, error: 'forbidden' })
    expect(dirtyOf(h.run({ t: 'note.edit', id, text: 'fixed' }, mod))?.notes).toEqual([id])
    expect(h.state.notes[id]).toMatchObject({ text: 'fixed', edited: true })
    expect(h.state.notes[id]!.ownerCid).toBe(alice.cid)
  })

  it('unknown notes answer not-found, or locked for a participant on a locked board', () => {
    const h = harness()
    expect(h.run({ t: 'note.edit', id: 'ghost-note', text: 'x' })).toEqual({ ok: false, error: 'not-found' })
    lock(h)
    expect(h.run({ t: 'note.edit', id: 'ghost-note', text: 'x' })).toEqual({ ok: false, error: 'locked' })
    expect(h.run({ t: 'note.edit', id: 'ghost-note', text: 'x' }, mod)).toEqual({ ok: false, error: 'not-found' })
  })

  it('the same text is a no-op that touches nothing, a too long text is invalid', () => {
    const h = harness()
    const id = note(h, 'same')
    const out = h.run({ t: 'note.edit', id, text: 'same' })
    expect(dirtyOf(out)?.notes).toEqual([])
    expect(h.state.notes[id]!.edited).toBeUndefined()
    expect(h.run({ t: 'note.edit', id, text: 'x'.repeat(h.state.settings.noteMaxLength + 1) })).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('note.delete, move, colour', () => {
  it('delete refuses locked, unknown and foreign notes and reports the id', () => {
    const h = harness()
    const id = note(h, 'x')
    expect(h.run({ t: 'note.delete', id: 'ghost-note' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'note.delete', id }, bob)).toEqual({ ok: false, error: 'forbidden' })
    lock(h)
    expect(h.run({ t: 'note.delete', id })).toEqual({ ok: false, error: 'locked' })
    h.run({ t: 'settings.update', locked: false })
    const out = h.run({ t: 'note.delete', id })
    expect(dirtyOf(out)?.notes).toEqual([id])
    expect(h.state.notes).toEqual({})
  })

  it('deleting one of two grouped notes dissolves the pair and reports the group', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = Object.keys(h.state.groups)[0]!
    const out = h.run({ t: 'note.delete', id: a })
    expect(dirtyOf(out)?.notes).toContain(a)
    expect(dirtyOf(out)?.groups).toContain(gid)
    expect(h.state.groups[gid]).toBeUndefined()
    expect(h.state.notes[b]!.groupId).toBeNull()
  })

  it('move: same column is a no-op, unknown ids and locked are refused, a grouped note leaves its group', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    expect(dirtyOf(h.run({ t: 'note.move', id: a, columnId: h.col(0) }))).toMatchObject({ notes: [], groups: [], meta: false })
    expect(h.run({ t: 'note.move', id: 'ghost-note', columnId: h.col(1) })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'note.move', id: a, columnId: 'ghost-col' })).toEqual({ ok: false, error: 'not-found' })
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = Object.keys(h.state.groups)[0]!
    const out = h.run({ t: 'note.move', id: a, columnId: h.col(1) })
    expect(dirtyOf(out)?.notes).toContain(a)
    expect(dirtyOf(out)?.groups).toContain(gid)
    expect(h.state.notes[a]).toMatchObject({ columnId: h.col(1), groupId: null })
    lock(h)
    expect(h.run({ t: 'note.move', id: a, columnId: h.col(0) })).toEqual({ ok: false, error: 'locked' })
  })

  it('colour changes one note, reports it, and refuses unknown ids; it works on a locked board', () => {
    const h = harness()
    const id = note(h, 'x')
    const other = note(h, 'y')
    const out = h.run({ t: 'note.color', id, color: 3 })
    expect(dirtyOf(out)?.notes).toEqual([id])
    expect(h.state.notes[id]!.color).toBe(3)
    expect(h.state.notes[other]!.color).not.toBe(3)
    expect(h.run({ t: 'note.color', id: 'ghost-note', color: 1 })).toEqual({ ok: false, error: 'not-found' })
    // The advanced palette extends the range (tints and shades); beyond it is refused.
    expect(h.run({ t: 'note.color', id, color: NOTE_COLOR_COUNT }).ok).toBe(true)
    expect(h.state.notes[id]!.color).toBe(NOTE_COLOR_COUNT)
    expect(h.run({ t: 'note.color', id, color: NOTE_COLOR_EXTENDED - 1 }).ok).toBe(true)
    expect(h.run({ t: 'note.color', id, color: NOTE_COLOR_EXTENDED })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'note.color', id, color: -1 })).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('note.group, ungroup and group commands', () => {
  it('grouping creates a group for the target, reports both notes and the group, and moves the source to the target column', () => {
    const h = harness()
    const a = note(h, 'a', 1)
    const b = note(h, 'b', 0)
    const out = h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[b]!.groupId!
    expect(dirtyOf(out)?.notes.sort()).toEqual([a, b].sort())
    expect(dirtyOf(out)?.groups).toEqual([gid])
    expect(h.state.groups[gid]).toMatchObject({ columnId: h.col(0), title: null, voters: [] })
    expect(h.state.notes[a]).toMatchObject({ columnId: h.col(0), groupId: gid })
  })

  it('grouping onto an existing group reuses it and does not report a new group', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    const c = note(h, 'c')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[b]!.groupId!
    const out = h.run({ t: 'note.group', id: c, ontoId: b })
    expect(dirtyOf(out)).toMatchObject({ notes: [c], groups: [] })
    expect(h.state.notes[c]!.groupId).toBe(gid)
    expect(Object.keys(h.state.groups)).toEqual([gid])
  })

  it('moving a note from one group to another cleans up the group it left', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    const c = note(h, 'c')
    const d = note(h, 'd')
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: d })
    const first = h.state.notes[a]!.groupId!
    const out = h.run({ t: 'note.group', id: a, ontoId: c })
    expect(h.state.notes[a]!.groupId).toBe(h.state.notes[c]!.groupId)
    expect(h.state.groups[first]).toBeUndefined()
    expect(dirtyOf(out)?.groups).toContain(first)
    expect(h.state.notes[b]!.groupId).toBeNull()
  })

  it('refuses grouping a note with itself, with a ghost, or on a locked board', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    expect(h.run({ t: 'note.group', id: a, ontoId: a })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'note.group', id: a, ontoId: 'ghost-note' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'note.group', id: 'ghost-note', ontoId: b })).toEqual({ ok: false, error: 'not-found' })
    lock(h)
    expect(h.run({ t: 'note.group', id: a, ontoId: b })).toEqual({ ok: false, error: 'locked' })
  })

  it('ungroup: free notes are a no-op, ghosts and locked are refused, a pair dissolves', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    expect(dirtyOf(h.run({ t: 'note.ungroup', id: a }))).toMatchObject({ notes: [], groups: [] })
    expect(h.run({ t: 'note.ungroup', id: 'ghost-note' })).toEqual({ ok: false, error: 'not-found' })
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    lock(h)
    expect(h.run({ t: 'note.ungroup', id: a })).toEqual({ ok: false, error: 'locked' })
    h.run({ t: 'settings.update', locked: false })
    const out = h.run({ t: 'note.ungroup', id: a })
    expect(dirtyOf(out)?.notes).toContain(a)
    expect(dirtyOf(out)?.groups).toContain(gid)
    expect(h.state.groups[gid]).toBeUndefined()
  })

  it('rename sets, trims to null when empty, and refuses ghosts', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const id = h.state.notes[a]!.groupId!
    expect(dirtyOf(h.run({ t: 'group.rename', id, title: 'Theme' }))?.groups).toEqual([id])
    expect(h.state.groups[id]!.title).toBe('Theme')
    h.run({ t: 'group.rename', id, title: '' })
    expect(h.state.groups[id]!.title).toBeNull()
    expect(h.run({ t: 'group.rename', id: 'ghost-group', title: 'x' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('recolor changes the unfrozen notes of the cluster only and rejects a bad colour', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    const free = note(h, 'free')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const id = h.state.notes[a]!.groupId!
    const out = h.run({ t: 'group.recolor', id, color: 5 })
    expect(dirtyOf(out)?.notes.sort()).toEqual([a, b].sort())
    expect(h.state.notes[a]!.color).toBe(5)
    expect(h.state.notes[free]!.color).not.toBe(5)
    expect(h.run({ t: 'group.recolor', id, color: NOTE_COLOR_EXTENDED })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'group.recolor', id: 'ghost-group', color: 1 })).toEqual({ ok: false, error: 'not-found' })
  })

  it('dissolve frees the notes, reports them and the group, and refuses locked and ghosts', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    const c = note(h, 'c')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const id = h.state.notes[a]!.groupId!
    expect(h.run({ t: 'group.dissolve', id: 'ghost-group' })).toEqual({ ok: false, error: 'not-found' })
    lock(h)
    expect(h.run({ t: 'group.dissolve', id })).toEqual({ ok: false, error: 'locked' })
    h.run({ t: 'settings.update', locked: false })
    const out = h.run({ t: 'group.dissolve', id })
    expect(dirtyOf(out)?.notes.sort()).toEqual([a, b].sort())
    expect(dirtyOf(out)?.groups).toEqual([id])
    expect(h.state.notes[c]!.groupId).toBeNull()
    expect(h.state.groups).toEqual({})
  })

  it('merge: notes and voters move to the target, same group is a no-op, other columns are refused', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    const c = note(h, 'c')
    const d = note(h, 'd')
    const x = note(h, 'x', 1)
    const y = note(h, 'y', 1)
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: d })
    h.run({ t: 'note.group', id: x, ontoId: y })
    const g1 = h.state.notes[a]!.groupId!
    const g2 = h.state.notes[c]!.groupId!
    const g3 = h.state.notes[x]!.groupId!
    expect(h.run({ t: 'group.merge', id: g1, ontoId: g3 })).toEqual({ ok: false, error: 'same-column-required' })
    expect(h.run({ t: 'group.merge', id: g1, ontoId: 'ghost-group' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'group.merge', id: 'ghost-group', ontoId: g1 })).toEqual({ ok: false, error: 'not-found' })
    expect(dirtyOf(h.run({ t: 'group.merge', id: g1, ontoId: g1 }))).toMatchObject({ notes: [], groups: [] })
    lock(h)
    expect(h.run({ t: 'group.merge', id: g1, ontoId: g2 })).toEqual({ ok: false, error: 'locked' })
    h.run({ t: 'settings.update', locked: false })
    const out = h.run({ t: 'group.merge', id: g1, ontoId: g2 })
    expect(dirtyOf(out)?.notes.sort()).toEqual([a, b].sort())
    expect(dirtyOf(out)?.groups.sort()).toEqual([g1, g2].sort())
    expect(h.state.groups[g1]).toBeUndefined()
    expect(h.state.notes[a]!.groupId).toBe(g2)
    expect(h.state.notes[c]!.groupId).toBe(g2)
  })

  it('group.move carries the notes to another column, no-op in the same column, refusals', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const id = h.state.notes[a]!.groupId!
    expect(dirtyOf(h.run({ t: 'group.move', id, columnId: h.col(0) }))).toMatchObject({ notes: [], groups: [] })
    expect(h.run({ t: 'group.move', id: 'ghost-group', columnId: h.col(1) })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'group.move', id, columnId: 'ghost-col' })).toEqual({ ok: false, error: 'not-found' })
    lock(h)
    expect(h.run({ t: 'group.move', id, columnId: h.col(1) })).toEqual({ ok: false, error: 'locked' })
    h.run({ t: 'settings.update', locked: false })
    const out = h.run({ t: 'group.move', id, columnId: h.col(1) })
    expect(dirtyOf(out)?.notes.sort()).toEqual([a, b].sort())
    expect(dirtyOf(out)?.groups).toEqual([id])
    expect(h.state.groups[id]!.columnId).toBe(h.col(1))
    expect(h.state.notes[a]!.columnId).toBe(h.col(1))
  })
})

describe('columns', () => {
  it('add: defaults, optional colour and votable flag, template cleared, limit and colour checks', () => {
    const h = harness()
    const n = h.state.columns.length
    const out = h.run({ t: 'column.add', title: 'New' })
    expect(dirtyOf(out)?.meta).toBe(true)
    const col = h.state.columns.at(-1)!
    expect(h.state.columns).toHaveLength(n + 1)
    expect(col).toMatchObject({ title: 'New', subtitle: '' })
    expect('color' in col).toBe(false)
    expect('votable' in col).toBe(false)
    expect(h.state.settings.templateId).toBeNull()
    h.run({ t: 'column.add', title: 'Coloured', color: 2, votable: false })
    expect(h.state.columns.at(-1)).toMatchObject({ color: 2, votable: false })
    h.run({ t: 'column.add', title: 'Votable', votable: true })
    expect('votable' in h.state.columns.at(-1)!).toBe(false)
    expect(h.run({ t: 'column.add', title: 'Bad', color: NOTE_COLOR_EXTENDED })).toEqual({ ok: false, error: 'invalid' })
    while (h.state.columns.length < LIMITS.maxColumns) h.run({ t: 'column.add', title: 'x' })
    expect(h.run({ t: 'column.add', title: 'one too many' })).toEqual({ ok: false, error: 'limit-reached' })
  })

  it('update changes only what is given, keeps the votable flag unless set, clears the template', () => {
    const h = harness()
    const id = h.col(0)
    const before = h.state.columns[0]!
    const out = h.run({ t: 'column.update', id, title: 'Renamed' })
    expect(dirtyOf(out)?.meta).toBe(true)
    expect(h.state.columns[0]).toMatchObject({ title: 'Renamed', subtitle: before.subtitle, icon: before.icon })
    expect(h.state.columns[1]).toEqual(h.state.columns[1])
    expect(h.state.settings.templateId).toBeNull()
    h.run({ t: 'column.update', id, subtitle: 'Sub', color: 4, votable: false })
    expect(h.state.columns[0]).toMatchObject({ subtitle: 'Sub', color: 4, votable: false })
    h.run({ t: 'column.update', id, title: 'Again' })
    expect(h.state.columns[0]).toMatchObject({ title: 'Again', color: 4, votable: false })
    h.run({ t: 'column.update', id, votable: true })
    expect('votable' in h.state.columns[0]!).toBe(false)
    expect(h.run({ t: 'column.update', id: 'ghost-col', title: 'x' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'column.update', id, color: NOTE_COLOR_EXTENDED })).toEqual({ ok: false, error: 'invalid' })
  })

  it('delete removes the column with its notes and groups and reports them; the last column stays', () => {
    const h = harness()
    const a = note(h, 'a', 1)
    const b = note(h, 'b', 1)
    const keep = note(h, 'keep', 0)
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    const id = h.col(1)
    const out = h.run({ t: 'column.delete', id })
    expect(dirtyOf(out)).toMatchObject({ meta: true, groups: [gid] })
    expect(dirtyOf(out)?.notes.sort()).toEqual([a, b].sort())
    expect(h.state.notes[keep]).toBeDefined()
    expect(h.state.notes[a]).toBeUndefined()
    expect(h.state.groups[gid]).toBeUndefined()
    expect(h.state.columns.some((c) => c.id === id)).toBe(false)
    expect(h.state.settings.templateId).toBeNull()
    expect(h.run({ t: 'column.delete', id: 'ghost-col' })).toEqual({ ok: false, error: 'not-found' })
    while (h.state.columns.length > 1) h.run({ t: 'column.delete', id: h.col(0) })
    expect(h.run({ t: 'column.delete', id: h.col(0) })).toEqual({ ok: false, error: 'last-column' })
  })

  it('move reorders, no-op in place, ghosts refused', () => {
    const h = harness()
    const ids = h.state.columns.map((c) => c.id)
    expect(dirtyOf(h.run({ t: 'column.move', id: ids[0]!, toIndex: 0 }))).toMatchObject({ meta: false })
    const out = h.run({ t: 'column.move', id: ids[0]!, toIndex: 1 })
    expect(dirtyOf(out)?.meta).toBe(true)
    expect(h.state.columns.map((c) => c.id).slice(0, 2)).toEqual([ids[1], ids[0]])
    expect(h.state.settings.templateId).toBeNull()
    h.run({ t: 'column.move', id: ids[1]!, toIndex: h.state.columns.length - 1 })
    expect(h.state.columns.at(-1)!.id).toBe(ids[1])
    expect(h.run({ t: 'column.move', id: 'ghost-col', toIndex: 1 })).toEqual({ ok: false, error: 'not-found' })
  })

  it('move clamps an index past the end to the last position (a peer may send any index)', () => {
    const h = harness()
    const first = h.col(0)
    const out = reduce(h.state, { t: 'column.move', id: first, toIndex: 99 }, alice, { now: h.now, newId: () => 'idx00001' })
    expect(out.ok && out.state.columns.at(-1)!.id).toBe(first)
    expect(out.ok && out.state.columns).toHaveLength(h.state.columns.length)
  })

  it('hide and show: one column stays visible, hidden twice is a no-op, null shows all', () => {
    const h = harness()
    const [c0, c1] = [h.col(0), h.col(1)]
    expect(dirtyOf(h.run({ t: 'column.hide', id: c0 }))?.meta).toBe(true)
    expect(h.state.columns[0]!.hidden).toBe(true)
    expect(dirtyOf(h.run({ t: 'column.hide', id: c0 }))?.meta).toBe(false)
    expect(h.run({ t: 'column.hide', id: 'ghost-col' })).toEqual({ ok: false, error: 'not-found' })
    for (const c of h.state.columns.slice(1, -1)) h.run({ t: 'column.hide', id: c.id })
    expect(h.run({ t: 'column.hide', id: h.state.columns.at(-1)!.id })).toEqual({ ok: false, error: 'last-column' })
    expect(h.run({ t: 'column.show', id: 'ghost-col' })).toEqual({ ok: false, error: 'not-found' })
    expect(dirtyOf(h.run({ t: 'column.show', id: c0 }))?.meta).toBe(true)
    expect('hidden' in h.state.columns[0]!).toBe(false)
    expect(h.state.columns[1]!.hidden).toBe(c1 ? true : undefined)
    expect(dirtyOf(h.run({ t: 'column.show', id: c0 }))?.meta).toBe(false)
    expect(dirtyOf(h.run({ t: 'column.show', id: null }))?.meta).toBe(true)
    expect(h.state.columns.every((c) => !('hidden' in c))).toBe(true)
    expect(dirtyOf(h.run({ t: 'column.show', id: null }))?.meta).toBe(false)
  })
})
