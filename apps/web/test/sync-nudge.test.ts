import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgendaState } from '@retroboard/domain'
import { type NudgeInput, canRememberHere, phaseRunning, shouldNudgeSync } from '../app/utils/sync-nudge'

const base: NudgeInput = { creator: true, connected: false, dismissed: false, canRemember: true, phaseRunning: false, dialogOpen: false, presenter: false, otherBoards: 0 }
const agenda = (current: number, count = 3): AgendaState => ({ phases: Array.from({ length: count }, () => ({}) as never), current, startedAt: 0, pausedAt: null, rules: false, autoPublish: false })

describe('the one-time sync nudge (change sync-ux, 3.2)', () => {
  it('appears after the first board the person created, and nowhere else', () => {
    expect(shouldNudgeSync(base)).toBe(true)
    expect(shouldNudgeSync({ ...base, creator: false })).toBe(false)
    expect(shouldNudgeSync({ ...base, otherBoards: 1 })).toBe(false)
  })

  it('stays away once dismissed, once sync is connected, over a dialog, and in presenter mode', () => {
    for (const patch of [{ dismissed: true }, { connected: true }, { dialogOpen: true }, { presenter: true }]) expect(shouldNudgeSync({ ...base, ...patch })).toBe(false)
  })

  it('never shows during a running phase', () => {
    expect(shouldNudgeSync({ ...base, phaseRunning: true })).toBe(false)
    expect(phaseRunning(null)).toBe(false)
    expect(phaseRunning(agenda(-1))).toBe(false)
    expect(phaseRunning(agenda(1))).toBe(true)
    expect(phaseRunning(agenda(3))).toBe(false)
  })

  it('fails safe: a browser that cannot remember "Not now" never shows it', () => {
    expect(shouldNudgeSync({ ...base, canRemember: false })).toBe(false)
  })
})

describe('does this browser keep what it is given', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is true for working storage and false when storage throws or forgets', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) } })
    expect(canRememberHere()).toBe(true)
    expect(store.size).toBe(0)
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
    expect(canRememberHere()).toBe(false)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => undefined })
    expect(canRememberHere()).toBe(false)
  })
})
