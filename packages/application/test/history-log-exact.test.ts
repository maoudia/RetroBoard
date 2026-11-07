import type { BoardState, Command, VerifiedEvent } from '@retroboard/domain'
import { emptyLedger, foldAll } from '@retroboard/domain'
import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { historyOf, restoreCommands } from '../src'

function fresh() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
  const add = (text: string, col = 0, actor = alice) => { h.run({ t: 'note.add', columnId: h.col(col), text }, actor); return Object.values(h.state.notes).find((n) => n.text === text)!.id }
  return { h, add }
}

describe('the history of a cluster rename, exactly', () => {
  const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
  const FAC = 'f'.repeat(42) + 'A'
  const eid = (n: number) => `01J${String(n).padStart(23, '0')}`
  it('shows the title it had when the new one is empty', () => {
    const events: VerifiedEvent[] = [{ id: eid(1), at: 10, author: FAC, body: { t: 'genesis', roomId, facilitatorKey: FAC } }]
    const add = (cmd: Command) => { events.push({ id: eid(events.length + 1), at: 10 + events.length * 100, author: FAC, body: { t: 'cmd', cmd, name: 'A', showName: true } }) }
    add({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
    const col = foldAll(emptyLedger(roomId), events).board.columns[0]!.id
    add({ t: 'note.add', columnId: col, text: 'one' })
    add({ t: 'note.add', columnId: col, text: 'two' })
    const [one, two] = Object.values(foldAll(emptyLedger(roomId), events).board.notes).map((n) => n.id) as [string, string]
    add({ t: 'note.group', id: two, ontoId: one })
    const gid = foldAll(emptyLedger(roomId), events).board.notes[one]!.groupId!
    add({ t: 'group.rename', id: gid, title: 'Named' })
    add({ t: 'group.rename', id: gid, title: '' })
    const last = historyOf(roomId, events).at(-1)!
    expect(last).toMatchObject({ kind: 'rename', text: 'Named', columnId: col })
  })
})

describe('restoring a board, exactly', () => {
  it('leaves an idea grouped with ideas written since, as grouped by others', () => {
    const { h, add } = fresh()
    const a = add('a'); add('b')
    const target = h.state
    const z = add('z')
    h.run({ t: 'note.group', id: a, ontoId: z })
    expect(restoreCommands(target, h.state)).toEqual({ commands: [], skipped: 0, tooMany: false })
  })

  it('moves an idea alone, not the cluster it shares with newer ideas', () => {
    const { h, add } = fresh()
    const a = add('a')
    const target = h.state
    const z = add('z')
    h.run({ t: 'note.group', id: a, ontoId: z })
    h.run({ t: 'group.move', id: h.state.notes[a]!.groupId!, columnId: h.col(1) })
    expect(restoreCommands(target, h.state).commands).toEqual([{ t: 'note.move', id: a, columnId: h.col(0) }])
  })

  it('never takes apart or moves a voted cluster, and counts what it leaves', () => {
    const { h, add } = fresh()
    const a = add('a'); const b = add('b'); const c = add('c')
    h.run({ t: 'note.group', id: b, ontoId: a })
    h.run({ t: 'note.group', id: c, ontoId: a })
    const target = h.state
    h.run({ t: 'note.ungroup', id: c })
    const g = h.state.notes[a]!.groupId!
    h.run({ t: 'group.move', id: g, columnId: h.col(1) })
    h.run({ t: 'vote.add', kind: 'cluster', id: g })
    const plan = restoreCommands(target, h.state)
    expect(plan.skipped).toBe(4)
    expect(plan.commands).toEqual([{ t: 'note.group', id: c, ontoId: a }])
  })

  it('does not regroup an idea that sits in a voted cluster of other ideas', () => {
    const { h, add } = fresh()
    const a = add('a'); const b = add('b')
    h.run({ t: 'note.group', id: b, ontoId: a })
    const target = h.state
    h.run({ t: 'note.ungroup', id: a })
    const z = add('z')
    h.run({ t: 'note.group', id: b, ontoId: z })
    h.run({ t: 'vote.add', kind: 'cluster', id: h.state.notes[b]!.groupId! })
    const plan = restoreCommands(target, h.state)
    expect(plan).toEqual({ commands: [], skipped: 2, tooMany: false })
  })

  it('edits ideas of others, as a moderator', () => {
    const { h, add } = fresh()
    const b = add('orig', 0, bob)
    const target = h.state
    const now: BoardState = { ...target, notes: { ...target.notes, [b]: { ...target.notes[b]!, text: 'changed', color: 3 } } }
    expect(restoreCommands(target, now)).toEqual({ commands: [{ t: 'note.edit', id: b, text: 'orig' }, { t: 'note.color', id: b, color: target.notes[b]!.color }], skipped: 0, tooMany: false })
  })

  it('brings back deleted ideas by creation time then id, once each, and counts those whose column is gone', () => {
    const { h, add } = fresh()
    const a = add('a'); const b = add('b')
    const target = h.state
    const same: BoardState = { ...target, notes: { [b]: { ...target.notes[b]!, createdAt: 5 }, [a]: { ...target.notes[a]!, createdAt: 5 } } }
    const gone: BoardState = { ...target, notes: {} }
    const col = target.columns[0]!.id
    expect(restoreCommands(same, gone).commands).toEqual([{ t: 'note.add', columnId: col, text: 'a', color: 0 }, { t: 'note.add', columnId: col, text: 'b', color: 0 }])
    const older: BoardState = { ...target, notes: { [a]: { ...target.notes[a]!, createdAt: 9 }, [b]: { ...target.notes[b]!, createdAt: 1 } } }
    expect(restoreCommands(older, gone).commands.map((c) => (c as { text: string }).text)).toEqual(['b', 'a'])
    expect(restoreCommands(same, { ...gone, columns: target.columns.slice(1) })).toEqual({ commands: [], skipped: 2, tooMany: false })
    const twin: BoardState = { ...gone, notes: { x: { ...target.notes[a]!, id: 'x', createdAt: 99 } } }
    expect(restoreCommands(same, twin).commands.map((c) => (c as { text: string }).text)).toEqual(['b'])
  })

  it('renames a cluster back only when it kept its id and its ideas, with at least two', () => {
    const { h, add } = fresh()
    const a = add('a'); const b = add('b')
    h.run({ t: 'note.group', id: b, ontoId: a })
    const g = h.state.notes[a]!.groupId!
    h.run({ t: 'group.rename', id: g, title: 'Named' })
    const target = h.state
    h.run({ t: 'group.rename', id: g, title: 'Other' })
    expect(restoreCommands(target, h.state).commands).toEqual([{ t: 'group.rename', id: g, title: 'Named' }])
    const c = add('c')
    h.run({ t: 'note.group', id: c, ontoId: a })
    const t2 = h.state
    h.run({ t: 'note.delete', id: b })
    h.run({ t: 'note.delete', id: c })
    h.run({ t: 'group.rename', id: g, title: 'Zzz' })
    expect(restoreCommands(t2, h.state).commands.every((c) => c.t === 'note.add')).toBe(true)
  })

  it('does not rename a cluster that is not made of the same ideas any more, nor one with a single common idea', () => {
    const one = fresh()
    const a = one.add('a'); const b = one.add('b')
    one.h.run({ t: 'note.group', id: b, ontoId: a })
    const g = one.h.state.notes[a]!.groupId!
    one.h.run({ t: 'group.rename', id: g, title: 'T1' })
    const target = one.h.state
    const z = one.add('z')
    one.h.run({ t: 'note.group', id: z, ontoId: a })
    one.h.run({ t: 'note.delete', id: b })
    one.h.run({ t: 'group.rename', id: g, title: 'T2' })
    expect(restoreCommands(target, one.h.state).commands.map((c) => c.t)).toEqual(['note.add'])

    const two = fresh()
    const a2 = two.add('a'); const b2 = two.add('b')
    two.h.run({ t: 'note.group', id: b2, ontoId: a2 })
    const g2 = two.h.state.notes[a2]!.groupId!
    two.h.run({ t: 'group.rename', id: g2, title: 'T1' })
    const target2 = two.h.state
    const z1 = two.add('z1'); const z2 = two.add('z2'); const y = two.add('y')
    two.h.run({ t: 'note.group', id: z1, ontoId: a2 })
    two.h.run({ t: 'note.group', id: z2, ontoId: a2 })
    two.h.run({ t: 'note.ungroup', id: b2 })
    two.h.run({ t: 'note.group', id: b2, ontoId: y })
    two.h.run({ t: 'vote.add', kind: 'cluster', id: two.h.state.notes[b2]!.groupId! })
    two.h.run({ t: 'group.rename', id: g2, title: 'T2' })
    const plan = restoreCommands(target2, two.h.state)
    expect(plan.commands.some((c) => c.t === 'group.rename')).toBe(false)
  })
})
