import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'

describe('presenting announcement (change toast-notifications-v2)', () => {
  it('records who started it (name only when shown), and only that person clears it', () => {
    const h = harness()
    expect(h.run({ t: 'presenter.set', on: true }, alice).ok).toBe(true)
    expect(h.state.presenting?.name).toBe('Alice')
    h.run({ t: 'presenter.set', on: false }, bob)
    expect(h.state.presenting?.cid).toBe(alice.cid)
    h.run({ t: 'presenter.set', on: false }, alice)
    expect(h.state.presenting).toBeNull()
    h.run({ t: 'presenter.set', on: true }, bob)
    expect(h.state.presenting?.name).toBeNull()
  })
})
