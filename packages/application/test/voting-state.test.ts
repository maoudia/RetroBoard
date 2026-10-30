import { describe, expect, it } from 'vitest'
import { alice, harness } from '@retroboard/testkit'
import { buildSnapshot } from '@retroboard/domain'
import { votingState } from '../src'

const state = (h: ReturnType<typeof harness>) => votingState(buildSnapshot(h.state, { cid: alice.cid }, [], h.now))

describe('voting state', () => {
  it('is open without an agenda and closed once the facilitator closes voting', () => {
    const h = harness()
    expect(state(h)).toBe('open')
    h.run({ t: 'vote.close' })
    expect(state(h)).toBe('closed')
    h.run({ t: 'vote.reopen' })
    expect(state(h)).toBe('open')
  })

  it('follows the agenda: closed by the phase, open in Vote, overridden by the facilitator until the next phase', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 5 }, { kind: 'close', minutes: 5 }], rules: true })
    h.run({ t: 'agenda.start' })
    expect(state(h)).toBe('phase-closed')
    h.run({ t: 'agenda.voteOpen', on: true })
    expect(state(h)).toBe('overridden')
    h.run({ t: 'agenda.next' })
    expect(state(h)).toBe('open')
    h.run({ t: 'agenda.next' })
    expect(state(h)).toBe('phase-closed')
  })

  it('a closed vote wins over the override', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'close', minutes: 5 }], rules: true })
    h.run({ t: 'agenda.start' })
    h.run({ t: 'agenda.voteOpen', on: true })
    h.run({ t: 'vote.close' })
    expect(state(h)).toBe('closed')
  })
})
