import { describe, expect, it } from 'vitest'
import { addTeam, assignBoard, carryOver, currentTeam, EMPTY_WORKSPACE, MAX_RETROS_PER_TEAM, nextTitle, projectsOf, saveRetro, setDefaults, type SavedRetro } from '../src'

const retro = (over: Partial<SavedRetro>): SavedRetro => ({ boardId: 'b', teamId: 't1', project: null, title: 'Sprint 42', at: 1, actions: [], ...over })
const act = (text: string, status = 'todo', owner = 'Ana') => ({ text, owner, status })

describe('workspace', () => {
  it('adds teams with a look and remembers the last one used', () => {
    const a = addTeam(EMPTY_WORKSPACE, '  Payments ', 't1')
    const b = addTeam(a.ws, 'Search', 't2')
    expect(a.team.name).toBe('Payments')
    expect(b.team.color).not.toBe(a.team.color)
    expect(currentTeam(b.ws)?.id).toBe('t2')
    expect(currentTeam(assignBoard(b.ws, 'x', 't1', ' Mobile '))?.id).toBe('t1')
  })

  it('never mixes the actions of two teams', () => {
    let ws = saveRetro(EMPTY_WORKSPACE, retro({ boardId: 'a', teamId: 't1', actions: [act('Fix CI')] }))
    ws = saveRetro(ws, retro({ boardId: 'b', teamId: 't2', actions: [act('Hire')] }))
    expect(carryOver(ws, 't1').map((c) => c.text)).toEqual(['Fix CI'])
    expect(carryOver(ws, 't2').map((c) => c.text)).toEqual(['Hire'])
  })

  it('keeps open actions only, newest first, once, with source and date', () => {
    let ws = saveRetro(EMPTY_WORKSPACE, retro({ boardId: 'a', at: 1, title: 'Sprint 41', actions: [act('Docs'), act('Old', 'done')] }))
    ws = saveRetro(ws, retro({ boardId: 'b', at: 2, title: 'Sprint 42', actions: [act('Docs', 'doing'), act('Tests')] }))
    const out = carryOver(ws, 't1')
    expect(out.map((c) => [c.text, c.from, c.at])).toEqual([['Docs', 'Sprint 42', 2], ['Tests', 'Sprint 42', 2]])
  })

  it('filters by project', () => {
    let ws = saveRetro(EMPTY_WORKSPACE, retro({ boardId: 'a', project: 'Mobile', actions: [act('M1')] }))
    ws = saveRetro(ws, retro({ boardId: 'b', project: 'Web', at: 2, actions: [act('W1')] }))
    expect(carryOver(ws, 't1', 'Mobile').map((c) => c.text)).toEqual(['M1'])
    expect(projectsOf(ws, 't1')).toEqual(['Mobile', 'Web'])
  })

  it('saving a board again replaces its entry and old retros are trimmed', () => {
    let ws = saveRetro(EMPTY_WORKSPACE, retro({ actions: [act('A')] }))
    ws = saveRetro(ws, retro({ actions: [act('B')] }))
    expect(ws.retros).toHaveLength(1)
    for (let i = 0; i < MAX_RETROS_PER_TEAM + 3; i++) ws = saveRetro(ws, retro({ boardId: `n${i}`, at: 10 + i }))
    expect(ws.retros.filter((r) => r.teamId === 't1')).toHaveLength(MAX_RETROS_PER_TEAM)
  })

  it('follows the numbering of the team title', () => {
    const ws = saveRetro(EMPTY_WORKSPACE, retro({ title: 'Sprint 42' }))
    expect(nextTitle(ws, 't1')).toBe('Sprint 43')
    expect(nextTitle(ws, 't2')).toBeNull()
    expect(nextTitle(saveRetro(EMPTY_WORKSPACE, retro({ title: 'Retro' })), 't1')).toBeNull()
  })

  it('a team starts its next board like its last one, and only that team', () => {
    const a = addTeam(EMPTY_WORKSPACE, 'Payments', 't1')
    const b = addTeam(a.ws, 'Search', 't2')
    const agenda = { phases: [{ kind: 'write' as const, minutes: 7 }], rules: true, autoPublish: false }
    const ws = setDefaults(b.ws, 't1', { templateId: 'mad-sad-glad', themeId: 'ocean', agenda, title: 'Sprint 9', at: 5 })
    expect(ws.teams.find((t) => t.id === 't1')?.defaults).toEqual({ templateId: 'mad-sad-glad', themeId: 'ocean', agenda, title: 'Sprint 9', at: 5 })
    expect(ws.teams.find((t) => t.id === 't2')?.defaults).toBeUndefined()
    expect(setDefaults(ws, 'nope', { themeId: 'x' })).toEqual(ws)
  })

  it('the title series follows the newest of the last created board and the last saved retro', () => {
    let ws = addTeam(EMPTY_WORKSPACE, 'Payments', 't1').ws
    expect(nextTitle(ws, 't1')).toBeNull()
    ws = setDefaults(ws, 't1', { title: 'Sprint 9', at: 5 })
    expect(nextTitle(ws, 't1')).toBe('Sprint 10')
    ws = saveRetro(ws, retro({ title: 'Sprint 12', at: 9 }))
    expect(nextTitle(ws, 't1')).toBe('Sprint 13')
    ws = setDefaults(ws, 't1', { title: 'Sprint 13', at: 9 })
    expect(nextTitle(ws, 't1')).toBe('Sprint 14')
    expect(nextTitle(setDefaults(ws, 't1', { title: 'Retro', at: 20 }), 't1')).toBeNull()
    const two = setDefaults(addTeam(setDefaults(addTeam(EMPTY_WORKSPACE, 'A', 'a').ws, 'a', { title: 'Alpha 1', at: 1 }), 'B', 'b').ws, 'b', { title: 'Beta 4', at: 2 })
    expect(nextTitle(two, 'b')).toBe('Beta 5')
    expect(nextTitle(two, 'a')).toBe('Alpha 2')
  })
})
