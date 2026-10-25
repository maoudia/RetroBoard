import { type AgendaState, PHASE_KINDS, type PhaseKind } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { phaseAvailability } from '../src'

const agenda = (kinds: PhaseKind[], current: number, rules = true): AgendaState => ({
  phases: kinds.map((kind, i) => ({ id: `p${i}`, kind, plannedMs: 60_000 })),
  current, startedAt: 0, pausedAt: null, rules, autoPublish: true,
})
const ALL = [...PHASE_KINDS]

describe('phase availability', () => {
  it('is open without a running agenda or with rules off', () => {
    expect(phaseAvailability(null, 'note.addMany', false).allowed).toBe(true)
    expect(phaseAvailability(agenda(ALL, -1), 'note.addMany', false).allowed).toBe(true)
    expect(phaseAvailability(agenda(ALL, ALL.length), 'note.addMany', false).allowed).toBe(true)
    expect(phaseAvailability(agenda(ALL, 4, false), 'note.addMany', false).allowed).toBe(true)
  })

  it('is open in the phase the command belongs to', () => {
    expect(phaseAvailability(agenda(ALL, ALL.indexOf('write')), 'note.addMany', false)).toEqual({ allowed: true, bypassed: false, closedBy: null, opensAt: null })
    expect(phaseAvailability(agenda(ALL, ALL.indexOf('vote')), 'vote.add', false).allowed).toBe(true)
  })

  it.each(PHASE_KINDS.filter((k) => k !== 'write' && k !== 'group'))('closes writing during %s', (kind) => {
    const a = phaseAvailability(agenda(ALL, ALL.indexOf(kind)), 'note.add', false)
    expect(a.allowed).toBe(false)
    expect(a.closedBy).toBe(kind)
  })

  it('names the next phase that opens the command, or none', () => {
    // Vote phase, writing reopens only if a later write/group phase exists.
    // Drafts published in bulk (note.addMany) are accepted again in the Group phase.
    expect(phaseAvailability(agenda(['write', 'vote', 'group'], 1), 'note.addMany', false)).toMatchObject({ allowed: false, closedBy: 'vote', opensAt: 'group' })
    expect(phaseAvailability(agenda(['write', 'vote', 'actions'], 1), 'note.add', false)).toMatchObject({ allowed: false, closedBy: 'vote', opensAt: null })
    // Before voting: voting opens at the vote phase.
    expect(phaseAvailability(agenda(ALL, ALL.indexOf('write')), 'vote.add', false)).toMatchObject({ allowed: false, closedBy: 'write', opensAt: 'vote' })
  })

  it('lets facilitators through and says so', () => {
    expect(phaseAvailability(agenda(ALL, ALL.indexOf('vote')), 'note.add', true)).toEqual({ allowed: true, bypassed: true, closedBy: 'vote', opensAt: null })
  })
})
