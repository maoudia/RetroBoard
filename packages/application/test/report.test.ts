import { describe, expect, it } from 'vitest'
import { buildSnapshot, MIN } from '@retroboard/domain'
import { alice, bob, harness } from '@retroboard/testkit'
import { buildReport } from '../src'

function retro() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Sprint 42' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Slow CI' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Flaky tests' })
  h.run({ t: 'note.add', columnId: h.col(1), text: 'Long meetings' }, bob)
  const [ci, flaky, meetings] = Object.keys(h.state.notes)
  h.run({ t: 'note.group', id: flaky!, ontoId: ci! })
  h.run({ t: 'vote.add', kind: 'note', id: meetings! })
  h.run({ t: 'vote.add', kind: 'note', id: meetings! }, bob)
  h.run({ t: 'action.add', text: 'Cache deps', owner: 'Ana' })
  h.run({ t: 'action.import', items: [{ text: 'Old one', owner: 'Zed', status: 'done', from: 'Sprint 41' }, { text: 'Still open', owner: '', status: 'doing', from: 'Sprint 41' }] })
  return h
}

describe('retro report', () => {
  it('has the title, date, metrics, podium and every column', () => {
    const h = retro()
    const r = buildReport(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), new Date('2026-10-24T10:00:00Z'))
    expect(r.title).toBe('Sprint 42')
    expect(r.date).toBe('2026-10-24')
    expect(r.metrics).toEqual({ participants: 1, ideas: 3, votes: 2, actions: 3, clusters: 1 })
    expect(r.podium.map((p) => [p.title, p.votes])).toEqual([['Long meetings', 2]])
    expect(r.columns.map((c) => [c.title, c.ideas, c.items.length])).toEqual([['Start', 2, 1], ['Stop', 1, 1], ['Continue', 0, 0]])
    expect(r.actions).toHaveLength(3)
    expect(r.carried).toEqual({ total: 2, byStatus: { done: 1, doing: 1 } })
    expect(r.agenda).toBeNull()
  })

  it('aggregates anonymous authors and never names who the board does not name', () => {
    const h = retro()
    const r = buildReport(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), new Date())
    // Alice shows her name; Bob does not.
    expect(r.ideasPerAuthor).toEqual([{ author: 'Alice', ideas: 2 }, { author: null, ideas: 1 }])
    expect(JSON.stringify(r)).not.toContain('Bob"')
  })

  it('counts people connected or named, at least one', () => {
    const h = retro()
    const peers = [{ name: 'A', me: true }, { name: null, me: false }, { name: null, me: false }]
    expect(buildReport(buildSnapshot(h.state, { cid: alice.cid }, peers, h.now), new Date()).metrics.participants).toBe(3)
  })

  it('hides every vote count while the secret vote is not closed', () => {
    const h = retro()
    h.run({ t: 'settings.update', secretVoting: true })
    const r = buildReport(buildSnapshot(h.state, { cid: bob.cid }, [], h.now), new Date())
    expect(r.votesHidden).toBe(true)
    expect(r.metrics.votes).toBeNull()
    expect(r.podium).toEqual([])
  })

  it('lists planned and actual phase durations', () => {
    const h = retro()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 3 }] })
    h.run({ t: 'agenda.start' })
    h.tick(7 * MIN)
    h.run({ t: 'agenda.next' })
    const r = buildReport(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), new Date())
    expect(r.agenda).toEqual([{ kind: 'write', plannedMs: 5 * MIN, actualMs: 7 * MIN }, { kind: 'vote', plannedMs: 3 * MIN, actualMs: null }])
  })
})
