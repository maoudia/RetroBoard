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
  it('re-adds an idea nobody voted on or grouped, and refuses the others', () => {
    const mine = note('a', 'c1', null, { mine: true, votes: 0, voted: false })
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([mine]))).toMatchObject({ label: 'delete', commands: [{ t: 'note.add', columnId: 'c1', text: 't-a', color: 0 }] })
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([mine]))?.redo).toBeUndefined()
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([{ ...mine, votes: 2 } as never]))).toBeNull()
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([{ ...mine, groupId: 'g' }]))).toBeNull()
    expect(inverseOf({ t: 'note.delete', id: 'a' }, view([{ ...mine, votes: null } as never]))).toBeNull()
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
