import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  EMPTY_WORKSPACE, EMPTY_WORKSPACE_DOC, LOCAL_ONLY_IDENTITY, LOCAL_ONLY_SETTINGS, LOCAL_ONLY_WORKSPACE, MAX_RETROS_PER_TEAM, type SavedRetro, SYNCED_IDENTITY,
  SYNCED_SETTINGS, SYNCED_WORKSPACE, type Team, type Workspace, type WorkspaceDoc, applyWorkspaceDoc, mergeWorkspace, pickKeys, toWorkspaceDoc,
} from '../src'

const team = (id: string, name = id): Team => ({ id, name, emoji: '🚀', color: '#fff' })
const retro = (boardId: string, at: number, teamId = 't1', title = boardId): SavedRetro => ({ boardId, teamId, project: null, title, at, actions: [] })
const doc = (over: Partial<WorkspaceDoc> = {}): WorkspaceDoc => ({ ...EMPTY_WORKSPACE_DOC, ...over })
const stamped = (t: Team, at: number, device = 'd1') => ({ value: t, stamp: { at, device } })

describe('workspace merge', () => {
  it('merges teams by id, the later edit winning', () => {
    const a = doc({ teams: { t1: stamped(team('t1', 'Old'), 1), t2: stamped(team('t2'), 1) } })
    const b = doc({ teams: { t1: stamped(team('t1', 'New'), 2, 'd2'), t3: stamped(team('t3'), 1) } })
    const m = mergeWorkspace(a, b)
    expect(Object.keys(m.teams).sort()).toEqual(['t1', 't2', 't3'])
    expect(m.teams.t1!.value.name).toBe('New')
    expect(mergeWorkspace(b, a)).toEqual(m)
  })
  it('unites saved retros by board id, the newest save winning', () => {
    const m = mergeWorkspace(doc({ retros: [retro('b1', 1, 't1', 'old'), retro('b2', 5)] }), doc({ retros: [retro('b1', 9, 't1', 'new'), retro('b3', 2)] }))
    expect(m.retros.map((r) => [r.boardId, r.title])).toEqual([['b1', 'new'], ['b2', 'b2'], ['b3', 'b3']])
  })
  it('decides an exact tie the same way on both sides', () => {
    const a = doc({ retros: [retro('b1', 5, 't1', 'alpha')] })
    const b = doc({ retros: [retro('b1', 5, 't1', 'beta')] })
    expect(mergeWorkspace(a, b)).toEqual(mergeWorkspace(b, a))
  })
  it('keeps the newest retros per team, as saving does', () => {
    const many = Array.from({ length: MAX_RETROS_PER_TEAM + 3 }, (_, i) => retro(`b${i}`, i))
    const m = mergeWorkspace(doc({ retros: many.slice(0, 8) }), doc({ retros: [...many.slice(8), retro('other', 0, 't2')] }))
    expect(m.retros.filter((r) => r.teamId === 't1')).toHaveLength(MAX_RETROS_PER_TEAM)
    expect(m.retros.some((r) => r.boardId === 'b0')).toBe(false)
    expect(m.retros.some((r) => r.boardId === 'other')).toBe(true)
  })
  it('unites owners without duplicates, whatever the case', () => {
    const m = mergeWorkspace(doc({ owners: ['Zoe', 'alice'] }), doc({ owners: ['Alice', 'Bob'] }))
    expect(m.owners).toEqual(['alice', 'Bob', 'Zoe'])
    expect(mergeWorkspace(doc({ owners: ['Alice', 'Bob'] }), doc({ owners: ['Zoe', 'alice'] }))).toEqual(m)
    const forty = Array.from({ length: 45 }, (_, i) => `owner-${String(i).padStart(2, '0')}`)
    expect(mergeWorkspace(doc({ owners: forty }), doc()).owners).toHaveLength(40)
  })
  it('is commutative, associative and idempotent', () => {
    // A device never writes two different values under one stamp, so each document draws its stamps from its own device.
    const docArb = (device: string) => fc.record({
      teams: fc.dictionary(fc.constantFrom('t1', 't2'), fc.record({ value: fc.constantFrom('A', 'B').map((n) => team('x', n)), stamp: fc.record({ at: fc.integer({ min: 1, max: 5 }), device: fc.constant(device) }) })),
      retros: fc.uniqueArray(fc.record({ boardId: fc.constantFrom('b1', 'b2', 'b3'), teamId: fc.constant('t1'), project: fc.constant(null), title: fc.constantFrom('x', 'y'), at: fc.integer({ min: 1, max: 4 }), actions: fc.constant<SavedRetro['actions']>([]) }), { selector: (r) => r.boardId }),
      owners: fc.array(fc.constantFrom('a', 'B', 'c', 'A')),
    })
    fc.assert(fc.property(docArb('d1'), docArb('d2'), docArb('d3'), (a, b, c) => {
      expect(mergeWorkspace(a, b)).toEqual(mergeWorkspace(b, a))
      expect(mergeWorkspace(mergeWorkspace(a, b), c)).toEqual(mergeWorkspace(a, mergeWorkspace(b, c)))
      const once = mergeWorkspace(a, a)
      expect(mergeWorkspace(once, once)).toEqual(once)
      expect(mergeWorkspace(once, a)).toEqual(once)
    }), { numRuns: 200 })
  })
  it('converts a local workspace to a document and back, keeping what stays on the device', () => {
    const local: Workspace = { ...EMPTY_WORKSPACE, teams: [team('t1'), team('t2')], lastTeamId: 't2', retros: [retro('b1', 1)], boards: { b1: { teamId: 't1', project: 'p' } }, owners: ['Ann'] }
    const d = toWorkspaceDoc(local, { t1: { at: 7, device: 'd9' } }, { at: 3, device: 'd0' })
    expect(d.teams.t1!.stamp).toEqual({ at: 7, device: 'd9' })
    expect(d.teams.t2!.stamp).toEqual({ at: 3, device: 'd0' })
    expect(applyWorkspaceDoc(local, d)).toEqual(local)
    const remote = mergeWorkspace(d, doc({ teams: { t3: stamped(team('t3'), 9) }, owners: ['Bob'] }))
    const applied = applyWorkspaceDoc(local, remote)
    expect(applied.teams.map((t) => t.id)).toEqual(['t1', 't2', 't3'])
    expect(applied.owners).toEqual(['Ann', 'Bob'])
    expect(applied.boards).toEqual(local.boards)
    expect(applied.lastTeamId).toBe('t2')
    expect(applyWorkspaceDoc({ ...local, lastTeamId: 'gone' }, doc({ teams: { t3: stamped(team('t3'), 9) } })).lastTeamId).toBe('t3')
    expect(applyWorkspaceDoc(local, EMPTY_WORKSPACE_DOC).lastTeamId).toBeNull()
  })
})

describe('what syncs', () => {
  it('classifies every key of the workspace, once', () => {
    const keys = Object.keys(EMPTY_WORKSPACE).sort()
    expect([...SYNCED_WORKSPACE, ...LOCAL_ONLY_WORKSPACE].sort()).toEqual(keys)
  })
  it('keeps the lists disjoint and without duplicates', () => {
    for (const [a, b] of [[SYNCED_SETTINGS, LOCAL_ONLY_SETTINGS], [SYNCED_IDENTITY, LOCAL_ONLY_IDENTITY], [SYNCED_WORKSPACE, LOCAL_ONLY_WORKSPACE]] as const) {
      const all = [...a, ...b]
      expect(new Set(all).size).toBe(all.length)
    }
    expect(LOCAL_ONLY_SETTINGS).toContain('density')
    expect(LOCAL_ONLY_IDENTITY).toContain('cid')
  })
  it('picks the listed keys only', () => {
    expect(pickKeys({ locale: 'fr', density: 'compact', sound: true }, SYNCED_SETTINGS)).toEqual({ locale: 'fr', sound: true })
    expect(pickKeys({}, SYNCED_SETTINGS)).toEqual({})
    expect(pickKeys({ cid: 'abc', name: 'Ann' }, SYNCED_IDENTITY)).toEqual({ name: 'Ann' })
  })
})
