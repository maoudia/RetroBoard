import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { allowedInPhase, buildSnapshot, endTurn, isPrivileged, MIN, talkClock, talkShares } from '../src'

const BOB = 'bob-session-key-000001'
function talkBoard(selfStart = false) {
  const h = harness()
  h.run({ t: 'settings.update', talkMode: 'ring', talkBudgetSec: 120, talkSelfStart: selfStart })
  return h
}

describe('talk time', () => {
  it('is off by default: no turn can start', () => {
    const h = harness()
    expect(h.state.settings).toMatchObject({ talkMode: 'off', talkBudgetMs: 2 * MIN, talkSelfStart: false })
    expect(h.run({ t: 'talk.assign', speaker: BOB, label: 'Bob' })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'talk.self' })).toEqual({ ok: false, error: 'forbidden' })
  })

  it('one turn at a time: a new turn ends the current one and adds its time', () => {
    const h = talkBoard()
    h.run({ t: 'talk.assign', speaker: BOB, label: 'Bob' })
    expect(h.state.talk.active).toMatchObject({ speaker: BOB, label: 'Bob', budgetMs: 2 * MIN })
    h.tick(3 * MIN)
    expect(talkClock(h.state.talk.active!, h.now)).toEqual({ elapsedMs: 3 * MIN, remainingMs: -MIN, overtime: true })
    h.run({ t: 'talk.assign', speaker: alice.cid, label: null })
    expect(h.state.talk.active?.speaker).toBe(alice.cid)
    expect(h.state.talk.totals[BOB]).toEqual({ label: 'Bob', ms: 3 * MIN })
    h.tick(MIN)
    h.run({ t: 'talk.end' })
    expect(h.state.talk.active).toBeNull()
    expect(h.state.talk.totals[alice.cid]!.ms).toBe(MIN)
    expect(h.run({ t: 'talk.end' }).ok).toBe(true)
  })

  it('participants take the floor themselves only when allowed, and only end their own turn', () => {
    const closed = talkBoard(false)
    expect(closed.run({ t: 'talk.self' }, bob)).toEqual({ ok: false, error: 'forbidden' })
    const h = talkBoard(true)
    h.run({ t: 'talk.self' }, bob)
    // Bob does not show his name: anonymous label.
    expect(h.state.talk.active).toMatchObject({ speaker: bob.cid, label: null })
    expect(h.run({ t: 'talk.self' }, bob).ok).toBe(true)
    expect(h.run({ t: 'talk.done' }, alice)).toEqual({ ok: false, error: 'forbidden' })
    h.tick(MIN)
    h.run({ t: 'talk.done' }, bob)
    expect(h.state.talk.totals[bob.cid]).toEqual({ label: null, ms: MIN })
    expect(h.run({ t: 'talk.done' }, bob).ok).toBe(true)
  })

  it('shares aggregate anonymous speakers and include the running turn', () => {
    const shares = talkShares({
      active: { speaker: 'x', label: null, startedAt: 0, budgetMs: MIN },
      totals: { a: { label: 'Ana', ms: 2 * MIN }, b: { label: null, ms: MIN } },
    }, MIN)
    expect(shares).toEqual([{ label: 'Ana', ms: 2 * MIN, share: 0.5 }, { label: null, ms: 2 * MIN, share: 0.5 }])
    expect(talkShares({ active: null, totals: {} }, 0)).toEqual([])
    expect(endTurn({ active: null, totals: {} }, 5)).toEqual({ active: null, totals: {} })
  })

  it('assigning is for facilitators; taking or giving back one own turn ignores phase rules', () => {
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'talk.assign', speaker: BOB, label: null }, name: null, showName: false })).toBe(true)
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'talk.self' }, name: null, showName: false })).toBe(false)
    const agenda = { phases: [{ id: 'p', kind: 'vote' as const, plannedMs: MIN }], current: 0, startedAt: 0, pausedAt: null, rules: true, autoPublish: false }
    expect(allowedInPhase(agenda, 'talk.self')).toBe(true)
    expect(allowedInPhase(agenda, 'talk.done')).toBe(true)
    expect(allowedInPhase(agenda, 'note.add')).toBe(false)
  })

  it('reset clears turns and totals; the snapshot carries them', () => {
    const h = talkBoard()
    h.run({ t: 'talk.assign', speaker: BOB, label: 'Bob' })
    expect(buildSnapshot(h.state, { cid: alice.cid }, [], h.now).talk.active?.speaker).toBe(BOB)
    h.run({ t: 'board.reset' })
    expect(h.state.talk).toEqual({ active: null, totals: {} })
  })
})
