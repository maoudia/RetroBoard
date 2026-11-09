import { describe, expect, it } from 'vitest'
import { addTeam, assignBoard, EMPTY_WORKSPACE, joinTeam, parseTeamShare, saveRetro, setDefaults, teamShareOf, TEAM_COLORS, TEAM_EMOJIS } from '../src'

const agenda = { phases: [{ kind: 'write' as const, minutes: 7 }, { kind: 'vote' as const, minutes: 5 }], rules: true, autoPublish: true, autoStart: true, chain: false }

function aliceWorkspace() {
  let ws = addTeam(EMPTY_WORKSPACE, 'Search', 't-search').ws
  ws = setDefaults(ws, 't-search', { templateId: 'mad-sad-glad', themeId: 'ocean', agenda, title: 'SECRET sprint 9', at: 5 })
  ws = assignBoard(ws, 'room-1', 't-search', 'Project X')
  ws = saveRetro(ws, { boardId: 'room-1', teamId: 't-search', project: 'Project X', title: 'SECRET retro', at: 6, actions: [{ text: 'SECRET action text', owner: 'Ana', status: 'todo' }] })
  return ws
}

describe('team share', () => {
  it('carries the id, name, look and settings, and nothing from the boards, retros or titles', () => {
    const share = teamShareOf(aliceWorkspace().teams[0]!)
    expect(share).toEqual({ id: 't-search', name: 'Search', emoji: '🚀', color: TEAM_COLORS[0], settings: { templateId: 'mad-sad-glad', themeId: 'ocean', agenda } })
    const json = JSON.stringify(share)
    for (const secret of ['SECRET', 'room-1', 'Project X', 'Ana']) expect(json).not.toContain(secret)
  })

  it('a team without defaults shares empty settings', () => {
    expect(teamShareOf(addTeam(EMPTY_WORKSPACE, 'Solo', 't').team).settings).toEqual({})
  })

  it('round-trips through the parser', () => {
    const share = teamShareOf(aliceWorkspace().teams[0]!)
    expect(parseTeamShare(JSON.parse(JSON.stringify(share)))).toEqual(share)
  })

  it('refuses what is not a team and drops what it does not know', () => {
    for (const bad of [null, 'x', 3, [], {}, { id: 'a' }, { id: 'a b', name: 'N' }, { id: 'a', name: '  ' }, { id: 'a', name: 'x'.repeat(41) }, { id: 'a'.repeat(65), name: 'N' }]) expect(parseTeamShare(bad)).toBeNull()
    const p = parseTeamShare({ id: 'a-1_b', name: ' Pay ', emoji: 'nope', color: 'red', retros: [{ title: 'x' }], settings: { templateId: 5, themeId: 'dark', extra: 1 }, boards: { r: 1 } })
    expect(p).toEqual({ id: 'a-1_b', name: 'Pay', emoji: TEAM_EMOJIS[0], color: TEAM_COLORS[0], settings: { themeId: 'dark' } })
    expect(parseTeamShare({ id: 'a', name: 'N', emoji: TEAM_EMOJIS[2], color: TEAM_COLORS[3] })).toMatchObject({ emoji: TEAM_EMOJIS[2], color: TEAM_COLORS[3], settings: {} })
  })

  it('accepts names and ids up to their limits, trimmed', () => {
    expect(parseTeamShare({ id: 'a'.repeat(64), name: 'n'.repeat(40) })).toMatchObject({ id: 'a'.repeat(64), name: 'n'.repeat(40) })
    expect(parseTeamShare({ id: 'a', name: `  ${'n'.repeat(40)}  ` })?.name).toBe('n'.repeat(40))
    expect(parseTeamShare({ id: 'a', name: 'N', settings: { themeId: ' dark ' } })?.settings.themeId).toBe('dark')
  })

  it('checks the agenda of a shared team', () => {
    const base = { id: 'a', name: 'N' }
    const parse = (a: unknown) => parseTeamShare({ ...base, settings: { agenda: a } })!.settings.agenda
    expect(parse({ phases: [{ kind: 'write', minutes: 3 }], rules: 1, autoPublish: 'yes' })).toEqual({ phases: [{ kind: 'write', minutes: 3 }], rules: false, autoPublish: false })
    expect(parse(agenda)).toEqual(agenda)
    expect(parse({ phases: [{ kind: 'write', minutes: 600 }], rules: true, autoPublish: true })?.phases[0]?.minutes).toBe(600)
    expect(parse({ phases: Array.from({ length: 20 }, () => ({ kind: 'write', minutes: 1 })), rules: true, autoPublish: true })?.phases).toHaveLength(20)
    for (const bad of [null, 'x', {}, { phases: [] }, { phases: 'x' }, { phases: [null] }, { phases: [{ kind: 'nope', minutes: 3 }] }, { phases: [{ kind: 'write', minutes: 0 }] }, { phases: [{ kind: 'write', minutes: 601 }] }, { phases: [{ kind: 'write', minutes: 1.5 }] }, { phases: [{ kind: 'write', minutes: '3' }] }, { phases: Array.from({ length: 21 }, () => ({ kind: 'write', minutes: 1 })) }]) expect(parse(bad)).toBeUndefined()
  })

  it('joining adds the team and makes it the next one; joining again updates it and keeps the local boards', () => {
    const share = teamShareOf(aliceWorkspace().teams[0]!)
    let bob = joinTeam(addTeam(EMPTY_WORKSPACE, 'Mine', 'm').ws, share)
    expect(bob.teams.map((t) => t.id)).toEqual(['m', 't-search'])
    expect(bob.lastTeamId).toBe('t-search')
    expect(bob.teams[1]?.defaults).toEqual(share.settings)
    bob = assignBoard(bob, 'bob-room', 't-search', null)
    bob = setDefaults(bob, 't-search', { ...bob.teams[1]!.defaults, title: 'Bob 3', at: 9 })
    bob = joinTeam(bob, { ...share, name: 'Search v2', settings: { themeId: 'dark' } })
    expect(bob.teams).toHaveLength(2)
    expect(bob.teams[1]).toMatchObject({ name: 'Search v2', defaults: { templateId: 'mad-sad-glad', themeId: 'dark', title: 'Bob 3', at: 9 } })
    expect(bob.teams[0]?.id).toBe('m')
    expect(bob.boards['bob-room']?.teamId).toBe('t-search')
    expect(joinTeam(EMPTY_WORKSPACE, { id: 'x', name: 'X', emoji: '🚀', color: TEAM_COLORS[0], settings: {} }).teams[0]).not.toHaveProperty('defaults')
  })
})
