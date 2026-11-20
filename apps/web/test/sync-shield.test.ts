import { describe, expect, it } from 'vitest'
import type { VaultStatus } from '@retroboard/application'
import { SHIELD_PATH, SYNC_GLYPHS, type SyncGlyph, shieldAction, signInReturnTo, syncStatusIcon } from '../app/utils/sync-status'

const STATUSES = { unsupported: 0, off: 0, locked: 0, syncing: 0, synced: 0, offline: 0, 'allow-folder': 0, 'folder-not-found': 0, 'waiting-for-file': 0, 'needs-attention': 0, 'target-full': 0, 'sign-in-again': 0 } satisfies Record<VaultStatus, 0>
const ALL = Object.keys(STATUSES) as VaultStatus[]

describe('the sync shield icons (change sync-ux, 1.1)', () => {
  it('every state has a glyph, and every glyph has something drawn inside the shield', () => {
    for (const status of ALL) {
      const glyph = syncStatusIcon(status)
      expect(SYNC_GLYPHS[glyph], status).toBeDefined()
      expect(SYNC_GLYPHS[glyph].length, status).toBeGreaterThan(0)
    }
  })

  it('the glyphs differ in shape: no two states of the design table share a drawing', () => {
    const shapes = Object.entries(SYNC_GLYPHS).map(([glyph, paths]) => [glyph, paths.join('|')] as const)
    expect(new Set(shapes.map(([, d]) => d)).size).toBe(shapes.length)
    // The states a person tells apart at a glance: off, locked, synced, syncing and the alert family.
    const picks = (['off', 'locked', 'synced', 'syncing', 'needs-attention', 'offline'] as const).map((s) => syncStatusIcon(s))
    expect(new Set(picks).size).toBe(picks.length)
  })

  it('the shield is not the board encryption badge: the badge is a plain shield, with a check or struck out; the sync shield always carries its own mark', () => {
    const lucideShield = 'M20 13c0 5-3.5 7.5-7.66 8.95'
    expect(SHIELD_PATH.startsWith(lucideShield)).toBe(true)
    for (const [glyph, paths] of Object.entries(SYNC_GLYPHS) as [SyncGlyph, readonly string[]][]) {
      // The check of the board badge is `m9 12 2 2 4-4`; no glyph is that drawing alone, and none is empty.
      expect(paths.join(''), glyph).not.toBe('m9 12 2 2 4-4')
      expect(paths.length, glyph).toBeGreaterThan(0)
    }
    // The ones that say "sync" carry the two arrows.
    for (const g of ['off', 'syncing', 'synced', 'offline'] as const) expect(SYNC_GLYPHS[g].some((d) => d.startsWith('M8.4 12.5a3.6'))).toBe(true)
  })
})

describe('what pressing the shield does (change sync-ux, 1.2)', () => {
  it('starts the onboarding when sync is not set up, whatever the state says', () => {
    for (const status of ALL) expect(shieldAction(status, false), status).toBe('onboard')
  })

  it('syncs now when connected and synced, opens the unlock prompt when locked, and does the one recovery action otherwise', () => {
    expect(shieldAction('synced', true)).toBe('sync')
    expect(shieldAction('offline', true)).toBe('sync')
    expect(shieldAction('locked', true)).toBe('unlock')
    expect(shieldAction('syncing', true)).toBe('none')
    expect(shieldAction('allow-folder', true)).toBe('allow')
    expect(shieldAction('folder-not-found', true)).toBe('rechoose')
    expect(shieldAction('sign-in-again', true)).toBe('sign-in')
    for (const status of ['needs-attention', 'target-full', 'waiting-for-file'] as const) expect(shieldAction(status, true), status).toBe('panel')
  })

  it('a sign-in comes back to a page, never to a board link', () => {
    expect(signInReturnTo('/boards')).toBe('/boards')
    expect(signInReturnTo('/new')).toBe('/boards')
    expect(signInReturnTo('/storage/callback')).toBe('/boards')
  })
})
