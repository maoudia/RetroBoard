import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { emptyTalk, endTurn, type TalkState, talkClock, talkShares } from '../src'

const CLEAN = { meta: false, notes: [], groups: [], actions: [], wipe: false }

describe('the clock of a turn, exactly', () => {
  const turn = { speaker: 's', label: null, startedAt: 1_000, budgetMs: 10_000 }

  it('counts the time spent and left, and is overtime only once the budget is exceeded, not when it is used up', () => {
    expect(talkClock(turn, 4_000)).toEqual({ elapsedMs: 3_000, remainingMs: 7_000, overtime: false })
    expect(talkClock(turn, 11_000)).toEqual({ elapsedMs: 10_000, remainingMs: 0, overtime: false })
    expect(talkClock(turn, 11_001)).toEqual({ elapsedMs: 10_001, remainingMs: -1, overtime: true })
  })

  it('never counts negative time before the turn started', () => {
    expect(talkClock(turn, 500)).toEqual({ elapsedMs: 0, remainingMs: 10_000, overtime: false })
  })
})

describe('talk shares, exactly', () => {
  const totals = (entries: [string, string | null, number][]): TalkState => ({ active: null, totals: Object.fromEntries(entries.map(([id, label, ms]) => [id, { label, ms }])) })

  it('shares the time by label, anonymous speakers together, with the share of the total', () => {
    const talk = totals([['a', 'Ana', 30_000], ['b', null, 10_000], ['c', null, 20_000], ['d', 'Ana', 10_000]])
    expect(talkShares(talk, 0)).toEqual([{ label: 'Ana', ms: 40_000, share: 40 / 70 }, { label: null, ms: 30_000, share: 30 / 70 }])
  })

  it('orders by time, then by name, with the anonymous last on a tie, whichever way they are compared', () => {
    const talk = totals([['1', 'b', 10], ['2', null, 10], ['3', 'a', 10], ['4', 'c', 30]])
    expect(talkShares(talk, 0).map((s) => s.label)).toEqual(['c', 'a', 'b', null])
    const reversed = totals([['4', 'c', 30], ['3', 'a', 10], ['2', null, 10], ['1', 'b', 10]])
    expect(talkShares(reversed, 0).map((s) => s.label)).toEqual(['c', 'a', 'b', null])
    const nullFirst = totals([['2', null, 10], ['3', 'a', 10]])
    expect(talkShares(nullFirst, 0).map((s) => s.label)).toEqual(['a', null])
    // Every order of the same tied speakers gives the same result: names alphabetically, the anonymous last.
    const tied: [string, string | null, number][] = [['1', 'y', 10], ['2', 'z', 10], ['3', null, 10], ['4', 'x', 10]]
    const permutations = (items: typeof tied): (typeof tied)[] => (items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])))
    for (const order of permutations(tied)) expect(talkShares(totals(order), 0).map((x) => x.label), JSON.stringify(order)).toEqual(['x', 'y', 'z', null])
    // A name that sorts after the word "null" still comes before the anonymous, in either order.
    for (const entries of [[['1', 'z', 10], ['2', null, 10]], [['2', null, 10], ['1', 'z', 10]], [['1', 'z', 10], ['2', null, 10], ['3', 'y', 10]], [['2', null, 10], ['1', 'z', 10], ['3', 'y', 10]]] as [string, string | null, number][][]) {
      const labels = talkShares(totals(entries), 0).map((x) => x.label)
      expect(labels.at(-1)).toBeNull()
      expect(labels.slice(0, -1)).toEqual(labels.slice(0, -1).toSorted())
    }
  })

  it('has no share, not a not-a-number, when nobody spoke, and nothing at all for an empty board', () => {
    expect(talkShares(totals([['a', 'Ana', 0]]), 0)).toEqual([{ label: 'Ana', ms: 0, share: 0 }])
    expect(talkShares(emptyTalk(), 0)).toEqual([])
  })

  it('counts the turn in progress up to now', () => {
    const talk: TalkState = { active: { speaker: 'x', label: 'Ana', startedAt: 1_000, budgetMs: 1 }, totals: { x: { label: 'Ana', ms: 5_000 } } }
    expect(talkShares(talk, 4_000)).toEqual([{ label: 'Ana', ms: 8_000, share: 1 }])
  })

  it('ends a turn by adding its time to the speaker, keeping the label they had, and does nothing without a turn', () => {
    const idle = emptyTalk()
    expect(endTurn(idle, 9_999)).toBe(idle)
    const talk: TalkState = { active: { speaker: 'x', label: null, startedAt: 1_000, budgetMs: 1 }, totals: { x: { label: 'Ana', ms: 5_000 } } }
    expect(endTurn(talk, 3_000)).toEqual({ active: null, totals: { x: { label: 'Ana', ms: 7_000 } } })
    expect(endTurn({ ...talk, active: { ...talk.active!, startedAt: 9_000 } }, 3_000).totals.x!.ms).toBe(5_000)
  })
})

describe('taking and giving the floor, exactly', () => {
  function room(over: Record<string, unknown> = {}) {
    const h = harness()
    h.run({ t: 'settings.update', talkMode: 'ring', talkBudgetSec: 60, talkSelfStart: true, ...over })
    return h
  }

  it('lets the facilitator give the floor, and refuses it when talk time is off', () => {
    const h = room()
    const out = h.run({ t: 'talk.assign', speaker: 'speakerKey1', label: 'Ana' })
    expect(out).toMatchObject({ ok: true, dirty: { ...CLEAN, meta: true } })
    expect(h.state.talk.active).toEqual({ speaker: 'speakerKey1', label: 'Ana', startedAt: h.now, budgetMs: 60_000 })
    expect(room({ talkMode: 'off' }).run({ t: 'talk.assign', speaker: 'speakerKey1', label: null })).toEqual({ ok: false, error: 'invalid' })
  })

  it('ends the turn, adding its time, and says nothing changed when there is none', () => {
    const h = room()
    const none = h.run({ t: 'talk.end' })
    expect(none).toMatchObject({ ok: true, dirty: CLEAN })
    h.run({ t: 'talk.assign', speaker: 'speakerKey1', label: 'Ana' })
    h.tick(5_000)
    expect(h.run({ t: 'talk.end' })).toMatchObject({ ok: true, dirty: { ...CLEAN, meta: true } })
    expect(h.state.talk).toEqual({ active: null, totals: { speakerKey1: { label: 'Ana', ms: 5_000 } } })
  })

  it('lets a participant take the floor only when the facilitator allows it, once, under their name only when shown', () => {
    expect(room({ talkMode: 'off' }).run({ t: 'talk.self' }, alice)).toEqual({ ok: false, error: 'forbidden' })
    expect(room({ talkSelfStart: false }).run({ t: 'talk.self' }, alice)).toEqual({ ok: false, error: 'forbidden' })
    const h = room()
    expect(h.run({ t: 'talk.self' }, alice)).toMatchObject({ ok: true, dirty: { ...CLEAN, meta: true } })
    expect(h.state.talk.active).toMatchObject({ speaker: alice.cid, label: 'Alice' })
    const before = h.state
    expect(h.run({ t: 'talk.self' }, alice)).toMatchObject({ ok: true, dirty: CLEAN })
    expect(h.state).toBe(before)
    expect(room().run({ t: 'talk.self' }, bob)).toMatchObject({ ok: true })
    const anon = room()
    anon.run({ t: 'talk.self' }, bob)
    expect(anon.state.talk.active).toMatchObject({ speaker: bob.cid, label: null })
  })

  it('lets only the speaker give the floor back, and says nothing changed when nobody has it', () => {
    const h = room()
    expect(h.run({ t: 'talk.done' }, alice)).toMatchObject({ ok: true, dirty: CLEAN })
    h.run({ t: 'talk.self' }, alice)
    expect(h.run({ t: 'talk.done' }, bob)).toEqual({ ok: false, error: 'forbidden' })
    h.tick(3_000)
    expect(h.run({ t: 'talk.done' }, alice)).toMatchObject({ ok: true, dirty: { ...CLEAN, meta: true } })
    expect(h.state.talk).toEqual({ active: null, totals: { [alice.cid]: { label: 'Alice', ms: 3_000 } } })
  })
})
