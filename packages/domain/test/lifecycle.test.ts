import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { MIN, phaseClock } from '../src'

describe('previous phase', () => {
  it('resumes the earlier phase with the time it had left', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 10 }, { kind: 'group', minutes: 5 }] })
    h.run({ t: 'agenda.start' })
    h.tick(7 * MIN)
    h.run({ t: 'agenda.next' })
    h.tick(MIN)
    expect(h.run({ t: 'agenda.prev' }).ok).toBe(true)
    const clock = phaseClock(h.state.agenda!, h.now)
    expect(clock).toMatchObject({ index: 0, remainingMs: 3 * MIN, paused: false })
    expect(h.state.agenda!.phases.every((p) => p.actualMs === undefined)).toBe(true)
  })

  it('works from the ended agenda and refuses before the first phase', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 4 }, { kind: 'vote', minutes: 4 }] })
    expect(h.run({ t: 'agenda.prev' })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'agenda.start' })
    expect(h.run({ t: 'agenda.prev' })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'agenda.next' }); h.tick(MIN); h.run({ t: 'agenda.end' })
    expect(h.state.agenda!.current).toBe(2)
    expect(h.run({ t: 'agenda.prev' }).ok).toBe(true)
    expect(h.state.agenda!.current).toBe(1)
    expect(phaseClock(h.state.agenda!, h.now).remainingMs).toBe(3 * MIN)
  })
})

describe('partial resets', () => {
  it('column.reset empties one column only, with its clusters', () => {
    const h = harness()
    const [c0, c1] = [h.col(0), h.col(1)]
    h.run({ t: 'note.addMany', items: [{ columnId: c0, text: 'a' }, { columnId: c0, text: 'b' }, { columnId: c1, text: 'c' }] })
    const [a, b] = Object.values(h.state.notes).filter((n) => n.columnId === c0).map((n) => n.id)
    h.run({ t: 'note.group', id: a!, ontoId: b! })
    expect(Object.keys(h.state.groups)).toHaveLength(1)
    expect(h.run({ t: 'column.reset', id: c0 }).ok).toBe(true)
    expect(Object.values(h.state.notes).map((n) => n.text)).toEqual(['c'])
    expect(Object.keys(h.state.groups)).toHaveLength(0)
    expect(h.state.columns).toHaveLength(h.state.columns.length)
    expect(h.run({ t: 'column.reset', id: 'ghost' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('vote.reset clears every vote and reopens voting, keeping the notes', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'idée' }, alice)
    const id = Object.keys(h.state.notes)[0]!
    h.run({ t: 'vote.add', kind: 'note', id }, bob)
    h.run({ t: 'vote.close' })
    expect(h.state.notes[id]!.voters).toHaveLength(1)
    expect(h.run({ t: 'vote.reset' }).ok).toBe(true)
    expect(h.state.notes[id]!.voters).toHaveLength(0)
    expect(h.state.settings.votingClosed).toBe(false)
    expect(h.run({ t: 'vote.add', kind: 'note', id }, bob).ok).toBe(true)
  })

  it('timer.reset can restart the phase clock too', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }] })
    h.run({ t: 'agenda.start' })
    h.tick(2 * MIN)
    h.run({ t: 'timer.reset' })
    expect(phaseClock(h.state.agenda!, h.now).elapsedMs).toBe(2 * MIN)
    h.run({ t: 'timer.reset', agendaClock: true })
    expect(phaseClock(h.state.agenda!, h.now).elapsedMs).toBe(0)
  })
})
