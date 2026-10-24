import { describe, expect, it } from 'vitest'
import { harness } from '@retroboard/testkit'
import { buildSnapshot, isOpenAction, LIMITS } from '../src'

const first = (h: ReturnType<typeof harness>) => Object.values(h.state.actions)[0]!

describe('action workflow', () => {
  it('starts as To do and keeps a status history', () => {
    const h = harness()
    h.run({ t: 'action.add', text: 'Cache deps', owner: 'Bob', due: '2026-11-07' })
    const a = first(h)
    expect([a.status, a.done, a.due, a.carriedFrom, a.history.map((x) => x.status)]).toEqual(['todo', false, '2026-11-07', null, ['todo']])
    h.tick(1_000)
    h.run({ t: 'action.status', id: a.id, status: 'blocked' })
    h.tick(1_000)
    h.run({ t: 'action.status', id: a.id, status: 'done' })
    const b = first(h)
    expect(b.history.map((x) => x.status)).toEqual(['todo', 'blocked', 'done'])
    expect(b.history[2]!.at - b.history[1]!.at).toBe(1_000)
    expect(b.done).toBe(true)
    // Same status again: no new history entry.
    h.run({ t: 'action.status', id: a.id, status: 'done' })
    expect(first(h).history).toHaveLength(3)
  })

  it('checkbox toggles map to done and todo', () => {
    const h = harness()
    h.run({ t: 'action.add', text: 'x', owner: '' })
    h.run({ t: 'action.toggle', id: first(h).id, done: true })
    expect(first(h).status).toBe('done')
    h.run({ t: 'action.toggle', id: first(h).id, done: false })
    expect([first(h).status, first(h).done]).toEqual(['todo', false])
  })

  it('updates text, owner and due date, and clears the due date', () => {
    const h = harness()
    h.run({ t: 'action.add', text: 'x', owner: '', due: '2026-11-07' })
    h.run({ t: 'action.update', id: first(h).id, owner: 'Carla', text: 'y' })
    expect([first(h).owner, first(h).text, first(h).due]).toEqual(['Carla', 'y', '2026-11-07'])
    h.run({ t: 'action.update', id: first(h).id, due: null })
    expect(first(h).due).toBeNull()
    expect(h.run({ t: 'action.update', id: 'ghost-action', owner: 'x' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'action.status', id: 'ghost-action', status: 'done' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('rejects impossible dates and unknown statuses', () => {
    const h = harness()
    expect(h.run({ t: 'action.add', text: 'x', owner: '', due: '2026-02-31' })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'action.add', text: 'x', owner: '', due: '07/11/2026' })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'action.add', text: 'x', owner: '' })
    expect(h.run({ t: 'action.status', id: first(h).id, status: 'waiting' as never })).toEqual({ ok: false, error: 'invalid' })
  })

  it('imports carried-over actions with their status, owner and origin, atomically and within limits', () => {
    const h = harness()
    h.run({ t: 'action.import', items: [
      { text: 'Fix flaky tests', owner: 'Ana', status: 'blocked', from: 'Sprint 42' },
      { text: 'Write runbook', owner: '', status: 'doing', due: '2026-11-01' },
    ] })
    const all = Object.values(h.state.actions)
    expect(all.map((a) => [a.text, a.owner, a.status, a.carriedFrom])).toEqual([['Fix flaky tests', 'Ana', 'blocked', 'Sprint 42'], ['Write runbook', '', 'doing', '']])
    expect(all.every(isOpenAction)).toBe(true)
    const many = Array.from({ length: LIMITS.maxImport + 1 }, (_, i) => ({ text: `a${i}`, owner: '', status: 'todo' as const }))
    expect(h.run({ t: 'action.import', items: many })).toEqual({ ok: false, error: 'invalid' })
    for (let i = 0; i < LIMITS.maxActions - 2; i++) h.run({ t: 'action.add', text: `a${i}`, owner: '' })
    expect(h.run({ t: 'action.import', items: [{ text: 'one too many', owner: '', status: 'todo' }] })).toEqual({ ok: false, error: 'limit-reached' })
  })

  it('open actions exclude done and dropped; snapshots carry statuses', () => {
    expect(['todo', 'doing', 'blocked', 'done', 'dropped'].map((status) => isOpenAction({ status: status as never }))).toEqual([true, true, true, false, false])
    const h = harness()
    h.run({ t: 'settings.update', actionMode: 'workflow' })
    h.run({ t: 'action.add', text: 'x', owner: '' })
    const s = buildSnapshot(h.state, { cid: 'x' }, [], h.now)
    expect([s.settings.actionMode, s.actions[0]!.status]).toEqual(['workflow', 'todo'])
  })
})
