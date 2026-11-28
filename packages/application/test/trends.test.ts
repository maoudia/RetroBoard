import { describe, expect, it } from 'vitest'
import { buildTrends, EMPTY_WORKSPACE, MAX_COMPARED_RETROS, retroStatsOf, type SavedRetro, type Workspace } from '../src'

const retro = (over: Partial<SavedRetro> & Pick<SavedRetro, 'boardId' | 'at'>): SavedRetro => ({ teamId: 't1', project: null, title: over.boardId, actions: [], ...over })
const ws = (retros: SavedRetro[]): Workspace => ({ ...EMPTY_WORKSPACE, retros })
const now = { boardId: 'now', stats: { participants: 6, keywords: ['deploy', 'meetings'] }, actions: [] as { text: string; owner: string; status: string }[] }

describe('results trends', () => {
  it('has nothing to compare with when the team has no previous retro (another team does not count)', () => {
    expect(buildTrends(ws([]), 't1', now)).toBeNull()
    expect(buildTrends(ws([retro({ boardId: 'x', at: 1, teamId: 't2', stats: { participants: 4, keywords: [] } })]), 't1', now)).toBeNull()
    expect(buildTrends(ws([retro({ boardId: 'now', at: 1, stats: { participants: 4, keywords: [] } })]), 't1', now)).toBeNull()
  })

  it('says participation went up, down or stayed the same against the latest retro that recorded it', () => {
    const prev = (n: number) => ws([retro({ boardId: 'a', at: 1, stats: { participants: n, keywords: [] } })])
    expect(buildTrends(prev(4), 't1', now)!.participation).toEqual({ current: 6, before: 4, change: 'up' })
    expect(buildTrends(prev(9), 't1', now)!.participation).toEqual({ current: 6, before: 9, change: 'down' })
    expect(buildTrends(prev(6), 't1', now)!.participation).toEqual({ current: 6, before: 6, change: 'same' })
    // A newer retro saved before stats existed is skipped: the comparison uses the newest one that has them.
    const mixed = ws([retro({ boardId: 'old', at: 1, stats: { participants: 4, keywords: [] } }), retro({ boardId: 'newer', at: 2, actions: [{ text: 'x', owner: '', status: 'todo' }] })])
    expect(buildTrends(mixed, 't1', now)!.participation!.before).toBe(4)
  })

  it('counts how many actions of the previous retro ended done, by their newest known status', () => {
    const acts = [{ text: 'Cache deps', owner: 'Ana', status: 'todo' }, { text: 'Fix CI', owner: 'Zed', status: 'todo' }, { text: 'Docs', owner: '', status: 'done' }]
    const history = ws([retro({ boardId: 'a', at: 1, title: 'Sprint 41', actions: acts }), retro({ boardId: 'b', at: 2, title: 'Sprint 42', actions: [{ text: 'cache deps ', owner: 'ana', status: 'done' }, { text: 'Fix CI', owner: 'Zed', status: 'todo' }] })])
    // Latest previous retro is Sprint 42: "Cache deps" is done there, "Fix CI" still open.
    expect(buildTrends(history, 't1', now)!.actionsDone).toEqual({ done: 1, total: 2, from: 'Sprint 42' })
    // This board's own actions update the status too.
    expect(buildTrends(history, 't1', { ...now, actions: [{ text: 'Fix CI', owner: 'Zed', status: 'done' }] })!.actionsDone).toEqual({ done: 2, total: 2, from: 'Sprint 42' })
    // Text and owner match whatever the case and the spaces around them.
    expect(buildTrends(history, 't1', { ...now, actions: [{ text: ' fix ci ', owner: ' ZED ', status: 'done' }] })!.actionsDone!.done).toBe(2)
  })

  it('lists the words of this retro that already came back, within the last few retros only', () => {
    const history = ws([
      retro({ boardId: 'a', at: 1, stats: { participants: 3, keywords: ['Meetings', 'old'] } }),
      ...Array.from({ length: MAX_COMPARED_RETROS }, (_, i) => retro({ boardId: `r${i}`, at: 10 + i, stats: { participants: 3, keywords: i === 0 ? ['Deploy'] : [] } })),
    ])
    // "meetings" only appears in the retro older than the last three: not compared.
    expect(buildTrends(history, 't1', now)!.recurring).toEqual(['deploy'])
    expect(buildTrends(history, 't1', now)!.previous).toBe(MAX_COMPARED_RETROS)
  })

  it('matches words whatever the case and the spaces, lists every recurring word in order, and at most five', () => {
    const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']
    const history = ws([retro({ boardId: 'a', at: 1, stats: { participants: 3, keywords: words.map((w) => ` ${w.toUpperCase()} `) } })])
    const t = buildTrends(history, 't1', { ...now, stats: { participants: 3, keywords: words } })!
    expect(t.recurring).toEqual(words.slice(0, 5))
    expect(buildTrends(history, 't1', { ...now, stats: { participants: 3, keywords: ['alpha', 'bravo'] } })!.lines.at(-1)).toEqual({ key: 'trends.recurring', params: { words: 'alpha, bravo' } })
    // Nothing recurs: no sentence about words.
    expect(buildTrends(history, 't1', { ...now, stats: { participants: 3, keywords: ['zulu'] } })!.lines.map((l) => l.key)).toEqual(['trends.participation.same'])
  })

  it('is null when no figure can be compared', () => {
    expect(buildTrends(ws([retro({ boardId: 'a', at: 1 })]), 't1', now)).toBeNull()
  })

  it('writes the sentences as i18n keys with their numbers', () => {
    const t = buildTrends(ws([retro({ boardId: 'a', at: 1, title: 'S1', stats: { participants: 4, keywords: ['deploy'] }, actions: [{ text: 'x', owner: '', status: 'done' }] })]), 't1', now)!
    expect(t.lines).toEqual([
      { key: 'trends.participation.up', params: { current: 6, before: 4 } },
      { key: 'trends.actions', params: { done: 1, total: 1, from: 'S1' } },
      { key: 'trends.recurring', params: { words: 'deploy' } },
    ])
  })

  it('records the people on the board and its recurring words', () => {
    const note = (text: string, author: string | null) => ({ text, author }) as never
    const stats = retroStatsOf({ peers: [], notes: [note('slow deploy pipeline', 'Ana'), note('deploy fails often', 'Bob'), note('x', null)] } as never)
    expect(stats).toEqual({ participants: 2, keywords: ['deploy'] })
    // At most five words are kept.
    const many = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf'].map((w) => `${w} ${w}x`)
    const texts = many.flatMap((m) => [m.split(' ')[0]!, `${m.split(' ')[0]} again`, `${m.split(' ')[0]} too`]).map((text) => note(text, null))
    expect(retroStatsOf({ peers: [], notes: texts } as never).keywords).toHaveLength(5)
  })
})
