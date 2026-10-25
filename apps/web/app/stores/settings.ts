import { type LocalePref, currentLocale, detectLocale } from '~/i18n'
import { migrate } from '~/utils/settings-migration'
import { safeStorage } from '~/utils/storage'
import type { ThemeVariantPref } from '~/utils/settings-migration'

export interface LocalSettings {
  /** Background atmosphere (snow, bats...) when the theme has one. */
  ambient: boolean
  motion: 'auto' | 'reduced'
  density: 'comfortable' | 'compact'
  /** Play a short chime when the timer ends. */
  sound: boolean
  /**
   * Light or dark on my screen. The board theme itself is the team's choice (imposed);
   * 'theme' keeps the theme's own variant, 'system' follows the device.
   */
  variant: ThemeVariantPref
  /** Theme preselected when creating a board. */
  defaultTheme: string | null
  avatarHue: number
  /** UI language: 'auto' follows the browser. */
  locale: LocalePref
  /** Let AI agents built into the browser use this site's tools (WebMCP). Off by default. */
  browserAgents: boolean
  /** Days the encrypted copy of a board stays in this browser; 0 = delete it when I leave the board. */
  retentionDays: 0 | 1 | 7 | 30
  /** Others see my pointer (on touch screens: only while I drag). */
  shareCursor: boolean
  /** I see the others' pointers. */
  showCursors: boolean
  /** Direct links with the other participants (WebRTC). Off: relay only, my IP stays hidden from them. */
  p2p: boolean
  /** Single-key shortcuts on the board (keyboard users). */
  shortcuts: boolean
}

export type { ThemeVariantPref } from '~/utils/settings-migration'
const KEY = 'retroboard:settings'

export const AVATAR_HUES = [8, 32, 52, 140, 175, 210, 260, 320] as const
const DEFAULTS: LocalSettings = {
  ambient: true, motion: 'auto', density: 'comfortable', sound: false,
  variant: 'theme', defaultTheme: null, avatarHue: 210, locale: 'auto', browserAgents: false,
  retentionDays: 30, shareCursor: true, showCursors: true, p2p: true, shortcuts: true,
}

/** Personal, local-only preferences. Nothing here is sent to the server. */
export const useSettingsStore = defineStore('settings', () => {
  const s = reactive<LocalSettings>({ ...DEFAULTS, ...migrate(safeStorage.get<Record<string, unknown>>(KEY, {})) })

  function apply() {
    const root = document.documentElement
    root.dataset.motion = s.motion
    root.dataset.density = s.density
    currentLocale.value = detectLocale(s.locale, navigator.languages ?? [])
  }
  function patch(next: Partial<LocalSettings>) {
    Object.assign(s, next)
    safeStorage.set(KEY, { ...s })
    apply()
  }
  return { s, apply, patch }
})
