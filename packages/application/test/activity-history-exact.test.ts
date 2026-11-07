import type { AgendaState, Command, Peer, Snapshot, SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { activityBetween, appendActivity, buildColumnItems, createUndoStack, editDistance, groupTitle, inverseOf, presenceBetween, SORT_MODES, suggestRoutes } from '../src'

const MIN = 60_000
const agenda = (current: number, pausedAt: number | null = null): AgendaState => ({
  phases: [{ id: 'a', kind: 'write', plannedMs: MIN }, { id: 'b', kind: 'vote', plannedMs: MIN }], current, startedAt: 0, pausedAt, rules: true, autoPublish: true,
})
const snap = (a: AgendaState | null, over: { votingClosed?: boolean; reveal?: boolean } = {}) =>
  ({ agenda: a, settings: { votingClosed: over.votingClosed ?? false }, reveal: over.reveal ? { endsAt: 1 } : null }) as unknown as Snapshot

describe('activity between two snapshots, exactly', () => {
  it('says nothing without a baseline, and handles an agenda that appears or goes away', () => {
    expect(activityBetween(null, snap(agenda(0)), 5)).toEqual([])
    expect(activityBetween(snap(null), snap(agenda(1)), 5)).toEqual([])
    expect(activityBetween(snap(agenda(1)), snap(null), 5)).toEqual([])
    expect(activityBetween(snap(null), snap(agenda(0, 3)), 5)).toEqual([])
    expect(activityBetween(snap(agenda(0, 3)), snap(null), 5)).toEqual([])
  })

  it('announces a started phase, the end, and nothing when the agenda restarts before the first phase', () => {
    expect(activityBetween(snap(agenda(0)), snap(agenda(1)), 5)).toEqual([{ kind: 'phase.started', at: 5, phase: 'vote' }])
    expect(activityBetween(snap(agenda(1)), snap(agenda(2)), 5)).toEqual([{ kind: 'agenda.ended', at: 5 }])
    expect(activityBetween(snap(agenda(1)), snap(agenda(-1)), 5)).toEqual([])
    expect(activityBetween(snap(agenda(-1)), snap(agenda(0)), 5)).toEqual([{ kind: 'phase.started', at: 5, phase: 'write' }])
  })

  it('announces a pause and a resume, each only for its own change', () => {
    expect(activityBetween(snap(agenda(0)), snap(agenda(0, 9)), 5)).toEqual([{ kind: 'agenda.paused', at: 5 }])
    expect(activityBetween(snap(agenda(0, 9)), snap(agenda(0)), 5)).toEqual([{ kind: 'agenda.resumed', at: 5 }])
    expect(activityBetween(snap(agenda(0)), snap(agenda(0)), 5)).toEqual([])
    expect(activityBetween(snap(agenda(0, 3)), snap(agenda(0, 9)), 5)).toEqual([])
  })

  it('announces voting closing and opening once, and the start of a reveal', () => {
    expect(activityBetween(snap(null), snap(null, { votingClosed: true }), 5)).toEqual([{ kind: 'voting.closed', at: 5 }])
    expect(activityBetween(snap(null, { votingClosed: true }), snap(null), 5)).toEqual([{ kind: 'voting.opened', at: 5 }])
    expect(activityBetween(snap(null, { votingClosed: true }), snap(null, { votingClosed: true }), 5)).toEqual([])
    expect(activityBetween(snap(null), snap(null), 5)).toEqual([])
    expect(activityBetween(snap(null), snap(null, { reveal: true }), 5)).toEqual([{ kind: 'reveal.started', at: 5 }])
    expect(activityBetween(snap(null, { reveal: true }), snap(null, { reveal: true }), 5)).toEqual([])
  })
})

describe('presence between two lists, exactly', () => {
  const p = (name: string | null, over: Partial<Peer> = {}): Peer => ({ name, me: false, ...over })
  it('tells a session by its key or by its connection, never by two missing ones', () => {
    expect(presenceBetween([p('Ann', { conn: '1' })], [p('Ann', { conn: '2' })], 5)).toEqual([{ kind: 'participant.joined', at: 5, name: 'Ann' }, { kind: 'participant.left', at: 5, name: 'Ann' }])
    expect(presenceBetween([p('Ann', { key: 'k1' })], [p('Ann', { key: 'k2' })], 5)).toHaveLength(2)
    expect(presenceBetween([p('Ann', { key: 'k1', conn: '1' })], [p('Ann', { key: 'k1', conn: '2' })], 5)).toEqual([])
    expect(presenceBetween([p('Ann', { conn: '1' })], [p('Ann', { key: 'k', conn: '1' })], 5)).toEqual([])
    expect(presenceBetween([p('Ann')], [p('Ann')], 5)).toHaveLength(2)
    expect(presenceBetween([p('Ann', { key: 'k1', conn: '1' })], [p('Ann', { key: 'k2', conn: '1' })], 5)).toEqual([])
    expect(presenceBetween([p('Ann', { key: 'k1', conn: '1' })], [p('Ann', { key: 'k1', conn: '9' })], 5)).toEqual([])
  })
})

describe('the activity log, exactly', () => {
  it('numbers events from the next id, newest first, and keeps the most recent ones', () => {
    const e = (at: number) => ({ kind: 'reveal.started' as const, at })
    const log = appendActivity([{ ...e(1), id: 1 }], [e(2), e(3)], 2)
    expect(log.map((x) => [x.id, x.at])).toEqual([[3, 3], [2, 2], [1, 1]])
    expect(appendActivity(log, [e(4)], 4, 3).map((x) => x.id)).toEqual([4, 3, 2])
  })
})

describe('inverse of an action, exactly', () => {
  const note = (id: string, over: Partial<SnapshotNote> = {}): SnapshotNote => ({
    id, columnId: 'c1', text: id, color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: true, createdAt: 0, ...over,
  })
  const group = (id: string, title: string | null = null): SnapshotGroup => ({ id, columnId: 'c1', title, votes: 0, myVotes: 0, votable: true })
  const view = (notes: SnapshotNote[], groups: SnapshotGroup[] = []) => ({ notes, groups }) as unknown as Snapshot
  const inv = (cmd: Command, v: Snapshot | null) => inverseOf(cmd, v)

  it('puts a loose idea back where it was, labelled', () => {
    const v = view([note('a'), note('b', { columnId: 'c2' })])
    expect(inv({ t: 'note.group', id: 'a', ontoId: 'b' }, v)).toEqual({ label: 'group', commands: [{ t: 'note.ungroup', id: 'a' }, { t: 'note.move', id: 'a', columnId: 'c1' }], redo: [{ t: 'note.group', id: 'a', ontoId: 'b' }] })
    expect(inv({ t: 'note.group', id: 'a', ontoId: 'b' }, view([note('a'), note('b')]))).toEqual({ label: 'group', commands: [{ t: 'note.ungroup', id: 'a' }], redo: [{ t: 'note.group', id: 'a', ontoId: 'b' }] })
  })

  it('has no inverse when an idea is unknown, the same, or already together', () => {
    const v = view([note('a'), note('b'), note('c', { groupId: 'g' }), note('d', { groupId: 'g' })])
    expect(inv({ t: 'note.group', id: 'zz', ontoId: 'b' }, v)).toBeNull()
    expect(inv({ t: 'note.group', id: 'a', ontoId: 'zz' }, v)).toBeNull()
    expect(inv({ t: 'note.group', id: 'a', ontoId: 'a' }, v)).toBeNull()
    expect(inv({ t: 'note.group', id: 'c', ontoId: 'd' }, v)).toBeNull()
  })

  it('moves an idea of a cluster back next to a mate other than itself', () => {
    const v = view([note('a', { groupId: 'g' }), note('b', { groupId: 'g' }), note('x')])
    expect(inv({ t: 'note.group', id: 'a', ontoId: 'x' }, v)).toMatchObject({ label: 'group', commands: [{ t: 'note.group', id: 'a', ontoId: 'b' }] })
    expect(inv({ t: 'note.group', id: 'a', ontoId: 'x' }, view([note('a', { groupId: 'g' }), note('x')]))).toBeNull()
  })

  it('regroups an ungrouped idea with a mate that is not itself, and gives up without one or without the idea', () => {
    const v = view([note('a', { groupId: 'g' }), note('b', { groupId: 'g' })])
    expect(inv({ t: 'note.ungroup', id: 'a' }, v)).toMatchObject({ label: 'ungroup', commands: [{ t: 'note.group', id: 'a', ontoId: 'b' }] })
    expect(inv({ t: 'note.ungroup', id: 'zz' }, v)).toBeNull()
    expect(inv({ t: 'note.ungroup', id: 'a' }, view([note('a', { groupId: 'g' })]))).toBeNull()
    expect(inv({ t: 'note.ungroup', id: 'a' }, view([note('a')]))).toBeNull()
  })

  it('restores the text, the title and the colour only when they changed', () => {
    const v = view([note('a', { text: 'old', color: 2 })], [group('g', null), group('h', 'Named')])
    expect(inv({ t: 'note.edit', id: 'a', text: 'new' }, v)).toMatchObject({ label: 'edit', commands: [{ t: 'note.edit', id: 'a', text: 'old' }] })
    expect(inv({ t: 'note.edit', id: 'a', text: 'old' }, v)).toBeNull()
    expect(inv({ t: 'note.edit', id: 'zz', text: 'old' }, v)).toBeNull()
    expect(inv({ t: 'group.rename', id: 'h', title: 'New' }, v)).toMatchObject({ label: 'rename', commands: [{ t: 'group.rename', id: 'h', title: 'Named' }] })
    expect(inv({ t: 'group.rename', id: 'g', title: 'New' }, v)).toMatchObject({ commands: [{ t: 'group.rename', id: 'g', title: '' }] })
    expect(inv({ t: 'group.rename', id: 'g', title: '' }, v)).toBeNull()
    expect(inv({ t: 'group.rename', id: 'zz', title: 'x' }, v)).toBeNull()
    expect(inv({ t: 'note.color', id: 'a', color: 5 }, v)).toMatchObject({ label: 'color', commands: [{ t: 'note.color', id: 'a', color: 2 }] })
    expect(inv({ t: 'note.color', id: 'a', color: 2 }, v)).toBeNull()
    expect(inv({ t: 'note.color', id: 'zz', color: 2 }, v)).toBeNull()
  })

  it('brings back a deleted idea of mine as a new one, with no redo, and nothing for the idea of someone else', () => {
    const v = view([note('a', { text: 'mine', color: 3 }), note('b', { mine: false })])
    expect(inv({ t: 'note.delete', id: 'a' }, v)).toEqual({ label: 'delete', commands: [{ t: 'note.add', columnId: 'c1', text: 'mine', color: 3 }] })
    expect(inv({ t: 'note.delete', id: 'b' }, v)).toBeNull()
    expect(inv({ t: 'note.delete', id: 'zz' }, v)).toBeNull()
  })

  it('labels a move, gives up on anything else or without a view', () => {
    const v = view([note('a')])
    expect(inv({ t: 'note.move', id: 'a', columnId: 'c2' }, v)).toMatchObject({ label: 'move', commands: [{ t: 'note.move', id: 'a', columnId: 'c1' }] })
    expect(inv({ t: 'note.move', id: 'a', columnId: 'c1' }, v)).toBeNull()
    expect(inv({ t: 'note.move', id: 'zz', columnId: 'c1' }, v)).toBeNull()
    expect(inv({ t: 'vote.reset' } as Command, v)).toBeNull()
    expect(inv({ t: 'note.move', id: 'a', columnId: 'c2' }, null)).toBeNull()
  })

  it('keeps a stack of at most thirty, newest last', () => {
    const s = createUndoStack()
    const make = (n: number) => ({ label: 'move' as const, commands: [{ t: 'note.move', id: String(n), columnId: 'c' } as Command] })
    for (let n = 0; n < 32; n++) s.push(make(n))
    expect(s.size).toBe(30)
    expect(s.peek()).toEqual(make(31))
    expect(s.pop()).toEqual(make(31))
    expect(s.peek()).toEqual(make(30))
    s.clear()
    expect(s.size).toBe(0)
    expect(s.peek()).toBeUndefined()
    expect(createUndoStack(1).push(make(1))).toBeUndefined()
  })
})

describe('route suggestions, exactly', () => {
  it('measures slips, swaps of neighbours and a tail of the same letter', () => {
    expect(editDistance('ab', 'ba')).toBe(1)
    expect(editDistance('abcd', 'acbd')).toBe(1)
    expect(editDistance('ab', 'bc')).toBe(2)
    expect(editDistance('ab', 'ca')).toBe(2)
    expect(editDistance('ca', 'abc')).toBe(3)
    expect(editDistance('', 'abc')).toBe(3)
    expect(editDistance('abc', '')).toBe(3)
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })

  it('suggests nothing for the home page, or for the home route itself', () => {
    expect(suggestRoutes('/', ['/a', '/b'])).toEqual([])
    expect(suggestRoutes('', ['/a'])).toEqual([])
    expect(suggestRoutes('/x', ['/'])).toEqual([])
  })

  it('tolerates one slip up to four letters and two beyond', () => {
    expect(suggestRoutes('/abcd', ['/abxy'])).toEqual([])
    expect(suggestRoutes('/abcd', ['/abcx'])).toEqual(['/abcx'])
    expect(suggestRoutes('/abcde', ['/abxyz', '/abcxy'])).toEqual(['/abcxy'])
    expect(suggestRoutes('/abcde', ['/abcxy'])).toEqual(['/abcxy'])
  })

  it('only reads the first segment, in lower case, and routes without their slash', () => {
    expect(suggestRoutes('/Boards/zz?x=1#y', ['/board'])).toEqual(['/board'])
    expect(suggestRoutes('/abc', ['abc/d'])).toEqual([])
    expect(suggestRoutes('/board', ['/BOARDS'])).toEqual(['/BOARDS'])
    expect(suggestRoutes('/board', ['/board'])).toEqual([])
  })

  it('orders by distance then name, and keeps at most the asked number', () => {
    expect(suggestRoutes('/abcde', ['/abcdz', '/abcdy', '/abcyy'], 2)).toEqual(['/abcdy', '/abcdz'])
    expect(suggestRoutes('/abcde', ['/abcdz', '/abcdy'], 1)).toEqual(['/abcdy'])
    expect(suggestRoutes('/abcde', ['/abcdz', '/abcdy', '/abcdx'])).toHaveLength(2)
  })
})

describe('column items, exactly', () => {
  const note = (id: string, over: Partial<SnapshotNote> = {}): SnapshotNote => ({
    id, columnId: 'c1', text: id, color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...over,
  })
  const group = (id: string, over: Partial<SnapshotGroup> = {}): SnapshotGroup => ({ id, columnId: 'c1', title: null, votes: 0, myVotes: 0, votable: true, ...over })
  const keys = (items: ReturnType<typeof buildColumnItems>) => items.map((i) => i.key)

  it('lists every sort mode', () => {
    expect([...SORT_MODES]).toEqual(['time', 'newest', 'votes', 'author', 'color', 'size', 'alpha'])
  })

  it('titles a cluster by its shortest idea once trimmed, and by nothing when all are blank', () => {
    expect(groupTitle({ title: null }, [note('1', { text: '   ab   ' }), note('2', { text: 'cde' })])).toBe('ab')
    expect(groupTitle({ title: null }, [note('1', { text: '  ' }), note('2', { text: 'cde' })])).toBe('cde')
    expect(groupTitle({ title: null }, [note('1', { text: ' ' })])).toBe('')
    expect(groupTitle({ title: 'Named' }, [note('1')])).toBe('Named')
  })

  it('sorts alphabetically without the spaces around, and by author with anonymous ones last in creation order', () => {
    const notes = [note('1', { text: ' b' }), note('2', { text: 'a' })]
    expect(keys(buildColumnItems({ notes, groups: [] }, 'c1', 'alpha'))).toEqual(['2', '1'])
    const authors = [note('1'), note('2', { author: ' Bob ' }), note('3'), note('4', { author: 'alice' }), note('5', { author: 'ALICE' })]
    expect(keys(buildColumnItems({ notes: authors, groups: [] }, 'c1', 'author'))).toEqual(['4', '5', '2', '1', '3'])
  })

  it('sorts by size with groups first, bigger first, notes after, creation order among equals', () => {
    const notes = [note('1'), note('2', { groupId: 'g2' }), note('3', { groupId: 'g2' }), note('4', { groupId: 'g3' }), note('5', { groupId: 'g3' }), note('6', { groupId: 'g3' }), note('7')]
    expect(keys(buildColumnItems({ notes, groups: [group('g2'), group('g3')] }, 'c1', 'size'))).toEqual(['g3', 'g2', '1', '7'])
  })

  it('puts pinned items first in pin order, whatever the sort', () => {
    const notes = [note('1'), note('2', { pinned: 2 }), note('3', { groupId: 'g' }), note('4', { pinned: 1 }), note('5', { votes: 9 })]
    const groups = [group('g', { pinned: 3 })]
    expect(keys(buildColumnItems({ notes, groups }, 'c1', 'votes'))).toEqual(['4', '2', 'g', '5', '1'])
    expect(keys(buildColumnItems({ notes, groups }, 'c1', 'time'))).toEqual(['4', '2', 'g', '1', '5'])
    expect(keys(buildColumnItems({ notes: [note('1'), note('2', { pinned: 5 })], groups: [] }, 'c1', 'time'))).toEqual(['2', '1'])
    expect(keys(buildColumnItems({ notes: [note('1', { pinned: 5 }), note('2')], groups: [] }, 'c1', 'newest'))).toEqual(['1', '2'])
  })
})

describe('column items in any creation order, exactly', () => {
  const note = (id: string, over: Partial<SnapshotNote> = {}): SnapshotNote => ({
    id, columnId: 'c1', text: id, color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...over,
  })
  const perms = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])))

  it('sorts by author the same way whatever the order the ideas were written in', () => {
    const base = [note('a1', { author: 'Ann' }), note('b1', { author: 'Bob' }), note('x1'), note('x2')]
    for (const order of perms(base)) {
      const keys = buildColumnItems({ notes: order, groups: [] }, 'c1', 'author').map((i) => i.key)
      expect(keys.slice(0, 2)).toEqual(['a1', 'b1'])
      expect(keys.slice(2)).toEqual(order.filter((n) => !n.author).map((n) => n.id))
    }
  })

  it('sorts by size the same way whatever the order', () => {
    const notes = [note('s'), note('t'), note('p1', { groupId: 'p' }), note('p2', { groupId: 'p' }), note('q1', { groupId: 'q' }), note('q2', { groupId: 'q' }), note('q3', { groupId: 'q' })]
    for (const order of perms(notes).filter((_, i) => i % 37 === 0)) {
      const keys = buildColumnItems({ notes: order, groups: [{ id: 'p', columnId: 'c1', title: null, votes: 0, myVotes: 0, votable: true }, { id: 'q', columnId: 'c1', title: null, votes: 0, myVotes: 0, votable: true }] }, 'c1', 'size').map((i) => i.key)
      expect(keys.slice(0, 2)).toEqual(['q', 'p'])
    }
  })
})
