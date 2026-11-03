import { describe, expect, it } from 'vitest'
import { harness } from '@retroboard/testkit'
import { isPrivileged } from '@retroboard/domain'

describe('column turns (change ux-irritants-wave-3)', () => {
  it('opens one column, moves, and clears; unknown or hidden columns are refused', () => {
    const h = harness()
    const [a, b] = h.state.columns
    expect(h.run({ t: 'turn.set', columnId: a!.id }).ok).toBe(true)
    expect(h.state.turn).toBe(a!.id)
    expect(h.run({ t: 'turn.set', columnId: b!.id }).ok).toBe(true)
    expect(h.state.turn).toBe(b!.id)
    expect(h.run({ t: 'turn.set', columnId: 'nope' }).ok).toBe(false)
    h.run({ t: 'column.hide', id: a!.id })
    expect(h.run({ t: 'turn.set', columnId: a!.id }).ok).toBe(false)
    expect(h.run({ t: 'turn.set', columnId: null }).ok).toBe(true)
    expect(h.state.turn).toBeNull()
  })
  it('is a facilitator command', () => {
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'turn.set', columnId: null } } as never)).toBe(true)
  })
})
