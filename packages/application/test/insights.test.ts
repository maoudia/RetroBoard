import { describe, expect, it } from 'vitest'
import { buildInsights, topKeywords } from '../src'

type S = Parameters<typeof buildInsights>[0]
const col = (id: string, votable = true) => ({ id, title: id, votable }) as S['columns'][number]
const note = (id: string, columnId: string, votes: number | null, text = id) => ({ id, columnId, text, votes, groupId: null }) as unknown as S['notes'][number]
const snap = (notes: S['notes'], actions: S['actions'] = [], voteLimit = 5): S => ({ notes, groups: [], columns: [col('a'), col('b')], actions, settings: { voteLimit } as S['settings'] })

describe('keywords', () => {
  it('counts words across notes, ignoring stop words in fr and en, folding accents', () => {
    const k = topKeywords(['Les réunions sont trop longues', 'Réunions inutiles avec le client', 'the meetings are long', 'Trop de réunions'])
    expect(k[0]).toEqual({ word: 'réunions', count: 3 })
    expect(k.map((x) => x.word)).not.toContain('les')
    expect(k.map((x) => x.word)).not.toContain('the')
  })
  it('counts a word once per note and needs two notes', () => {
    expect(topKeywords(['bug bug bug', 'other thing'])).toEqual([])
  })
})

describe('insights', () => {
  it('is null while counts are hidden', () => {
    expect(buildInsights(snap([note('1', 'a', null)]))).toBeNull()
  })
  it('says when three ideas took most of the votes', () => {
    const notes = [note('1', 'a', 6), note('2', 'a', 3), note('3', 'b', 3), note('4', 'b', 1), note('5', 'b', 0)]
    const r = buildInsights(snap(notes), 3)!
    expect(r.list.find((i) => i.id === 'concentrated')?.n).toEqual({ ideas: 3, share: 92 })
  })
  it('flags a tie for first, unvoted ideas, a leading column and a low turnout', () => {
    const notes = [note('1', 'a', 2), note('2', 'a', 2), note('3', 'a', 0), note('4', 'a', 0), note('5', 'b', 0)]
    const ids = buildInsights(snap(notes), 5)!.list.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['tieFirst', 'unvoted', 'columnLead', 'lowParticipation', 'noActions']))
  })
  it('counts notes per column', () => {
    const r = buildInsights(snap([note('1', 'a', 1), note('2', 'a', 0), note('3', 'b', 0)]))!
    expect(r.notesPerColumn).toEqual([{ columnId: 'a', notes: 2, share: 2 / 3 }, { columnId: 'b', notes: 1, share: 1 / 3 }])
  })
  it('says nothing without votes', () => {
    expect(buildInsights(snap([note('1', 'a', 0)]))!.list).toEqual([])
  })
})
