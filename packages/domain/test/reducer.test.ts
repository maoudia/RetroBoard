import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { LIMITS } from '@retroboard/domain'

describe('notes', () => {
  it('adds a note with author only when the actor shows their name', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'hello' }, alice)
    h.run({ t: 'note.add', columnId: h.col(0), text: 'secret' }, bob)
    const notes = Object.values(h.state.notes)
    expect(notes.find((n) => n.text === 'hello')?.author).toBe('Alice')
    expect(notes.find((n) => n.text === 'secret')?.author).toBeNull()
  })

  it('rejects unknown columns and caps the board size', () => {
    const h = harness()
    expect(h.run({ t: 'note.add', columnId: 'nope-nope', text: 'x' })).toEqual({ ok: false, error: 'not-found' })
    for (let i = 0; i < LIMITS.maxNotes; i++) h.run({ t: 'note.add', columnId: h.col(0), text: `n${i}` })
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'one too many' })).toEqual({ ok: false, error: 'limit-reached' })
  })

  it('addMany is atomic', () => {
    const h = harness()
    const out = h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'a' }, { columnId: 'ghost-col', text: 'b' }] })
    expect(out.ok).toBe(false)
    expect(Object.keys(h.state.notes)).toHaveLength(0)
  })

  it('only the owner can edit or delete', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'mine' }, alice)
    const id = Object.keys(h.state.notes)[0]!
    expect(h.run({ t: 'note.delete', id }, bob)).toEqual({ ok: false, error: 'forbidden' })
    expect(h.run({ t: 'note.edit', id, text: 'hijack' }, bob)).toEqual({ ok: false, error: 'forbidden' })
    expect(h.run({ t: 'note.edit', id, text: 'edited' }, alice).ok).toBe(true)
    expect(h.state.notes[id]!.text).toBe('edited')
    expect(h.run({ t: 'note.delete', id }, alice).ok).toBe(true)
    expect(h.state.notes[id]).toBeUndefined()
  })

  it('moves a note between columns', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x' })
    const id = Object.keys(h.state.notes)[0]!
    h.run({ t: 'note.move', id, columnId: h.col(2) }, bob)
    expect(h.state.notes[id]!.columnId).toBe(h.col(2))
  })

  it('locked board refuses writes but still accepts actions and unlock', () => {
    const h = harness()
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'x' })).toEqual({ ok: false, error: 'locked' })
    expect(h.run({ t: 'action.add', text: 'still ok', owner: '' }).ok).toBe(true)
    expect(h.run({ t: 'settings.update', locked: false }).ok).toBe(true)
  })
})

describe('votes', () => {
  it('enforces the limit and toggles off', () => {
    const h = harness()
    for (let i = 0; i < 5; i++) h.run({ t: 'note.add', columnId: h.col(0), text: `n${i}` })
    const ids = Object.keys(h.state.notes)
    for (const id of ids.slice(0, 3)) expect(h.run({ t: 'vote.toggle', id }, bob).ok).toBe(true)
    expect(h.run({ t: 'vote.toggle', id: ids[3]! }, bob)).toEqual({ ok: false, error: 'vote-limit' })
    expect(h.run({ t: 'vote.toggle', id: ids[0]! }, bob).ok).toBe(true)
    expect(h.state.notes[ids[0]!]!.voters).toHaveLength(0)
    expect(h.run({ t: 'vote.toggle', id: ids[3]! }, bob).ok).toBe(true)
  })

  it('honours a changed vote limit', () => {
    const h = harness()
    h.run({ t: 'settings.update', voteLimit: 1 })
    h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'a' }, { columnId: h.col(0), text: 'b' }] })
    const [a, b] = Object.keys(h.state.notes)
    expect(h.run({ t: 'vote.toggle', id: a! }, bob).ok).toBe(true)
    expect(h.run({ t: 'vote.toggle', id: b! }, bob)).toEqual({ ok: false, error: 'vote-limit' })
  })
})

describe('groups', () => {
  const setup = () => {
    const h = harness()
    h.run({ t: 'note.addMany', items: ['a', 'b', 'c'].map((text) => ({ columnId: h.col(0), text })) })
    const [a, b, c] = Object.keys(h.state.notes) as [string, string, string]
    return { h, a, b, c }
  }

  it('creates a group when dropping a note onto another', () => {
    const { h, a, b } = setup()
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId
    expect(gid).toBeTruthy()
    expect(h.state.notes[b]!.groupId).toBe(gid)
    expect(h.state.groups[gid!]).toMatchObject({ columnId: h.col(0), title: null })
  })

  it('joins an existing group, and moves across columns', () => {
    const { h, a, b, c } = setup()
    h.run({ t: 'note.move', id: c, columnId: h.col(1) })
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: a })
    expect(h.state.notes[c]!.columnId).toBe(h.col(0))
    expect(h.state.notes[c]!.groupId).toBe(h.state.notes[a]!.groupId)
  })

  it('dissolves a group that falls under two notes', () => {
    const { h, a, b } = setup()
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.ungroup', id: a })
    expect(Object.keys(h.state.groups)).toHaveLength(0)
    expect(h.state.notes[b]!.groupId).toBeNull()
  })

  it('deleting a member or moving it out also dissolves a pair', () => {
    const { h, a, b } = setup()
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.move', id: a, columnId: h.col(1) })
    expect(Object.keys(h.state.groups)).toHaveLength(0)
    expect(h.state.notes[b]!.groupId).toBeNull()
  })

  it('rename and dissolve', () => {
    const { h, a, b } = setup()
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    h.run({ t: 'group.rename', id: gid, title: 'Cohesion' })
    expect(h.state.groups[gid]!.title).toBe('Cohesion')
    h.run({ t: 'group.rename', id: gid, title: '  ' })
    expect(h.state.groups[gid]!.title).toBeNull()
    h.run({ t: 'group.dissolve', id: gid })
    expect(h.state.notes[a]!.groupId).toBeNull()
    expect(h.state.groups[gid]).toBeUndefined()
  })
})

describe('columns', () => {
  it('adds, renames, reorders and deletes with its notes', () => {
    const h = harness()
    const n0 = h.state.columns.length
    h.run({ t: 'column.add', title: 'Questions', icon: 'circle-question-mark' })
    expect(h.state.columns).toHaveLength(n0 + 1)
    expect(h.state.settings.templateId).toBeNull()
    const id = h.state.columns.at(-1)!.id
    h.run({ t: 'column.update', id, title: 'Doutes' })
    expect(h.state.columns.at(-1)!.title).toBe('Doutes')
    h.run({ t: 'column.move', id, toIndex: 0 })
    expect(h.state.columns[0]!.id).toBe(id)
    h.run({ t: 'note.addMany', items: [{ columnId: id, text: 'a' }, { columnId: id, text: 'b' }] })
    const [a, b] = Object.keys(h.state.notes)
    h.run({ t: 'note.group', id: a!, ontoId: b! })
    h.run({ t: 'column.delete', id })
    expect(h.state.columns.some((c) => c.id === id)).toBe(false)
    expect(Object.keys(h.state.notes)).toHaveLength(0)
    expect(Object.keys(h.state.groups)).toHaveLength(0)
  })

  it('refuses to delete the last column and caps the count', () => {
    const h = harness()
    while (h.state.columns.length > 1) h.run({ t: 'column.delete', id: h.state.columns[0]!.id })
    expect(h.run({ t: 'column.delete', id: h.state.columns[0]!.id })).toEqual({ ok: false, error: 'last-column' })
    while (h.state.columns.length < LIMITS.maxColumns) h.run({ t: 'column.add', title: 'x' })
    expect(h.run({ t: 'column.add', title: 'y' })).toEqual({ ok: false, error: 'limit-reached' })
  })
})

describe('templates and init', () => {
  it('init works once and applies template, theme and title', () => {
    const h = harness()
    expect(h.run({ t: 'board.init', templateId: 'halloween', themeId: 'halloween', title: 'Retro 23/10' }).ok).toBe(true)
    expect(h.state.columns).toHaveLength(5)
    expect(h.state.settings).toMatchObject({ themeId: 'halloween', templateId: 'halloween', title: 'Retro 23/10', initialized: true })
    expect(h.run({ t: 'board.init', templateId: 'weather', themeId: 'cyber' })).toEqual({ ok: false, error: 'not-empty' })
  })

  it('template.apply needs wipe once notes exist', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x' })
    expect(h.run({ t: 'template.apply', templateId: 'weather' })).toEqual({ ok: false, error: 'not-empty' })
    const out = h.run({ t: 'template.apply', templateId: 'weather', wipe: true })
    expect(out.ok && out.dirty.wipe).toBe(true)
    expect(Object.keys(h.state.notes)).toHaveLength(0)
    expect(h.state.settings.templateId).toBe('weather')
  })

  it('template.apply migrate keeps notes, clusters and votes and collapses extra columns into the last one', () => {
    const h = harness()
    const before = h.state.columns.map((c) => c.id)
    expect(before.length).toBeGreaterThanOrEqual(3)
    const lastOld = before.length - 1
    h.run({ t: 'note.add', columnId: before[0]!, text: 'first' })
    h.run({ t: 'note.add', columnId: before[lastOld]!, text: 'last a' })
    h.run({ t: 'note.add', columnId: before[lastOld]!, text: 'last b' })
    const [first, a, b] = ['first', 'last a', 'last b'].map((t) => Object.values(h.state.notes).find((n) => n.text === t)!.id) as [string, string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    const g = h.state.notes[a]!.groupId!
    h.run({ t: 'vote.add', kind: 'note', id: first })
    h.run({ t: 'vote.add', kind: 'cluster', id: g })
    const tplId = ['weather', 'daki', 'start-stop-continue'].find((id) => id !== h.state.settings.templateId)!
    const out = h.run({ t: 'template.apply', templateId: tplId, mode: 'migrate' })
    expect(out.ok).toBe(true)
    const cols = h.state.columns.map((c) => c.id)
    expect(Object.keys(h.state.notes).sort()).toEqual([first, a, b].sort())
    // Same ids by position; anything beyond the new column count lands in the last new column.
    expect(h.state.notes[first]!.columnId).toBe(cols[0])
    expect(h.state.notes[a]!.columnId).toBe(cols[Math.min(lastOld, cols.length - 1)])
    expect(h.state.notes[a]!.groupId).toBe(g)
    expect(h.state.groups[g]!.columnId).toBe(h.state.notes[a]!.columnId)
    expect(h.state.groups[g]!.voters).toHaveLength(1)
    expect(h.state.notes[first]!.voters).toHaveLength(1)
    expect(h.state.settings.templateId).toBe(tplId)
    expect(out.ok && out.dirty.wipe).toBe(false)
  })

  it('template.apply migrate on an empty board just applies the format; unknown template is refused', () => {
    const h = harness()
    expect(h.run({ t: 'template.apply', templateId: 'weather', mode: 'migrate' }).ok).toBe(true)
    expect(h.run({ t: 'template.apply', templateId: 'nope', mode: 'migrate' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('unknown template is rejected', () => {
    expect(harness().run({ t: 'template.apply', templateId: 'nope' })).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('timer and reset', () => {
  it('runs, pauses with the remaining time and resets to a length', () => {
    const h = harness()
    h.run({ t: 'timer.start' })
    expect(h.state.timer.endsAt).toBe(h.now + 300_000)
    h.tick(60_000)
    h.run({ t: 'timer.pause' })
    expect(h.state.timer).toMatchObject({ running: false, remaining: 240_000 })
    h.run({ t: 'timer.reset', minutes: 10 })
    expect(h.state.timer).toMatchObject({ remaining: 600_000, length: 600_000 })
  })

  it('board.reset wipes content but keeps columns and settings', () => {
    const h = harness()
    h.run({ t: 'settings.update', voteLimit: 5, secretVoting: true })
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x' })
    h.run({ t: 'action.add', text: 'do it', owner: 'Bob' })
    const cols = h.state.columns
    h.run({ t: 'board.reset' })
    expect(Object.keys(h.state.notes)).toHaveLength(0)
    expect(Object.keys(h.state.actions)).toHaveLength(0)
    expect(h.state.columns).toEqual(cols)
    expect(h.state.settings).toMatchObject({ voteLimit: 5, secretVoting: true })
  })
})

describe('actions', () => {
  it('adds, toggles and deletes', () => {
    const h = harness()
    h.run({ t: 'action.add', text: 'Documenter', owner: 'Alice' })
    const id = Object.keys(h.state.actions)[0]!
    h.run({ t: 'action.toggle', id, done: true })
    expect(h.state.actions[id]!.done).toBe(true)
    h.run({ t: 'action.delete', id })
    expect(h.state.actions[id]).toBeUndefined()
  })
})

describe('browser agents policy', () => {
  it('is allowed by default and can be turned off and on', () => {
    const h = harness()
    expect(h.state.settings.browserAgentsAllowed).toBe(true)
    expect(h.run({ t: 'settings.update', browserAgentsAllowed: false }).ok).toBe(true)
    expect(h.state.settings.browserAgentsAllowed).toBe(false)
    h.run({ t: 'settings.update', title: 'Other' })
    expect(h.state.settings.browserAgentsAllowed).toBe(false)
  })
})

describe('column default colour', () => {
  it('template columns start with distinct default colours', () => {
    const h = harness()
    const colors = h.state.columns.map((c) => c.color)
    expect(colors.every((c) => typeof c === 'number')).toBe(true)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('new notes take the column colour unless the author picks another', () => {
    const h = harness()
    const col = h.col(0)
    h.run({ t: 'column.update', id: col, color: 4 })
    h.run({ t: 'note.add', columnId: col, text: 'default' })
    h.run({ t: 'note.add', columnId: col, text: 'picked', color: 1 })
    h.run({ t: 'note.addMany', items: [{ columnId: col, text: 'batch' }] })
    const byText = (t: string) => Object.values(h.state.notes).find((n) => n.text === t)!
    expect([byText('default').color, byText('picked').color, byText('batch').color]).toEqual([4, 1, 4])
  })

  it('rejects colours outside the palette and keeps the column untouched', () => {
    const h = harness()
    const col = h.col(0)
    const before = h.state.columns[0]!.color
    expect(h.run({ t: 'column.update', id: col, color: 8 })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'column.update', id: col, color: 1.5 })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'column.add', title: 'x', color: -1 })).toEqual({ ok: false, error: 'invalid' })
    expect(h.state.columns[0]!.color).toBe(before)
  })
})

describe('note length limit', () => {
  it('defaults to 280 and is a facilitator setting between 40 and 500', () => {
    const h = harness()
    expect(h.state.settings.noteMaxLength).toBe(280)
    expect(h.run({ t: 'settings.update', noteMaxLength: 100 }).ok).toBe(true)
    expect(h.state.settings.noteMaxLength).toBe(100)
    for (const bad of [39, 501, 100.5, Number.NaN]) {
      expect(h.run({ t: 'settings.update', noteMaxLength: bad })).toEqual({ ok: false, error: 'invalid' })
    }
    expect(h.state.settings.noteMaxLength).toBe(100)
  })

  it('refuses a note, a batch or an edit above the limit and accepts the limit itself', () => {
    const h = harness()
    h.run({ t: 'settings.update', noteMaxLength: 100 })
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'x'.repeat(100) }).ok).toBe(true)
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'x'.repeat(300) })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'note.addMany', items: [{ columnId: h.col(0), text: 'ok' }, { columnId: h.col(0), text: 'y'.repeat(101) }] })).toEqual({ ok: false, error: 'invalid' })
    const id = Object.keys(h.state.notes)[0]!
    expect(h.run({ t: 'note.edit', id, text: 'z'.repeat(101) }, alice)).toEqual({ ok: false, error: 'invalid' })
    expect(Object.keys(h.state.notes)).toHaveLength(1)
  })

  it('does not rewrite notes already above a limit lowered later', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x'.repeat(200) })
    h.run({ t: 'settings.update', noteMaxLength: 50 })
    expect(Object.values(h.state.notes)[0]!.text).toHaveLength(200)
  })
})
