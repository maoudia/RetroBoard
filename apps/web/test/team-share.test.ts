import { describe, expect, it } from 'vitest'
import type { TeamShare } from '@retroboard/application'
import { buildTeamFile, isTeamHash, parseTeamFile, teamFromHash, teamLink } from '../app/utils/team-share'

const share: TeamShare = { id: 't-search', name: 'Search', emoji: '🚀', color: '#e8590c', settings: { templateId: 'mad-sad-glad', themeId: 'ocean' } }

describe('team link', () => {
  it('round-trips through the fragment and shows nothing readable in the link', async () => {
    const link = await teamLink(share, 'https://retro.example')
    expect(link.startsWith('https://retro.example/#team=')).toBe(true)
    expect(link).not.toContain('Search')
    expect(isTeamHash(link.slice('https://retro.example/'.length))).toBe(true)
    expect(await teamFromHash(link.slice('https://retro.example/'.length))).toEqual(share)
  })

  it('two links of the same team differ (fresh key each time)', async () => {
    expect(await teamLink(share, '')).not.toBe(await teamLink(share, ''))
  })

  it('refuses a link that is not one, was cut, altered or holds something else', async () => {
    const hash = (await teamLink(share, '')).slice(1)
    const [k, ct] = hash.slice('#team='.length).split('.') as [string, string]
    const flipped = `${ct.slice(0, -2)}${ct.endsWith('AA') ? 'BB' : 'AA'}`
    for (const bad of ['', '#board=abc', '#team=', '#team=abc', `#team=${k}`, `#team=${k}.`, `#team=.${ct}`, `#team=${k}.${flipped}`, `#team=${k}.${ct}.x`, `#team=${ct}.${k}`, '#team=!!.!!']) expect(await teamFromHash(bad)).toBeNull()
  })
})

describe('team file', () => {
  it('round-trips and holds the team only', () => {
    const text = buildTeamFile(share)
    expect(JSON.parse(text)).toEqual({ format: 'retroboard-team', version: 1, team: share })
    expect(parseTeamFile(text)).toEqual(share)
  })

  it('refuses other files', () => {
    for (const bad of ['', 'nope', 'null', '[]', '{}', JSON.stringify({ format: 'retroboard-settings', version: 1, team: share }), JSON.stringify({ format: 'retroboard-team', version: 2, team: share }), JSON.stringify({ format: 'retroboard-team', version: 1 }), JSON.stringify({ format: 'retroboard-team', version: 1, team: { id: 'a' } })]) expect(parseTeamFile(bad)).toBeNull()
  })
})
