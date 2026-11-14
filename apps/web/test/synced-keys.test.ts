import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LOCAL_ONLY_IDENTITY, LOCAL_ONLY_SETTINGS, SYNCED_IDENTITY, SYNCED_SETTINGS } from '@retroboard/application'

const source = (file: string) => readFileSync(new URL(`../app/stores/${file}`, import.meta.url), 'utf8')

/** Keys of an interface written one property per line (LocalSettings) or on one line (the identity's saved shape). */
function keysOf(source: string, name: string): string[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const start = text.indexOf(`interface ${name} {`)
  if (start < 0) throw new Error(`interface ${name} not found`)
  const open = start + `interface ${name} {`.length
  const end = text.indexOf('\n}', open) > -1 && text.slice(open).startsWith('\n') ? text.indexOf('\n}', open) : text.indexOf('}', open)
  return [...text.slice(open, end).matchAll(/(?:^|[\n;{])\s*(\w+)\??:/g)].map((m) => m[1]!)
}

describe('every preference and identity key is classified for sync (change user-drive-storage)', () => {
  it('LocalSettings: each key is in SYNCED_SETTINGS or LOCAL_ONLY_SETTINGS, and the lists name no other key', () => {
    const keys = keysOf(source('settings.ts'), 'LocalSettings')
    expect(keys.length).toBeGreaterThan(20)
    expect([...SYNCED_SETTINGS, ...LOCAL_ONLY_SETTINGS].sort()).toEqual([...keys].sort())
    // A secret of this device (ADR-0033) must never be in the synced list.
    expect(SYNCED_SETTINGS).not.toContain('slackWebhook')
    expect(LOCAL_ONLY_SETTINGS).toContain('slackWebhook')
  })
  it('identity: each saved key is in SYNCED_IDENTITY or LOCAL_ONLY_IDENTITY, and the lists name no other key', () => {
    const keys = keysOf(source('identity.ts'), 'Saved')
    expect(keys).toContain('cid')
    expect([...SYNCED_IDENTITY, ...LOCAL_ONLY_IDENTITY].sort()).toEqual([...keys].sort())
  })
})
