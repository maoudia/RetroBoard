import { describe, expect, it } from 'vitest'
import type { Snapshot } from '@retroboard/domain'
import { createUndoStack, inverseOf } from '../src'

const note = (id: string, columnId: string, groupId: string | null = null, extra: Record<string, unknown> = {}) => ({ id, columnId, groupId, text: `t-${id}`, color: 0, ...extra })
const view = (notes: ReturnType<typeof note>[]) => ({ notes } as unknown as Snapshot)

describe('inverse of reversible actions', () => {
  it('moves a note back to its column', () => {
    const v = view([note('a', 'c1')])
    expect(inverseOf({ t: 'note.move', id: 'a', columnId: 'c2' }, v)).toEqual({ label: 'move', commands: [{ t: 'note.move', id: 'a', columnId: 'c1' }] })
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
    expect(inverseOf({ t: 'note.ungroup', id: 'a' }, v)).toEqual({ label: 'ungroup', commands: [{ t: 'note.group', id: 'a', ontoId: 'm' }] })
  })
  it('restores the previous text and colour', () => {
    const v = view([note('a', 'c1', null, { text: 'before', color: 3 })])
    expect(inverseOf({ t: 'note.edit', id: 'a', text: 'after' }, v)?.commands).toEqual([{ t: 'note.edit', id: 'a', text: 'before' }])
    expect(inverseOf({ t: 'note.color', id: 'a', color: 5 }, v)?.commands).toEqual([{ t: 'note.color', id: 'a', color: 3 }])
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
