import { describe, expect, it } from 'vitest'
import { NAME_NUDGE_DELAY_MS, type NudgeInput, shouldNudgeName } from '../src'

const base: NudgeInput = { name: '', joinedForMs: NAME_NUDGE_DELAY_MS, ownNotes: 0, solo: false, presenter: false, dismissedHere: false, dismissedEverywhere: false, busy: false }
const with_ = (p: Partial<NudgeInput>) => shouldNudgeName({ ...base, ...p })

describe('name nudge', () => {
  it('waits a few seconds after joining, or the first published note, whichever comes first', () => {
    expect(with_({ joinedForMs: NAME_NUDGE_DELAY_MS - 1 })).toBe(false)
    expect(with_({ joinedForMs: NAME_NUDGE_DELAY_MS })).toBe(true)
    expect(with_({ joinedForMs: 0, ownNotes: 1 })).toBe(true)
  })

  it('never nudges someone who has a name, even a blank-looking one is anonymous', () => {
    expect(with_({ name: 'Bob' })).toBe(false)
    expect(with_({ name: '   ' })).toBe(true)
  })

  it.each([
    ['solo board', { solo: true }],
    ['presenter mode', { presenter: true }],
    ['dismissed on this board', { dismissedHere: true }],
    ['dismissed everywhere', { dismissedEverywhere: true }],
    ['another popup or dialog is open', { busy: true }],
  ] as const)('stays quiet on %s', (_, p) => {
    expect(with_({ ...p, ownNotes: 3 })).toBe(false)
  })
})
