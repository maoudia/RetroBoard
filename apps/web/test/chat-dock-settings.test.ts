import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCAL_ONLY_SETTINGS, SYNCED_SETTINGS } from '@retroboard/application'
import { DEFAULT_PLACE, validMode, validPlace } from '../app/utils/chat-dock'

/** The settings store needs the Nuxt runtime to import, so it is read from the source, like column-defaults.test.ts (change chat-floating-dock). */
const app = join(import.meta.dirname, '..', 'app')
const store = readFileSync(join(app, 'stores', 'settings.ts'), 'utf8')
const defaults = store.slice(store.indexOf('export const DEFAULTS'), store.indexOf('/** Personal, local-only'))

describe('chat button settings: local, validated, with defaults and a reset', () => {
  it('snaps by default, in the default place', () => {
    expect(defaults).toMatch(/chatDock: 'snap'/)
    expect(defaults).toMatch(/chatPlace: DEFAULT_PLACE/)
    expect(DEFAULT_PLACE).toEqual({ mode: 'snap', edge: 'right', at: 0.8 })
  })
  it('validates what it reads from storage and falls back to the defaults', () => {
    expect(store).toMatch(/s\.chatDock = validMode\(s\.chatDock\)/)
    expect(store).toMatch(/s\.chatPlace = validPlace\(s\.chatPlace\)/)
    expect(validMode('sideways')).toBe('snap')
    expect(validPlace({ mode: 'snap', edge: 'nowhere', at: 1 })).toEqual(DEFAULT_PLACE)
  })
  it('resets to snap mode at the default place, through the same local patch', () => {
    expect(store).toMatch(/function resetChatPlace\(\) \{ patch\(\{ chatDock: 'snap', chatPlace: \{ \.\.\.DEFAULT_PLACE \} \}\) \}/)
  })
  it('stays on this device: neither key is synced, and nothing writes them to the board or sends them', () => {
    for (const k of ['chatDock', 'chatPlace']) {
      expect(LOCAL_ONLY_SETTINGS).toContain(k)
      expect(SYNCED_SETTINGS).not.toContain(k)
    }
    for (const f of ['components/ChatBubble.vue', 'utils/chat-dock.ts']) {
      const src = readFileSync(join(app, f), 'utf8')
      expect(src, f).not.toMatch(/useBoardStore|board\.commands|\bfetch\(|WebSocket|sendBeacon|postMessage/)
    }
  })
})
