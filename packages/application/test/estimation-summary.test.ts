import { describe, expect, it } from 'vitest'
import { sessionSummary, type SummaryRound } from '../src'

const r = (over: Partial<SummaryRound> = {}): SummaryRound => ({ revote: false, decided: null, consensus: 1, ...over })

describe('session summary', () => {
  it('is empty for a room that never voted', () => {
    expect(sessionSummary([])).toEqual({ items: [], estimated: 0, total: 0, rounds: 0 })
  })

  it('makes one item of a round and the re-votes after it, and numbers the items from 1', () => {
    const s = sessionSummary([r({ consensus: 0.5 }), r({ revote: true, decided: '5' }), r({ decided: '8' })])
    expect(s.items).toEqual([
      { index: 1, rounds: 2, estimate: '5', roundsToConsensus: 2 },
      { index: 2, rounds: 1, estimate: '8', roundsToConsensus: 1 },
    ])
    expect(s.rounds).toBe(3)
    expect(s.estimated).toBe(2)
    expect(s.total).toBe(13)
  })

  it('a first round that is marked as a re-vote still opens an item', () => {
    expect(sessionSummary([r({ revote: true })]).items).toHaveLength(1)
  })

  it('keeps the estimate of the last decided round and none when nothing was decided', () => {
    const s = sessionSummary([r({ decided: '3' }), r({ revote: true, decided: '5' }), r({ revote: true }), r({ decided: null })])
    expect(s.items.map((i) => i.estimate)).toEqual(['5', null])
    expect(s.estimated).toBe(1)
  })

  it('counts rounds to consensus at the first unanimous round, and none when no round was unanimous or revealed', () => {
    const s = sessionSummary([r({ consensus: 0.9 }), r({ revote: true, consensus: 1 }), r({ revote: true, consensus: 1 }), r({ consensus: 0.99 }), r({ consensus: null })])
    expect(s.items.map((i) => i.roundsToConsensus)).toEqual([2, null, null])
  })

  it('totals numeric estimates only: a half counts, a question mark, a coffee and a word do not', () => {
    const s = sessionSummary(['½', '3', '?', '☕', 'XL'].map((decided) => r({ decided })))
    expect(s.total).toBe(3.5)
    expect(s.estimated).toBe(5)
  })
})
