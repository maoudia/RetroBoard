import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type Actor, anchorPoint, type BoardState, type Dirty, type NoteRecord, type ReduceContext, countOf, CURSOR_SCALE, CURSOR_STALE_MS, lerp, NOTE_COLOR_COUNT, reduce, ROTI_MAX, ROTI_MIN, rotiSummary, type TimedCursor, visibleCursors, votability, votesUsedBy } from '../src'
import { isFrozenNote, touchesFrozen } from '../src/ideation/freeze'
import { makeNote, normalizeGroups } from '../src/ideation/notes'
import { clean } from '../src/shared/outcome'

describe('cursors, exactly', () => {
  it('anchors a point as fractions of the box, and as nothing when the box has no size', () => {
    const box = { left: 100, top: 50, width: 200, height: 100 }
    const half = Math.round(CURSOR_SCALE / 2)
    expect(anchorPoint(box, 200, 100)).toEqual({ x: half, y: half })
    expect(anchorPoint(box, 100, 50)).toEqual({ x: 0, y: 0 })
    expect(anchorPoint(box, 300, 150)).toEqual({ x: CURSOR_SCALE, y: CURSOR_SCALE })
    expect(anchorPoint({ ...box, width: 0 }, 200, 100)).toEqual({ x: 0, y: half })
    expect(anchorPoint({ ...box, height: 0 }, 200, 100)).toEqual({ x: half, y: 0 })
    expect(anchorPoint({ ...box, width: -10 }, 90, 100)).toEqual({ x: 0, y: half })
    expect(anchorPoint({ ...box, height: -10 }, 200, 40)).toEqual({ x: half, y: 0 })
  })

  it('draws a cursor until it is stale, not a moment longer, and never one off the board', () => {
    const at = (conn: string, ageMs: number, anchor: string | null = 'n1'): TimedCursor => ({ conn, anchor, x: 1, y: 1, drag: false, at: 10_000 - ageMs })
    const shown = visibleCursors([at('a', CURSOR_STALE_MS - 1), at('b', CURSOR_STALE_MS), at('c', 0, null), at('d', 0)], 10_000)
    expect(shown.map((c) => c.conn)).toEqual(['d', 'a'])
  })

  it('interpolates linearly and keeps the fraction between 0 and 1', () => {
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 0.5)).toBe(15)
    expect(lerp(10, 20, 1)).toBe(20)
    expect(lerp(20, 10, 0.25)).toBe(17.5)
    expect(lerp(0, 10, 2)).toBe(10)
    expect(lerp(0, 10, -1)).toBe(0)
  })
})

describe('votes counted and allowed, exactly', () => {
  it('counts the votes of one person on notes and on clusters, repeats included, and nobody else\'s', () => {
    const h = harness()
    h.run({ t: 'settings.update', voteLimit: 8, maxVotesPerItem: 3 })
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
    h.run({ t: 'note.add', columnId: h.col(0), text: 'b' }, alice)
    h.run({ t: 'note.add', columnId: h.col(0), text: 'c' }, alice)
    const [a, b, c] = Object.keys(h.state.notes) as [string, string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    const g = h.state.notes[a]!.groupId!
    for (const [kind, id] of [['note', c], ['note', c], ['cluster', g]] as const) h.run({ t: 'vote.add', kind, id }, alice)
    h.run({ t: 'vote.add', kind: 'note', id: c }, bob)
    h.run({ t: 'vote.add', kind: 'cluster', id: g }, bob)
    expect(votesUsedBy(h.state, alice.cid)).toBe(3)
    expect(votesUsedBy(h.state, bob.cid)).toBe(2)
    expect(votesUsedBy(h.state, 'nobody')).toBe(0)
    expect(countOf(['x', 'y', 'x'], 'x')).toBe(2)
    expect(countOf(['x'], 'z')).toBe(0)
  })

  describe('what may be voted on', () => {
    const board = (votable: 'notes' | 'clusters' | 'both') => {
      const h = harness()
      h.run({ t: 'settings.update', votable })
      h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
      h.run({ t: 'note.add', columnId: h.col(0), text: 'b' }, alice)
      h.run({ t: 'note.add', columnId: h.col(1), text: 'solo' }, alice)
      const ids = Object.fromEntries(Object.values(h.state.notes).map((n) => [n.text, n.id])) as Record<'a' | 'b' | 'solo', string>
      h.run({ t: 'note.group', id: ids.a, ontoId: ids.b })
      return { h, ids, group: h.state.notes[ids.a]!.groupId! }
    }

    it('follows the setting for notes, notes in a cluster and clusters', () => {
      for (const [votable, solo, inCluster, cluster] of [['notes', null, null, 'not-votable'], ['clusters', 'not-votable', 'not-votable', null], ['both', null, 'not-votable', null]] as const) {
        const { h, ids, group } = board(votable)
        expect(votability(h.state, 'note', ids.solo), `${votable} solo`).toBe(solo)
        expect(votability(h.state, 'note', ids.a), `${votable} in a cluster`).toBe(votable === 'notes' ? null : inCluster)
        expect(votability(h.state, 'cluster', group), `${votable} cluster`).toBe(cluster)
      }
    })

    it('says not found for what is not there, and not votable for a column that is closed to votes', () => {
      const { h, ids, group } = board('both')
      expect(votability(h.state, 'note', 'nope')).toBe('not-found')
      expect(votability(h.state, 'cluster', 'nope')).toBe('not-found')
      h.run({ t: 'column.update', id: h.col(0), votable: false })
      expect(votability(h.state, 'cluster', group)).toBe('not-votable')
      expect(votability(h.state, 'note', ids.solo)).toBeNull()
      const solo = board('both')
      solo.h.run({ t: 'column.update', id: solo.h.col(1), votable: false })
      expect(votability(solo.h.state, 'note', solo.ids.solo)).toBe('not-votable')
    })

    it('treats a note in a column that is gone as votable instead of failing', () => {
      const { h, ids } = board('both')
      const orphan: BoardState = { ...h.state, notes: { ...h.state.notes, [ids.solo]: { ...h.state.notes[ids.solo]!, columnId: 'ghost' } } }
      expect(votability(orphan, 'note', ids.solo)).toBeNull()
    })
  })
})

describe('notes, exactly', () => {
  const actor: Actor = { cid: 'c1', name: 'Ann', showName: true }
  const ctxOf = (id: string, now = 1_000): ReduceContext => ({ now, newId: () => id })
  /** The colour a note gets from its id: a 32-bit rolling hash, as BigInt so the wrap-around is exact. */
  const colourOf = (id: string) => {
    let h = 0n
    for (const ch of id) h = (h * 31n + BigInt(ch.charCodeAt(0))) & 0xffffffffn
    return Number(h % BigInt(NOTE_COLOR_COUNT))
  }

  it('gives a note the colour of its id, however long the id is, and keeps a colour that is asked for, 0 included', () => {
    expect(makeNote(actor, ctxOf('abc'), 'col', 't').color).toBe(96354 % NOTE_COLOR_COUNT)
    for (const id of ['x', 'id0001', 'a-much-longer-identifier-that-overflows-32-bits', 'ÉÀ~']) expect(makeNote(actor, ctxOf(id), 'col', 't').color, id).toBe(colourOf(id))
    expect(makeNote(actor, ctxOf('abc'), 'col', 't', 0).color).toBe(0)
    expect(makeNote(actor, ctxOf('abc'), 'col', 't', 5).color).toBe(5)
  })

  it('stamps the note with its owner, its author name only when shown, the time, and the offset of its batch', () => {
    const note = makeNote(actor, ctxOf('n1', 1_000), 'col', 'text', 2, 3)
    expect(note).toEqual({ id: 'n1', columnId: 'col', text: 'text', color: 2, author: 'Ann', ownerCid: 'c1', groupId: null, voters: [], createdAt: 1_003 })
    expect(makeNote({ ...actor, showName: false }, ctxOf('n'), 'c', 't').author).toBeNull()
    expect(makeNote({ ...actor, name: null }, ctxOf('n'), 'c', 't').author).toBeNull()
    expect(makeNote(actor, ctxOf('n', 50), 'c', 't').createdAt).toBe(50)
  })

  describe('groups that fall below two notes', () => {
    const note = (id: string, groupId: string | null): NoteRecord => ({ id, columnId: 'c', text: id, color: 0, author: null, ownerCid: 'o', groupId, voters: [], createdAt: 1 })
    const group = (id: string) => ({ id, columnId: 'c', title: null, voters: [] })
    const run = (ids: string[], notes: NoteRecord[], groupIds: string[]) => {
      const n = Object.fromEntries(notes.map((x) => [x.id, x]))
      const g = Object.fromEntries(groupIds.map((x) => [x, group(x)]))
      const dirty: Dirty = clean()
      normalizeGroups(ids, n, g, dirty)
      return { n, g, dirty }
    }

    it('keeps a group of two, dissolves a group of one and frees its note, and deletes an empty one', () => {
      const two = run(['g1'], [note('a', 'g1'), note('b', 'g1')], ['g1'])
      expect(Object.keys(two.g)).toEqual(['g1'])
      expect(two.dirty).toEqual(clean())
      const one = run(['g1'], [note('a', 'g1'), note('z', null)], ['g1'])
      expect(one.g).toEqual({})
      expect(one.n.a!.groupId).toBeNull()
      expect(one.dirty).toEqual({ ...clean(), notes: ['a'], groups: ['g1'] })
      const none = run(['g1'], [note('z', null)], ['g1'])
      expect(none.g).toEqual({})
      expect(none.dirty).toEqual({ ...clean(), groups: ['g1'] })
    })

    it('ignores a group that does not exist, and only looks at the groups it is given', () => {
      const ghost = run(['ghost'], [note('a', 'g1')], ['g1'])
      expect(ghost.dirty).toEqual(clean())
      expect(Object.keys(ghost.g)).toEqual(['g1'])
    })
  })
})

describe('frozen notes and clusters, exactly', () => {
  function board() {
    const h = harness()
    for (const text of ['a', 'b', 'c', 'd']) h.run({ t: 'note.add', columnId: text === 'd' ? h.col(1) : h.col(0), text }, alice)
    const ids = Object.fromEntries(Object.values(h.state.notes).map((n) => [n.text, n.id])) as Record<'a' | 'b' | 'c' | 'd', string>
    h.run({ t: 'note.group', id: ids.a, ontoId: ids.b })
    return { h, ids, group: h.state.notes[ids.a]!.groupId! }
  }

  it('freezes and unfreezes a note, naming it, and does nothing when it is already so', () => {
    const { h, ids } = board()
    const frozen = h.run({ t: 'note.freeze', id: ids.c })
    expect(frozen).toMatchObject({ ok: true, dirty: { ...clean(), notes: [ids.c] } })
    expect(h.state.notes[ids.c]!.frozen).toBe(true)
    expect(h.run({ t: 'note.freeze', id: ids.c })).toMatchObject({ ok: true, dirty: clean() })
    expect(h.run({ t: 'note.unfreeze', id: ids.c })).toMatchObject({ ok: true, dirty: { ...clean(), notes: [ids.c] } })
    expect(h.state.notes[ids.c]!.frozen).toBeUndefined()
    expect(h.run({ t: 'note.unfreeze', id: ids.c })).toMatchObject({ ok: true, dirty: clean() })
    expect(h.run({ t: 'note.freeze', id: 'nopeNope' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('freezes and unfreezes a cluster, naming it', () => {
    const { h, group } = board()
    expect(h.run({ t: 'note.freeze', id: group })).toMatchObject({ ok: true, dirty: { ...clean(), groups: [group] } })
    expect(h.state.groups[group]!.frozen).toBe(true)
    expect(h.run({ t: 'note.freeze', id: group })).toMatchObject({ ok: true, dirty: clean() })
    expect(h.run({ t: 'note.unfreeze', id: group })).toMatchObject({ ok: true, dirty: { ...clean(), groups: [group] } })
    expect(h.state.groups[group]!.frozen).toBeUndefined()
  })

  it('a note is frozen on its own or through its cluster, and a note pointing at a missing cluster is not', () => {
    const { h, ids, group } = board()
    expect(isFrozenNote(h.state, ids.a)).toBe(false)
    h.run({ t: 'note.freeze', id: group })
    expect(isFrozenNote(h.state, ids.a)).toBe(true)
    expect(isFrozenNote(h.state, ids.c)).toBe(false)
    expect(isFrozenNote(h.state, 'nope')).toBe(false)
    const lost: BoardState = { ...h.state, groups: {} }
    expect(isFrozenNote(lost, ids.a)).toBe(false)
  })

  it('refuses every command that would change something frozen, for the note or the cluster it names', () => {
    const { h, ids, group } = board()
    h.run({ t: 'note.freeze', id: ids.c })
    h.run({ t: 'note.freeze', id: group })
    const frozenNote = ids.c
    const free = ids.d
    for (const cmd of [{ t: 'note.edit', id: frozenNote, text: 'x' }, { t: 'note.delete', id: frozenNote }, { t: 'note.move', id: frozenNote, columnId: h.col(1) }, { t: 'note.color', id: frozenNote, color: 1 },
      { t: 'note.ungroup', id: frozenNote }, { t: 'vote.toggle', id: frozenNote }, { t: 'vote.add', kind: 'note', id: frozenNote }, { t: 'vote.remove', kind: 'note', id: frozenNote }] as const) {
      expect(touchesFrozen(h.state, cmd), cmd.t).toBe(true)
      expect(touchesFrozen(h.state, { ...cmd, id: free }), `${cmd.t} (free)`).toBe(false)
    }
    for (const cmd of [{ t: 'group.rename', id: group, title: 'x' }, { t: 'group.recolor', id: group, color: 1 }, { t: 'group.dissolve', id: group }, { t: 'group.move', id: group, columnId: h.col(1) },
      { t: 'vote.toggle', id: group }, { t: 'vote.add', kind: 'cluster', id: group }, { t: 'vote.remove', kind: 'cluster', id: group }] as const) {
      expect(touchesFrozen(h.state, cmd), cmd.t).toBe(true)
    }
    expect(touchesFrozen(h.state, { t: 'note.group', id: frozenNote, ontoId: free })).toBe(true)
    expect(touchesFrozen(h.state, { t: 'note.group', id: free, ontoId: frozenNote })).toBe(true)
    expect(touchesFrozen(h.state, { t: 'group.merge', id: group, ontoId: group })).toBe(true)
    expect(touchesFrozen(h.state, { t: 'group.merge', id: 'zzzz', ontoId: group })).toBe(true)
    expect(touchesFrozen(h.state, { t: 'note.group', id: free, ontoId: ids.d })).toBe(false)
    expect(touchesFrozen(h.state, { t: 'chat.post', text: 'hi' })).toBe(false)
    expect(h.run({ t: 'note.edit', id: frozenNote, text: 'x' })).toEqual({ ok: false, error: 'frozen' })
  })

  it('refuses to delete a column that holds a frozen note, and only that column', () => {
    const { h, ids } = board()
    h.run({ t: 'note.freeze', id: ids.c })
    expect(touchesFrozen(h.state, { t: 'column.delete', id: h.col(0) })).toBe(true)
    expect(touchesFrozen(h.state, { t: 'column.delete', id: h.col(1) })).toBe(false)
  })
})

describe('ROTI, exactly', () => {
  it('counts the scores from 1 to 5 and nothing outside, whole numbers only, and averages them', () => {
    const summary = rotiSummary({ roti: { a: 1, b: 1, c: 5, d: 3, e: 0, f: 6, g: 2.5, h: Number.NaN } }, null)
    expect(summary).toEqual({ counts: [2, 0, 1, 0, 1], total: 4, average: 2.5, mine: null })
    expect(rotiSummary({ roti: {} }, 'a')).toEqual({ counts: [0, 0, 0, 0, 0], total: 0, average: null, mine: null })
    expect(rotiSummary({}, 'a').total).toBe(0)
    expect(ROTI_MIN).toBe(1)
    expect(ROTI_MAX).toBe(5)
  })

  it('says what the viewer gave, or nothing', () => {
    expect(rotiSummary({ roti: { a: 4 } }, 'a').mine).toBe(4)
    expect(rotiSummary({ roti: { a: 4 } }, 'b').mine).toBeNull()
    expect(rotiSummary({ roti: { a: 4 } }, null).mine).toBeNull()
  })

  it('takes a score from 1 to 5 once, the last one counting, and says nothing changed when it is the same', () => {
    const h = harness()
    const ctx = { now: 1, newId: () => 'x' }
    // Straight to the reducer: the wire schema would refuse some of these before the rule sees them.
    for (const bad of [0, 6, 1.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(reduce(h.state, { t: 'roti.set', score: bad }, alice, ctx), String(bad)).toEqual({ ok: false, error: 'invalid' })
    for (const good of [1, 5]) expect(h.run({ t: 'roti.set', score: good }, alice).ok, String(good)).toBe(true)
    const same = h.run({ t: 'roti.set', score: 5 }, alice)
    expect(same).toMatchObject({ ok: true, dirty: clean() })
    const changed = h.run({ t: 'roti.set', score: 3 }, alice)
    expect(changed).toMatchObject({ ok: true, dirty: { ...clean(), meta: true } })
    expect(h.state.roti).toEqual({ [alice.cid]: 3 })
    h.run({ t: 'roti.set', score: 4 }, bob)
    expect(h.state.roti).toEqual({ [alice.cid]: 3, [bob.cid]: 4 })
  })

  it('refuses a score on a locked board', () => {
    const h = harness()
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'roti.set', score: 3 }, alice)).toEqual({ ok: false, error: 'locked' })
  })
})
