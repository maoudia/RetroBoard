import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { allowedInPhase, buildSnapshot, newAgenda, rotiSummary } from '../src'

describe('ROTI', () => {
  it('counts one score per participant; the last one counts', () => {
    const h = harness()
    expect(h.run({ t: 'roti.set', score: 3 }, alice).ok).toBe(true)
    expect(h.run({ t: 'roti.set', score: 5 }, bob).ok).toBe(true)
    expect(h.run({ t: 'roti.set', score: 4 }, alice).ok).toBe(true)
    const s = rotiSummary(h.state, alice.cid)
    expect(s.counts).toEqual([0, 0, 0, 1, 1])
    expect(s.total).toBe(2)
    expect(s.average).toBe(4.5)
    expect(s.mine).toBe(4)
    expect(rotiSummary(h.state, bob.cid).mine).toBe(5)
  })

  it('rejects scores outside 1..5 and non-integers, and a locked board', () => {
    const h = harness()
    for (const score of [0, 6, 2.5, -1, Number.NaN]) expect(h.run({ t: 'roti.set', score })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'roti.set', score: 3 })).toEqual({ ok: false, error: 'locked' })
  })

  it('has no average without scores, and ignores corrupt stored values', () => {
    expect(rotiSummary({}, null)).toEqual({ counts: [0, 0, 0, 0, 0], total: 0, average: null, mine: null })
    expect(rotiSummary({ roti: { a: 9, b: 0, c: 2 } }, null).total).toBe(1)
  })

  it('the snapshot carries counts and my own score, never who gave which', () => {
    const h = harness()
    h.run({ t: 'roti.set', score: 2 }, bob)
    const snap = buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
    expect(snap.roti).toEqual({ counts: [0, 1, 0, 0, 0], total: 1, average: 2, mine: null })
    expect(JSON.stringify(snap)).not.toContain(bob.cid)
  })

  it('a board reset clears the scores', () => {
    const h = harness()
    h.run({ t: 'roti.set', score: 5 })
    h.run({ t: 'board.reset' })
    expect(rotiSummary(h.state, alice.cid).total).toBe(0)
  })

  it('phase rules: allowed in the close phase only', () => {
    const a = { ...newAgenda([{ kind: 'write', minutes: 5 }, { kind: 'close', minutes: 3 }], () => 'x'), current: 0 }
    expect(allowedInPhase(a, 'roti.set')).toBe(false)
    expect(allowedInPhase({ ...a, current: 1 }, 'roti.set')).toBe(true)
    expect(allowedInPhase(null, 'roti.set')).toBe(true)
  })
})
