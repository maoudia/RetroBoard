import { describe, expect, it } from 'vitest'
import { SHIPPED, type SyncFeatures, type SyncPathId, detectFeatures, syncPaths } from '../app/adapters/sync/sync-paths'

const ALL: ReadonlySet<SyncPathId> = new Set<SyncPathId>(['folder', 'device', 'file', 'onedrive'])
const features = (f: Partial<SyncFeatures>): SyncFeatures => ({ folderPicker: false, onedrive: false, standalone: false, ...f })

/** Each browser class by the features it exposes, never by its user agent. */
const BROWSERS = {
  'desktop Chromium': detectFeatures({ showDirectoryPicker: () => undefined }, false),
  'Safari': detectFeatures({}, false),
  'Firefox': detectFeatures({}, false),
  'Android Chrome': detectFeatures({ navigator: { userAgent: 'Chrome/130 Android' } }, false),
  'installed iOS app': detectFeatures({ navigator: { standalone: true } }, false),
}

describe('the ways to keep boards on other devices, chosen by feature (change sync-ux, 3.1)', () => {
  it('desktop Chromium leads with the folder', () => {
    expect(syncPaths(BROWSERS['desktop Chromium'], ALL)).toEqual(['folder', 'device', 'file'])
  })

  it('a browser with no folder picker never shows the folder, and leads with another device, then a file', () => {
    for (const name of ['Safari', 'Firefox', 'Android Chrome', 'installed iOS app'] as const) expect(syncPaths(BROWSERS[name], ALL), name).toEqual(['device', 'file'])
  })

  it('the Microsoft account comes last and only where the deployment enables it', () => {
    expect(syncPaths(features({ folderPicker: true, onedrive: true }), ALL)).toEqual(['folder', 'device', 'file', 'onedrive'])
    expect(syncPaths(features({ onedrive: true }), ALL)).toEqual(['device', 'file', 'onedrive'])
    expect(syncPaths(features({ onedrive: false }), ALL)).not.toContain('onedrive')
  })

  it('only what ships today is offered: the folder and the Microsoft account, never a path of a later group', () => {
    expect([...SHIPPED].sort()).toEqual(['folder', 'onedrive'])
    expect(syncPaths(BROWSERS['desktop Chromium'])).toEqual(['folder'])
    expect(syncPaths(features({ onedrive: true }))).toEqual(['onedrive'])
    expect(syncPaths(BROWSERS.Safari)).toEqual([])
  })

  it('detects an installed app by the standalone display mode or the iOS flag, and the picker by its presence', () => {
    expect(detectFeatures({ matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' }) }, false).standalone).toBe(true)
    expect(detectFeatures({ matchMedia: () => ({ matches: false }) }, false).standalone).toBe(false)
    expect(detectFeatures({ showDirectoryPicker: undefined }, false).folderPicker).toBe(true)
    expect(detectFeatures({}, true).onedrive).toBe(true)
  })
})
