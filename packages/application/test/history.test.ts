import { describe, expect, it } from 'vitest'
import type { Snapshot } from '@retroboard/domain'
import { createUndoStack, inverseOf } from '../src'

const note = (id: string, columnId: string, groupId: string | null = null, extra: Record<string, unknown> = {}) => ({ id, columnId, groupId, text: `t-${id}`, color: 0, ...extra })
const view = (notes: ReturnType<typeof note>[]) => ({ notes, settings: { locked: false } } as unknown as Snapshot)

describe('inverse of reversible actions', () => {
  it('keeps the action itself so a redo can replay it', () => {
    const v = view([note('a', 'c1')])
    expect(inverseOf({ t: 'note.move', id: 'a', columnId: 'c2' }, v)?.redo).toEqual([{ t: 'note.move', id: 'a', columnId: 'c2' }])
  })
  it('moves a note back to its column', () => {
    const v = view([note('a', 'c1')])
    expect(inverseOf({ t: 'note.move', id: 'a', columnId: 'c2' }, v)).toMatchObject({ label: 'move', commands: [{ t: 'note.move', id: 'a', columnId: 'c1' }] })
    expect(inverseOf({ t: 'note.move', id: 'a', columnId: 'c1' }, v)).toBeNull()
  })
  it('ungroups a note that was grouped by mistake, and puts it back in its column', () => {
    const v = view([note('a', 'c1'), note('b', 'c2')])
    expect(inverseOf({ t: 'note.group', id: 'a', ontoId: 'b' }, v)?.commands).toEqual([{ t: 'note.ungroup', id: 'a' }, { t: 'note.move', id: 'a', columnId: 'c1' }])
  })
  it('puts a note back in its previous cluster', () => {
    const v = view([note('a', 'c1', 'g1'), note('m', 'c1', 'g1'), note('b', 'c1')])
    expect(inverseOf({ t: 'note.group', id: 'a', ontoId: 'b' }, v)?.commands).toEqual([{ t: 'note.group', id: 'a', ontoId: 'm' }])
  })
  it('regroups a note that was taken out of its cluster', () => {
    const v = view([note('a', 'c1', 'g1'), note('m', 'c1', 'g1')])
    expect(inverseOf({ t: 'note.ungroup', id: 'a' }, v)).toMatchObject({ label: 'ungroup', commands: [{ t: 'note.group', id: 'a', ontoId: 'm' }] })
  })
  it('restores the previous text and colour', () => {
    const v = view([note('a', 'c1', null, { text: 'before', color: 3 })])
    expect(inverseOf({ t: 'note.edit', id: 'a', text: 'after' }, v)?.commands).toEqual([{ t: 'note.edit', id: 'a', text: 'before' }])
    expect(inverseOf({ t: 'note.color', id: 'a', color: 5 }, v)?.commands).toEqual([{ t: 'note.color', id: 'a', color: 3 }])
  })
  it('puts a cluster title back, also when it had none', () => {
    const v = { ...view([]), groups: [{ id: 'g1', title: 'CI' }, { id: 'g2', title: null }] } as unknown as Snapshot
    expect(inverseOf({ t: 'group.rename', id: 'g1', title: 'Build' }, v)).toMatchObject({ label: 'rename', commands: [{ t: 'group.rename', id: 'g1', title: 'CI' }] })
    expect(inverseOf({ t: 'group.rename', id: 'g2', title: 'Build' }, v)?.commands).toEqual([{ t: 'group.rename', id: 'g2', title: '' }])
    expect(inverseOf({ t: 'group.rename', id: 'g1', title: 'CI' }, v)).toBeNull()
    expect(inverseOf({ t: 'group.rename', id: 'nope', title: 'x' }, v)).toBeNull()
  })
  it('has no inverse for what cannot be undone exactly, nor without a view', () => {
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([note('a', 'c1')]))).toBeNull()
    expect(inverseOf({ t: 'note.move', id: 'a', columnId: 'c2' }, null)).toBeNull()
  })
})

describe('undo stack', () => {
  it('is bounded and last in, first out', () => {
    const s = createUndoStack(2)
    for (const label of ['move', 'edit', 'color'] as const) s.push({ label, commands: [] })
    expect(s.size).toBe(2)
    expect(s.pop()?.label).toBe('color')
    expect(s.pop()?.label).toBe('edit')
    expect(s.pop()).toBeUndefined()
  })
})

describe('undo of a delete', () => {
  it('re-adds my idea as a new one, even when it had votes or a cluster, and refuses the ideas of others', () => {
    const mine = note('a', 'c1', null, { mine: true, votes: 0, voted: false })
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([mine]))).toMatchObject({ label: 'delete', commands: [{ t: 'note.add', columnId: 'c1', text: 't-a', color: 0 }] })
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([mine]))?.redo).toBeUndefined()
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([{ ...mine, votes: 2 } as never]))?.commands).toHaveLength(1)
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([{ ...mine, groupId: 'g' }]))?.commands).toHaveLength(1)
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([{ ...mine, votes: null } as never]))?.commands).toHaveLength(1)
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([note('a', 'c1', null, { mine: false })]))).toBeNull()
  })
})

describe('undo of an unpublish', () => {
  it('re-adds my idea as a new one in its column with its text and colour, with no redo, and never an idea of someone else', () => {
    const mine = note('a', 'c1', null, { mine: true, color: 4, text: 'Slow CI' })
    const inv = inverseOf({ t: 'note.unpublish', id: 'a' }, view([mine]))
    expect(inv).toEqual({ label: 'unpublish', commands: [{ t: 'note.add', columnId: 'c1', text: 'Slow CI', color: 4 }] })
    expect(inv?.redo).toBeUndefined()
    expect(inverseOf({ t: 'note.unpublish', id: 'a' }, view([{ ...mine, groupId: 'g' }]))?.commands).toHaveLength(1)
    expect(inverseOf({ t: 'note.unpublish', id: 'a' }, view([note('a', 'c1', null, { mine: false })]))).toBeNull()
    expect(inverseOf({ t: 'note.unpublish', id: 'ghost' }, view([mine]))).toBeNull()
    expect(inverseOf({ t: 'note.unpublish', id: 'a' }, null)).toBeNull()
  })

  it('is computed from the view before the action, so it still works once the cluster dissolved', async () => {
    const { createBoardCommands } = await import('../src')
    const sent: unknown[] = []
    let v = view([note('a', 'c1', 'g1', { mine: true, text: 'Slow CI', color: 2 }), note('b', 'c1', 'g1')])
    const channel = { connect() {}, updateIdentity() {}, close() {}, send: (c: unknown) => (sent.push(c), true) }
    const commands = createBoardCommands({ channel: () => channel, view: () => v })
    expect(commands.unpublishNote('a')).toEqual({ ok: true })
    expect(sent.at(-1)).toEqual({ t: 'note.unpublish', id: 'a' })
    v = view([note('b', 'c1', null)])
    expect(commands.canUndo()).toBe(true)
    expect(commands.undo()).toEqual({ result: { ok: true }, label: 'unpublish' })
    expect(sent.at(-1)).toEqual({ t: 'note.add', columnId: 'c1', text: 'Slow CI', color: 2 })
    expect(commands.canRedo()).toBe(false)
  })

  it('is refused on a locked board and leaves nothing to undo', async () => {
    const { createBoardCommands } = await import('../src')
    const sent: unknown[] = []
    const locked = { ...view([note('a', 'c1', null, { mine: true })]), settings: { locked: true } } as unknown as Snapshot
    const channel = { connect() {}, updateIdentity() {}, close() {}, send: (c: unknown) => (sent.push(c), true) }
    const commands = createBoardCommands({ channel: () => channel, view: () => locked })
    expect(commands.unpublishNote('a')).toEqual({ ok: false, error: 'locked' })
    expect(sent).toEqual([])
    expect(commands.canUndo()).toBe(false)
  })
})

describe('redo', () => {
  it('replays an undone action and a new action clears what could be redone', async () => {
    const { createBoardCommands } = await import('../src')
    const sent: unknown[] = []
    let v = view([note('a', 'c1'), note('b', 'c1')])
    const cmds = createBoardCommands({ channel: () => ({ send: (c: unknown) => { sent.push(c); return true } }), view: () => v } as never)
    cmds.moveNote('a', 'c2')
    expect(cmds.canRedo()).toBe(false)
    cmds.undo()
    expect(cmds.canRedo()).toBe(true)
    expect(cmds.redo()?.result.ok).toBe(true)
    expect(sent.at(-1)).toEqual({ t: 'note.move', id: 'a', columnId: 'c2' })
    expect(cmds.canUndo()).toBe(true)
    cmds.undo()
    cmds.editNote('b', 'new')
    expect(cmds.canRedo()).toBe(false)
    v = view([])
  })
})

describe('nextUndo', () => {
  it('peeks at the step the next undo would run, without running it', async () => {
    const { createBoardCommands } = await import('../src')
    const sent: unknown[] = []
    const channel = { connect() {}, updateIdentity() {}, close() {}, send: (c: unknown) => (sent.push(c), true) }
    const commands = createBoardCommands({ channel: () => channel, view: () => view([note('a', 'c1', null, { mine: true, text: 'Slow CI', color: 2 })]) })
    expect(commands.nextUndo()).toBeNull()
    commands.unpublishNote('a')
    expect(commands.nextUndo()).toMatchObject({ label: 'unpublish', commands: [{ t: 'note.add', columnId: 'c1', text: 'Slow CI', color: 2 }] })
    expect(commands.canUndo()).toBe(true)
    expect(sent).toHaveLength(1)
  })
})
