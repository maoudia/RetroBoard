import { describe, expect, it } from 'vitest'
import { buildInsights, topKeywords } from '../src'

type S = Parameters<typeof buildInsights>[0]
const col = (id: string, votable?: boolean) => ({ id, title: id, ...(votable === undefined ? {} : { votable }) }) as S['columns'][number]
const note = (id: string, columnId: string, votes: number | null, text = id) => ({ id, columnId, text, votes, groupId: null }) as unknown as S['notes'][number]
const snap = (notes: S['notes'], over: Partial<S> = {}): S => ({ notes, groups: [], columns: [col('a'), col('b')], actions: [], settings: { voteLimit: 5 } as S['settings'], ...over })
const ids = (s: S, participants?: number) => buildInsights(s, participants)!.list.map((i) => i.id)

describe('insights, exactly', () => {
  it('flags three ideas holding half the votes or more, from four ideas', () => {
    const four = [note('1', 'a', 2), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 4)]
    const out = buildInsights(snap(four))!.list.find((i) => i.id === 'concentrated')
    expect(out).toEqual({ id: 'concentrated', n: { ideas: 3, share: 88 } })
    const half = [note('1', 'a', 2), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 4)]
    expect(ids(snap(half))).toContain('concentrated')
    const exactlyHalf = [note('1', 'a', 2), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 1), note('5', 'a', 1), note('6', 'a', 1), note('7', 'a', 1)]
    expect(buildInsights(snap(exactlyHalf))!.list.find((i) => i.id === 'concentrated')?.n.share).toBe(50)
    const below = [note('1', 'a', 1), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 1), note('5', 'a', 1), note('6', 'a', 1), note('7', 'a', 1)]
    expect(ids(snap(below))).not.toContain('concentrated')
    const exact = [note('1', 'a', 1), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 1), note('5', 'a', 1), note('6', 'a', 1), note('7', 'a', 0), note('8', 'a', 0)]
    expect(ids(snap(exact))).toContain('concentrated')
    expect(ids(snap([note('1', 'a', 3), note('2', 'a', 2), note('3', 'a', 1)]))).not.toContain('concentrated')
  })

  it('flags a tie for first with the number of ideas and their votes', () => {
    expect(buildInsights(snap([note('1', 'a', 3), note('2', 'a', 3), note('3', 'a', 3), note('4', 'a', 1)]))!.list.find((i) => i.id === 'tieFirst')).toEqual({ id: 'tieFirst', n: { ideas: 3, votes: 3 } })
    expect(ids(snap([note('1', 'a', 3), note('2', 'a', 2)]))).not.toContain('tieFirst')
  })

  it('flags ideas without votes from 40% of at least four ideas', () => {
    const five = [note('1', 'a', 2), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 0), note('5', 'a', 0)]
    expect(buildInsights(snap(five))!.list.find((i) => i.id === 'unvoted')).toEqual({ id: 'unvoted', n: { ideas: 2, of: 5 } })
    expect(ids(snap([note('1', 'a', 2), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 0), note('5', 'a', 1)]))).not.toContain('unvoted')
    expect(ids(snap([note('1', 'a', 2), note('2', 'a', 1), note('3', 'a', 0), note('4', 'a', 0)]))).toContain('unvoted')
    expect(ids(snap([note('1', 'a', 2), note('2', 'a', 0), note('3', 'a', 0)]))).not.toContain('unvoted')
    expect(ids(snap([note('1', 'a', 5), note('2', 'a', 1), note('3', 'a', 1), note('4', 'a', 1), note('5', 'a', 0), note('6', 'a', 0), note('7', 'a', 1)]))).not.toContain('unvoted')
  })

  it('flags the column holding 60% of the votes, among votable columns only, when there are several', () => {
    const lead = buildInsights(snap([note('1', 'a', 3), note('2', 'b', 2)]))!.list.find((i) => i.id === 'columnLead')
    expect(lead).toEqual({ id: 'columnLead', n: { share: 60 }, columnId: 'a' })
    expect(buildInsights(snap([note('1', 'b', 3), note('2', 'a', 2)]))!.list.find((i) => i.id === 'columnLead')?.columnId).toBe('b')
    expect(ids(snap([note('1', 'a', 5), note('2', 'b', 4)]))).not.toContain('columnLead')
    expect(ids(snap([note('1', 'a', 3), note('2', 'b', 3)]))).not.toContain('columnLead')
    const single = snap([note('1', 'a', 5), note('2', 'b', 0)], { columns: [col('a'), col('b', false)] })
    expect(ids(single)).not.toContain('columnLead')
    expect(ids(snap([note('1', 'a', 5)], { columns: [col('a')] }))).not.toContain('columnLead')
    const hidden = snap([note('1', 'a', 5), note('2', 'b', 4)], { columns: [col('a'), col('b', false), col('c', true)] })
    expect(ids(hidden)).toContain('columnLead')
  })

  it('flags a low turnout below half of the votes available, only when the people are known', () => {
    const notes = [note('1', 'a', 4)]
    expect(buildInsights(snap(notes), 2)!.list.find((i) => i.id === 'lowParticipation')).toEqual({ id: 'lowParticipation', n: { used: 4, available: 10, share: 40 } })
    expect(ids(snap([note('1', 'a', 5)]), 2)).not.toContain('lowParticipation')
    expect(ids(snap(notes))).not.toContain('lowParticipation')
    expect(ids(snap(notes), 0)).not.toContain('lowParticipation')
    expect(ids(snap(notes), -2)).not.toContain('lowParticipation')
    expect(ids(snap(notes), 1)).not.toContain('lowParticipation')
  })

  it('counts the actions against the voted ideas, or says there are none', () => {
    const notes = [note('1', 'a', 2), note('2', 'a', 0), note('3', 'a', 1)]
    const a = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) })) as unknown as S['actions']
    expect(buildInsights(snap(notes, { actions: a(2) }))!.list.find((i) => i.id === 'actionsForIdeas')).toEqual({ id: 'actionsForIdeas', n: { actions: 2, ideas: 2 } })
    expect(buildInsights(snap(notes))!.list.find((i) => i.id === 'noActions')).toEqual({ id: 'noActions', n: { ideas: 2 } })
    expect(ids(snap(notes, { actions: a(1) }))).not.toContain('noActions')
  })

  it('has no share per column without any note', () => {
    expect(buildInsights(snap([]))!.notesPerColumn).toEqual([{ columnId: 'a', notes: 0, share: 0 }, { columnId: 'b', notes: 0, share: 0 }])
  })
})

describe('keywords, exactly', () => {
  it('ignores the stop words of both languages, accented ones too', () => {
    for (const w of ['avec', 'dans', 'pour', 'the', 'with', 'their', 'être', 'très', 'était', 'trop']) expect(topKeywords([`${w} alpha`, `${w} beta`]), w).toEqual([])
  })
  it('ignores two-letter words and numbers, but keeps three letters and alphanumerics', () => {
    expect(topKeywords(['ab xyz', 'ab xyz'])).toEqual([{ word: 'xyz', count: 2 }])
    expect(topKeywords(['2024 room', '2024 room']).map((k) => k.word)).toEqual(['room'])
    expect(topKeywords(['v2024 room', 'v2024 room']).map((k) => k.word)).toEqual(['room', 'v2024'])
    expect(topKeywords(['12ab', '12ab']).map((k) => k.word)).toEqual(['12ab'])
  })
  it('counts once per note, needs two notes by default and as many as asked', () => {
    expect(topKeywords(['bug bug bug', 'bug', 'other thing'])).toEqual([{ word: 'bug', count: 2 }])
    expect(topKeywords(['bug', 'bug', 'bug'], { minNotes: 3 })).toEqual([{ word: 'bug', count: 3 }])
    expect(topKeywords(['bug', 'bug'], { minNotes: 3 })).toEqual([])
  })
  it('finds nothing in a note without words', () => {
    expect(topKeywords(['!!!', '???'])).toEqual([])
  })
  it('strips quotes and dashes around a word but not inside', () => {
    expect(topKeywords(["'quoted'", '--quoted--', 'quoted'])).toEqual([{ word: 'quoted', count: 3 }])
    expect(topKeywords(['well-known', 'well-known'])).toEqual([{ word: 'well-known', count: 2 }])
    expect(topKeywords(["don't", "don't"]).map((k) => k.word)).toEqual(["don't"])
  })
  it('shows the most used spelling, folds accents, and sorts by count then alphabet', () => {
    expect(topKeywords(['équipe', 'équipe', 'equipe'])).toEqual([{ word: 'équipe', count: 3 }])
    expect(topKeywords(['equipe', 'equipe', 'équipe', 'équipe', 'équipe'])).toEqual([{ word: 'équipe', count: 5 }])
    expect(topKeywords(['equipe x', 'equipe y', 'équipe z', 'équipe w', 'equipe v'])).toEqual([{ word: 'equipe', count: 5 }])
    const k = topKeywords(['zulu alpha', 'zulu alpha', 'zulu mike', 'mike alpha', 'zulu'])
    expect(k.map((x) => [x.word, x.count])).toEqual([['zulu', 4], ['alpha', 3], ['mike', 2]])
    expect(topKeywords(['beta alpha', 'beta alpha']).map((x) => x.word)).toEqual(['alpha', 'beta'])
  })
  it('keeps eight words by default and as many as asked', () => {
    const words = ['aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh', 'iii', 'jjj']
    const texts = [words.join(' '), words.join(' ')]
    expect(topKeywords(texts)).toHaveLength(8)
    expect(topKeywords(texts, { limit: 3 })).toHaveLength(3)
    expect(topKeywords(texts, { limit: 12 })).toHaveLength(10)
  })
})
