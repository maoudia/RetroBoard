import { type Command, LIMITS, type Snapshot } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { type BoardChannel, createBoardCommands } from '../src'

type View = Record<string, unknown>
const baseView = (over: View = {}): Snapshot => ({
  settings: { locked: false, votingClosed: false, maxVotesPerItem: 2, talkMode: 'ring', talkSelfStart: true, ...((over.settings as object) ?? {}) },
  columns: [{ id: 'c1' }, { id: 'c2' }],
  notes: [{ id: 'n1', columnId: 'c1', text: 'old', color: 1, groupId: null, mine: true, votable: true, myVotes: 0 }, { id: 'n2', columnId: 'c1', text: 'two', color: 0, groupId: null, mine: true, votable: true, myVotes: 0 }],
  groups: [{ id: 'g1', columnId: 'c1', title: 'Old', votable: true, myVotes: 0 }],
  votesLeft: 3,
  ...over,
  ...(over.settings ? { settings: { locked: false, votingClosed: false, maxVotesPerItem: 2, talkMode: 'ring', talkSelfStart: true, ...(over.settings as object) } } : {}),
}) as unknown as Snapshot

function rig(view: Snapshot | null = baseView(), online = true) {
  const sent: Command[] = []
  const sizes: [number, number][] = []
  const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: (c) => (online ? (sent.push(c), true) : false) }
  const commands = createBoardCommands({ channel: () => channel, view: () => view, onHistory: (u, r) => sizes.push([u, r]) })
  return { sent, sizes, commands }
}

describe('use cases that send one command, exactly', () => {
  const cases: [string, (c: ReturnType<typeof rig>['commands']) => unknown, Command][] = [
    ['freeze', (c) => c.freeze('n1'), { t: 'note.freeze', id: 'n1' }],
    ['unfreeze', (c) => c.unfreeze('n1'), { t: 'note.unfreeze', id: 'n1' }],
    ['pin', (c) => c.pin('n1'), { t: 'note.pin', id: 'n1' }],
    ['unpin', (c) => c.unpin('n1'), { t: 'note.unpin', id: 'n1' }],
    ['mergeGroups', (c) => c.mergeGroups('g1', 'g2'), { t: 'group.merge', id: 'g1', ontoId: 'g2' }],
    ['giveFloor', (c) => c.giveFloor('Ann', 'Ann'), { t: 'talk.assign', speaker: 'Ann', label: 'Ann' }],
    ['endTurn', (c) => c.endTurn(), { t: 'talk.end' }],
    ['takeFloor', (c) => c.takeFloor(), { t: 'talk.self' }],
    ['giveBackFloor', (c) => c.giveBackFloor(), { t: 'talk.done' }],
    ['revealDrafts', (c) => c.revealDrafts(), { t: 'drafts.reveal' }],
    ['revealDrafts with a length', (c) => c.revealDrafts(8), { t: 'drafts.reveal', seconds: 8 }],
    ['revealDrafts with zero', (c) => c.revealDrafts(0), { t: 'drafts.reveal' }],
    ['setRoti', (c) => c.setRoti(4), { t: 'roti.set', score: 4 }],
    ['postChat', (c) => c.postChat('hi'), { t: 'chat.post', text: 'hi' }],
    ['clearChat', (c) => c.clearChat(), { t: 'chat.clear' }],
    ['setPresenting', (c) => c.setPresenting(true), { t: 'presenter.set', on: true }],
    ['setTurn', (c) => c.setTurn('c1'), { t: 'turn.set', columnId: 'c1' }],
    ['hideColumn', (c) => c.hideColumn('c1'), { t: 'column.hide', id: 'c1' }],
    ['showColumn', (c) => c.showColumn(null), { t: 'column.show', id: null }],
    ['destroyBoard', (c) => c.destroyBoard(), { t: 'board.destroy' }],
    ['previousPhase', (c) => c.previousPhase(), { t: 'agenda.prev' }],
    ['resetColumn', (c) => c.resetColumn('c1'), { t: 'column.reset', id: 'c1' }],
    ['resetVotes', (c) => c.resetVotes(), { t: 'vote.reset' }],
    ['addAction with a due date', (c) => c.addAction('Fix', 'Bob', '2027-01-01'), { t: 'action.add', text: 'Fix', owner: 'Bob', due: '2027-01-01' }],
    ['addAction with everything', (c) => c.addAction('Fix', 'Bob', '2027-01-01', 'n1'), { t: 'action.add', text: 'Fix', owner: 'Bob', due: '2027-01-01', sourceNote: 'n1' }],
    ['resetTimer with the agenda clock', (c) => c.resetTimer(5, true), { t: 'timer.reset', minutes: 5, agendaClock: true }],
  ]
  it.each(cases)('%s', (_name, run, expected) => {
    const { sent, commands } = rig()
    expect(run(commands)).toEqual({ ok: true })
    expect(sent).toStrictEqual([expected])
  })

  it('cuts the imports and the phases to the protocol limits, and sends nothing for no import', () => {
    const { sent, commands } = rig()
    const items = Array.from({ length: LIMITS.maxImport + 5 }, (_, i) => ({ text: `a${i}`, owner: '', status: 'todo' as const }))
    commands.importActions(items)
    expect((sent[0] as { items: unknown[] }).items).toHaveLength(LIMITS.maxImport)
    sent.length = 0
    expect(commands.importActions([])).toEqual({ ok: true })
    expect(sent).toEqual([])
    commands.setAgenda(Array.from({ length: LIMITS.maxPhases + 3 }, () => ({ kind: 'write' as const, minutes: 1 })))
    expect((sent[0] as { phases: unknown[] }).phases).toHaveLength(LIMITS.maxPhases)
  })
})

describe('locked boards, exactly', () => {
  const locked = () => rig(baseView({ settings: { locked: true } }))
  it('refuses the writes that are guarded, and still lets colours and cluster titles through', () => {
    const guarded: ((c: ReturnType<typeof rig>['commands']) => unknown)[] = [(c) => c.editNote('n1', 'x'), (c) => c.deleteNote('n1'), (c) => c.moveNote('n1', 'c2'), (c) => c.groupNotes('n1', 'n2'), (c) => c.ungroupNote('n1'), (c) => c.dissolveGroup('g1'), (c) => c.moveGroup('g1', 'c2'), (c) => c.mergeGroups('g1', 'g2')]
    for (const run of guarded) {
      const { sent, commands } = locked()
      expect(run(commands)).toEqual({ ok: false, error: 'locked' })
      expect(sent).toEqual([])
    }
    const { sent, commands } = locked()
    expect(commands.recolorNote('n1', 2)).toEqual({ ok: true })
    expect(commands.renameGroup('g1', 'New')).toEqual({ ok: true })
    expect(sent).toHaveLength(2)
  })

  it('ignores merging a cluster with itself without sending, even when locked', () => {
    const { sent, commands } = locked()
    expect(commands.mergeGroups('g1', 'g1')).toEqual({ ok: true })
    expect(sent).toEqual([])
  })
})

describe('undo and redo, exactly', () => {
  it('remembers an edit, tells the history size, and forgets redo steps after a new action', () => {
    const { commands, sizes } = rig()
    expect(commands.undo()).toBeNull()
    expect(commands.redo()).toBeNull()
    commands.editNote('n1', 'new')
    expect(sizes.at(-1)).toEqual([1, 0])
    expect(commands.canUndo()).toBe(true)
    expect(commands.undo()).toEqual({ result: { ok: true }, label: 'edit' })
    expect(sizes.at(-1)).toEqual([0, 1])
    expect(commands.canRedo()).toBe(true)
    commands.editNote('n2', 'again')
    expect(commands.canRedo()).toBe(false)
    expect(sizes.at(-1)).toEqual([1, 0])
  })

  it('remembers nothing for a failed send or an action with no inverse', () => {
    const offline = rig(baseView(), false)
    expect(offline.commands.editNote('n1', 'new')).toEqual({ ok: false, error: 'offline' })
    expect(offline.commands.canUndo()).toBe(false)
    expect(offline.sizes).toEqual([])
    const same = rig()
    same.commands.editNote('n1', 'old')
    expect(same.commands.canUndo()).toBe(false)
    expect(same.sizes).toEqual([])
  })

  it('redoes what was undone, which can be undone again, and a deleted idea has no redo', () => {
    const { commands, sent } = rig()
    commands.editNote('n1', 'new')
    commands.undo()
    expect(commands.redo()).toEqual({ result: { ok: true }, label: 'edit' })
    expect(sent.at(-1)).toEqual({ t: 'note.edit', id: 'n1', text: 'new' })
    expect(commands.canUndo()).toBe(true)
    expect(commands.canRedo()).toBe(false)
    const d = rig()
    d.commands.deleteNote('n1')
    d.commands.undo()
    expect(d.commands.canRedo()).toBe(false)
  })

  it('does not undo or redo on a locked board, keeps telling the sizes, and reports the label', () => {
    let view = baseView()
    const sent: Command[] = []
    const sizes: [number, number][] = []
    const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: (c) => (sent.push(c), true) }
    const commands = createBoardCommands({ channel: () => channel, view: () => view, onHistory: (u, r) => sizes.push([u, r]) })
    commands.editNote('n1', 'new')
    commands.editNote('n2', 'new')
    sent.length = 0
    view = baseView({ settings: { locked: true } })
    expect(commands.undo()).toEqual({ result: { ok: false, error: 'locked' }, label: 'edit' })
    expect(sent).toEqual([])
    expect(sizes.at(-1)).toEqual([1, 0])
    view = baseView()
    commands.undo()
    expect(sizes.at(-1)).toEqual([0, 1])
    view = baseView({ settings: { locked: true } })
    expect(commands.redo()).toEqual({ result: { ok: false, error: 'locked' }, label: 'edit' })
    expect(sent).toHaveLength(1)
    expect(sizes.at(-1)).toEqual([0, 0])
  })

  it('stops an undo at the first refused command and says so, still telling the sizes', () => {
    let online = true
    const sizes: [number, number][] = []
    const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: () => online }
    const commands = createBoardCommands({ channel: () => channel, view: () => baseView(), onHistory: (u, r) => sizes.push([u, r]) })
    commands.editNote('n1', 'new')
    online = false
    expect(commands.undo()).toEqual({ result: { ok: false, error: 'offline' }, label: 'edit' })
    expect(sizes.at(-1)).toEqual([0, 0])
    expect(commands.canRedo()).toBe(false)
    online = true
    commands.editNote('n1', 'new')
    commands.undo()
    online = false
    expect(commands.redo()).toEqual({ result: { ok: false, error: 'offline' }, label: 'edit' })
    expect(sizes.at(-1)).toEqual([0, 0])
  })

  it('records the inverse of each redone command and tells the sizes once', () => {
    const { commands, sizes } = rig()
    commands.editNote('n1', 'new')
    commands.undo()
    sizes.length = 0
    commands.redo()
    expect(sizes).toEqual([[1, 0]])
  })
})

describe('publishing, exactly', () => {
  it('stops at the first batch the channel refuses', () => {
    let calls = 0
    const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: () => (calls++, calls < 2) }
    const commands = createBoardCommands({ channel: () => channel, view: () => baseView() })
    const items = Array.from({ length: LIMITS.maxBatch * 3 }, (_, i) => ({ columnId: 'c1', text: `i${i}` }))
    expect(commands.publish(items)).toEqual({ ok: false, error: 'offline' })
    expect(calls).toBe(2)
  })

  it('redo does not remember a step that has no inverse any more', () => {
    let view = baseView()
    const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: () => true }
    const commands = createBoardCommands({ channel: () => channel, view: () => view })
    commands.editNote('n1', 'new')
    commands.undo()
    view = baseView({ notes: [{ id: 'n1', columnId: 'c1', text: 'new', color: 1, groupId: null, mine: true, votable: true, myVotes: 0 }] })
    commands.redo()
    expect(commands.canUndo()).toBe(false)
  })
})

describe('history and rewind, exactly', () => {
  it('lists the history of the channel, nothing without a channel or without a history', () => {
    const entry = { id: 'e1' } as never
    const withHistory = createBoardCommands({ channel: () => ({ connect() {}, updateIdentity() {}, close() {}, send: () => true, history: () => [entry] }), view: () => null })
    expect(withHistory.history()).toEqual([entry])
    expect(createBoardCommands({ channel: () => null, view: () => null }).history()).toEqual([])
    expect(createBoardCommands({ channel: () => ({ connect() {}, updateIdentity() {}, close() {}, send: () => true }), view: () => null }).history()).toEqual([])
  })

  it('is offline without a channel, and tells the steps after a rewind', () => {
    expect(createBoardCommands({ channel: () => null, view: () => null }).rewind('e')).toEqual({ result: { ok: false, error: 'offline' }, sent: 0, skipped: 0 })
    const plan = { commands: [{ t: 'note.ungroup', id: 'n1' }, { t: 'note.ungroup', id: 'n2' }], skipped: 4, tooMany: false }
    const sent: Command[] = []
    const commands = createBoardCommands({ channel: () => ({ connect() {}, updateIdentity() {}, close() {}, send: (c) => (sent.push(c), true), rewindPlan: () => plan as never }), view: () => baseView() })
    expect(commands.rewind('e')).toEqual({ result: { ok: true }, sent: 2, skipped: 4 })
    expect(sent).toEqual(plan.commands)
  })
})

describe('votes, exactly', () => {
  it('sends the vote of a participant that has no view yet, and checks the right kind of item', () => {
    const none = rig(null)
    expect(none.commands.addVote('note', 'x')).toEqual({ ok: true })
    expect(none.commands.addVote('cluster', 'x')).toEqual({ ok: true })
    expect(none.commands.removeVote('cluster', 'x')).toEqual({ ok: true })
    expect(none.commands.toggleVote('x')).toEqual({ ok: true })
    expect(none.sent.map((c) => c.t)).toEqual(['vote.add', 'vote.add', 'vote.remove', 'vote.add'])
    const { commands } = rig()
    expect(commands.addVote('note', 'g1')).toEqual({ ok: false, error: 'not-found' })
    expect(commands.addVote('cluster', 'n1')).toEqual({ ok: false, error: 'not-found' })
    expect(commands.addVote('note', 'n1')).toEqual({ ok: true })
    expect(commands.addVote('cluster', 'g1')).toEqual({ ok: true })
  })

  it('refuses at the cap of an item only when the item is known, and when the budget is empty', () => {
    const capped = rig(baseView({ notes: [{ id: 'n1', votable: true, myVotes: 2 }], settings: { maxVotesPerItem: 2 } }))
    expect(capped.commands.addVote('note', 'n1')).toEqual({ ok: false, error: 'item-limit' })
    const under = rig(baseView({ notes: [{ id: 'n1', votable: true, myVotes: 1 }] }))
    expect(under.commands.addVote('note', 'n1')).toEqual({ ok: true })
    const empty = rig(baseView({ votesLeft: 0 }))
    expect(empty.commands.addVote('note', 'n1')).toEqual({ ok: false, error: 'vote-limit' })
    const closed = rig(baseView({ settings: { votingClosed: true } }))
    expect(closed.commands.addVote('note', 'n1')).toEqual({ ok: false, error: 'voting-closed' })
    expect(closed.commands.removeVote('note', 'n1')).toEqual({ ok: false, error: 'voting-closed' })
    const unvotable = rig(baseView({ notes: [{ id: 'n1', votable: false, myVotes: 0 }] }))
    expect(unvotable.commands.addVote('note', 'n1')).toEqual({ ok: false, error: 'not-votable' })
  })

  it('toggles a note: off when I voted, on otherwise', () => {
    const voted = rig(baseView({ notes: [{ id: 'n1', votable: true, myVotes: 1 }] }))
    voted.commands.toggleVote('n1')
    expect(voted.sent).toEqual([{ t: 'vote.remove', kind: 'note', id: 'n1' }])
    const unvoted = rig()
    unvoted.commands.toggleVote('n1')
    expect(unvoted.sent).toEqual([{ t: 'vote.add', kind: 'note', id: 'n1' }])
  })
})

describe('talk time and columns, exactly', () => {
  it('gives the floor unless talk time is off', () => {
    expect(rig(baseView({ settings: { talkMode: 'off' } })).commands.giveFloor('Ann', null)).toEqual({ ok: false, error: 'invalid' })
    expect(rig(null).commands.giveFloor('Ann', null)).toEqual({ ok: true })
    expect(rig(baseView({ settings: { talkMode: 'popup' } })).commands.giveFloor('Ann', null)).toEqual({ ok: true })
  })

  it('lets a participant take the floor only when talk time is on and self start is allowed', () => {
    expect(rig(baseView({ settings: { talkMode: 'off', talkSelfStart: true } })).commands.takeFloor()).toEqual({ ok: false, error: 'forbidden' })
    expect(rig(baseView({ settings: { talkMode: 'ring', talkSelfStart: false } })).commands.takeFloor()).toEqual({ ok: false, error: 'forbidden' })
    expect(rig(baseView({ settings: { talkMode: 'off', talkSelfStart: false } })).commands.takeFloor()).toEqual({ ok: false, error: 'forbidden' })
    expect(rig(baseView({ settings: { talkMode: 'ring', talkSelfStart: true } })).commands.takeFloor()).toEqual({ ok: true })
    expect(rig(null).commands.takeFloor()).toEqual({ ok: true })
  })

  it('keeps one column at least and the limit at most, and trusts a missing view', () => {
    const many = Array.from({ length: LIMITS.maxColumns }, (_, i) => ({ id: `c${i}` }))
    expect(rig(baseView({ columns: many })).commands.addColumn({ title: 'x' })).toEqual({ ok: false, error: 'limit-reached' })
    expect(rig(baseView({ columns: many.slice(1) })).commands.addColumn({ title: 'x' })).toEqual({ ok: true })
    expect(rig(null).commands.addColumn({ title: 'x' })).toEqual({ ok: true })
    expect(rig(baseView({ columns: [{ id: 'c1' }] })).commands.deleteColumn('c1')).toEqual({ ok: false, error: 'last-column' })
    expect(rig(baseView({ columns: [{ id: 'c1' }, { id: 'c2' }] })).commands.deleteColumn('c1')).toEqual({ ok: true })
    expect(rig(null).commands.deleteColumn('c1')).toEqual({ ok: true })
  })
})
