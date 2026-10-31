import type { SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { buildColumnItems, groupTitle } from '../src'

const note = (id: string, votes: number | null, extra: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: `text ${id}`, color: 0, author: null, groupId: null, votes, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...extra,
})

describe('column items read model', () => {
  const group = (id: string, title: string | null, votes: number | null): SnapshotGroup => ({ id, columnId: 'c1', title, votes, myVotes: 0, votable: true })
  const groups: SnapshotGroup[] = [group('g1', null, 4), group('empty', 'x', 0)]
  const notes = [
    note('a', 1), note('b', 0, { groupId: 'g1' }), note('c', 4, { groupId: 'g1' }), note('d', 2), note('other', 9, { columnId: 'c2' }),
  ]

  it('stacks grouped notes, uses the cluster score and keeps creation order in time mode', () => {
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

  it('uses the group title, else the shortest idea cut to 40 characters on a word boundary', () => {
    expect(groupTitle({ title: 'Named' }, [])).toBe('Named')
    expect(groupTitle({ title: null }, [])).toBe('')
    const long = { ...note('l', 0, { groupId: 'g' }), text: 'Les deploiements du vendredi soir bloquent toute la release suivante' }
    const short = { ...note('s', 0, { groupId: 'g' }), text: 'Deploiements du vendredi' }
    expect(groupTitle({ title: null }, [long, short])).toBe('Deploiements du vendredi')
    expect(groupTitle({ title: null }, [long])).toBe('Les deploiements du vendredi soir')
    expect(groupTitle({ title: null }, [{ ...long, text: '   ' }])).toBe('')
  })

  describe('sort options', () => {
    const ns = [
      note('a', 0, { text: 'Banana', author: 'Zoe', color: 3 }),
      note('b', 0, { text: 'apple', author: null, color: 1 }),
      note('c', 0, { text: 'Cherry', author: 'Alice', color: 2, groupId: 'g' }),
      note('d', 0, { text: 'Date', author: 'Alice', color: 2, groupId: 'g' }),
    ]
    const gs = [group('g', 'Fruits', 0)]
    const keys = (m: Parameters<typeof buildColumnItems>[2]) => buildColumnItems({ notes: ns, groups: gs }, 'c1', m).map((i) => i.key)
    it('newest reverses creation order', () => expect(keys('newest')).toEqual(['g', 'b', 'a']))
    it('author sorts A to Z with anonymous last', () => expect(keys('author')).toEqual(['g', 'a', 'b']))
    it('colour sorts by the first note colour', () => expect(keys('color')).toEqual(['b', 'g', 'a']))
    it('size puts the biggest clusters first', () => expect(keys('size')).toEqual(['g', 'a', 'b']))
    it('alpha ignores case', () => expect(keys('alpha')).toEqual(['b', 'a', 'g']))
  })
})
