import type { Group, SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { buildColumnItems, groupTitle } from '../src'

const note = (id: string, votes: number | null, extra: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: `text ${id}`, color: 0, author: null, groupId: null, votes, voted: false, mine: false, createdAt: 0, ...extra,
})

describe('column items read model', () => {
  const groups: Group[] = [{ id: 'g1', columnId: 'c1', title: null }, { id: 'empty', columnId: 'c1', title: 'x' }]
  const notes = [
    note('a', 1), note('b', 0, { groupId: 'g1' }), note('c', 4, { groupId: 'g1' }), note('d', 2), note('other', 9, { columnId: 'c2' }),
  ]

  it('stacks grouped notes, sums their votes and keeps creation order in time mode', () => {
    const items = buildColumnItems({ notes, groups }, 'c1', 'time')
    expect(items.map((i) => i.key)).toEqual(['a', 'g1', 'd'])
    const g = items[1]!
    expect(g.kind === 'group' && [g.votes, g.title, g.notes.length]).toEqual([4, 'text b', 2])
  })

  it('sorts by votes with stable ties and ignores other columns and empty groups', () => {
    expect(buildColumnItems({ notes, groups }, 'c1', 'votes').map((i) => i.key)).toEqual(['g1', 'd', 'a'])
  })

  it('treats hidden counts as zero', () => {
    const items = buildColumnItems({ notes: [note('x', null), note('y', null)], groups: [] }, 'c1', 'votes')
    expect(items.map((i) => i.votes)).toEqual([0, 0])
  })

  it('uses the group title, else the first note text', () => {
    expect(groupTitle({ id: 'g', columnId: 'c1', title: 'Named' }, [])).toBe('Named')
    expect(groupTitle({ id: 'g', columnId: 'c1', title: null }, [])).toBe('')
  })
})
