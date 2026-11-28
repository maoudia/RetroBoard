import { describe, expect, it } from 'vitest'
import { harness } from '@retroboard/testkit'
import { allowedInPhase, CAPABILITIES, CAPABILITY_COMMANDS, type CommandType, normalizePolicy, PRIVILEGED_COMMANDS, PHASE_KINDS, PHASE_PRESETS, phaseAllows, type PhaseKind, presetCapability } from '../src'

const COMMANDS: CommandType[] = [...new Set([...Object.values(PHASE_PRESETS).flat(), 'chat.post', 'timer.start', 'note.group', 'vote.add', 'action.add'])] as CommandType[]

/** The table as it was before phase-controls: pinned here so a preset edit shows up as a failing test. */
const OLD: Record<PhaseKind, CommandType[]> = {
  checkin: [],
  review: ['action.status', 'action.update', 'action.toggle'],
  write: ['note.add', 'note.addMany', 'note.edit', 'note.delete', 'note.color'],
  group: ['note.group', 'note.ungroup', 'note.move', 'group.rename', 'group.recolor', 'group.dissolve', 'group.merge', 'group.move', 'note.edit', 'note.color', 'note.addMany'],
  vote: ['vote.add', 'vote.remove', 'vote.toggle', 'vote.seal', 'vote.unseal'],
  rank: ['action.add'],
  actions: ['action.add', 'action.update', 'action.status', 'action.toggle', 'action.delete'],
  close: ['roti.set'],
}

describe('phase policy', () => {
  it('a phase with no policy, or an empty one, answers exactly as the old table for every command', () => {
    for (const kind of PHASE_KINDS) {
      for (const command of COMMANDS) {
        const expected = OLD[kind].includes(command)
        expect(phaseAllows(kind, command), `${kind} ${command}`).toBe(expected)
        expect(phaseAllows({ kind }, command)).toBe(expected)
        expect(phaseAllows({ kind, policy: {} }, command)).toBe(expected)
      }
    }
  })

  it('a value equal to the preset is stored as no value', () => {
    expect(normalizePolicy('write', { write: true, vote: false })).toBeUndefined()
    expect(normalizePolicy('write', { vote: true })).toEqual({ vote: true })
    expect(normalizePolicy('group', { write: false })).toEqual({ write: false }) // note.edit is allowed by the preset: off is a real change
    expect(normalizePolicy('vote', { vote: true, freeze: false })).toBeUndefined()
    expect(presetCapability('vote', 'vote')).toBe(true)
    expect(presetCapability('group', 'write')).toBe(false)
  })

  it('turning a capability on or off changes only the commands it governs', () => {
    expect(phaseAllows({ kind: 'group', policy: { write: true } }, 'note.add')).toBe(true)
    expect(phaseAllows({ kind: 'group', policy: { write: true } }, 'note.group')).toBe(true)
    expect(phaseAllows({ kind: 'group', policy: { write: true } }, 'vote.add')).toBe(false)
    expect(phaseAllows({ kind: 'write', policy: { write: false } }, 'note.add')).toBe(false)
    expect(phaseAllows({ kind: 'write', policy: { write: false } }, 'note.addMany')).toBe(true)
    expect(phaseAllows({ kind: 'write', policy: { publish: false } }, 'note.addMany')).toBe(false)
    expect(phaseAllows({ kind: 'rank', policy: { vote: true } }, 'vote.add')).toBe(true)
  })

  it('every capability governs exactly its own commands, on and off', () => {
    for (const c of CAPABILITIES) {
      if (c === 'freeze') continue
      for (const command of CAPABILITY_COMMANDS[c]) {
        expect(phaseAllows({ kind: 'checkin', policy: { [c]: true } }, command), `${c} on ${command}`).toBe(true)
        expect(phaseAllows({ kind: 'actions', policy: { [c]: false } }, command), `${c} off ${command}`).toBe(false)
        expect(phaseAllows({ kind: 'checkin', policy: { [c]: true } }, 'roti.set'), c).toBe(false)
      }
    }
    expect(Object.fromEntries(Object.entries(CAPABILITY_COMMANDS).map(([k, v]) => [k, v.length]))).toEqual({ write: 4, publish: 1, group: 8, vote: 5, actions: 5 })
    expect(presetCapability('write', 'freeze')).toBe(false)
    expect(presetCapability('write', 'write')).toBe(true)
  })

  it('freeze closes everything governed, for any kind', () => {
    for (const kind of PHASE_KINDS) for (const command of COMMANDS) expect(phaseAllows({ kind, policy: { freeze: true } }, command)).toBe(false)
  })

  it('never governs chat, the talk turn or the presenter', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'rank', minutes: 5, policy: { freeze: true } }], rules: true })
    h.run({ t: 'agenda.start' })
    for (const c of ['chat.post', 'talk.self', 'talk.done', 'presenter.set'] as CommandType[]) expect(allowedInPhase(h.state.agenda, c)).toBe(true)
  })
})

describe('command agenda.policy', () => {
  const setup = () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'group', minutes: 5 }], rules: true })
    return { h, ids: h.state.agenda!.phases.map((p) => p.id) }
  }

  it('is a facilitator command', () => expect([...PRIVILEGED_COMMANDS]).toContain('agenda.policy'))

  it('stores only what differs from the preset, merges, and a reset removes the policy', () => {
    const { h, ids } = setup()
    expect(h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { write: true, group: true } }).ok).toBe(true)
    expect(h.state.agenda!.phases[1]!.policy).toEqual({ write: true })
    h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { freeze: true } })
    expect(h.state.agenda!.phases[1]!.policy).toEqual({ write: true, freeze: true })
    h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { write: false, freeze: false } })
    expect(h.state.agenda!.phases[1]!.policy).toEqual({ write: false })
    h.run({ t: 'agenda.policy', phase: ids[1]!, reset: true, policy: {} })
    expect(h.state.agenda!.phases[1]!).not.toHaveProperty('policy')
    expect(h.state.agenda!.phases[0]!).not.toHaveProperty('policy')
  })

  it('does nothing when the policy would not change, and refuses an unknown phase or agenda', () => {
    const { h, ids } = setup()
    expect(h.run({ t: 'agenda.policy', phase: ids[0]!, policy: { write: true } })).toMatchObject({ ok: true })
    expect(h.run({ t: 'agenda.policy', phase: 'nope1234', policy: { vote: true } })).toEqual({ ok: false, error: 'not-found' })
    expect(harness().run({ t: 'agenda.policy', phase: 'nope1234', policy: { vote: true } })).toEqual({ ok: false, error: 'not-found' })
  })

  it('says whether the fold changed anything: a change is a meta write, a repeat is clean', () => {
    const { h, ids } = setup()
    const changed = h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { write: true } })
    expect(changed.ok && changed.dirty).toEqual({ meta: true, notes: [], groups: [], actions: [], wipe: false })
    const again = h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { write: true } })
    expect(again.ok && again.dirty).toEqual({ meta: false, notes: [], groups: [], actions: [], wipe: false })
    expect(h.state.agenda!.phases[1]!.policy).toEqual({ write: true })
  })

  it('applies to the running phase at once, and a phase change keeps each phase policy', () => {
    const { h, ids } = setup()
    h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { write: true } })
    h.run({ t: 'agenda.start' })
    expect(allowedInPhase(h.state.agenda, 'note.add')).toBe(true)
    h.run({ t: 'agenda.policy', phase: ids[0]!, policy: { write: false } })
    expect(allowedInPhase(h.state.agenda, 'note.add')).toBe(false)
    h.run({ t: 'agenda.next' })
    expect(allowedInPhase(h.state.agenda, 'note.add')).toBe(true)
  })

  it('two replicas folding the same commands agree, and a replica that replays the whole log after a reload converges', () => {
    const log = (h: ReturnType<typeof harness>, ids: string[]) => {
      h.run({ t: 'agenda.start' })
      h.run({ t: 'agenda.policy', phase: ids[1]!, policy: { write: true } })
      h.run({ t: 'agenda.policy', phase: ids[0]!, policy: { freeze: true } })
      h.run({ t: 'agenda.next' })
    }
    const a = setup()
    const b = setup()
    log(a.h, a.ids)
    log(b.h, b.ids)
    expect(b.h.state.agenda).toEqual(a.h.state.agenda)
    expect(allowedInPhase(a.h.state.agenda, 'note.add')).toBe(true)
  })

  it('agenda.set carries a creation policy, normalized', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'rank', minutes: 5, policy: { vote: true, actions: false } }] })
    expect(h.state.agenda!.phases[0]!.policy).toEqual({ vote: true, actions: false })
    h.run({ t: 'agenda.clear' })
    h.run({ t: 'agenda.set', phases: [{ kind: 'vote', minutes: 5, policy: { vote: true, freeze: false } }] })
    expect(h.state.agenda!.phases[0]!).not.toHaveProperty('policy')
  })
})
