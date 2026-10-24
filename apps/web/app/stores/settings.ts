import { type LocalePref, currentLocale, detectLocale } from '~/i18n'
import { safeStorage } from '~/utils/storage'

export interface LocalSettings {
  /** Background atmosphere (snow, bats...) when the theme has one. */
  ambient: boolean
  motion: 'auto' | 'reduced'
  density: 'comfortable' | 'compact'
  /** Play a short chime when the timer ends. */
  sound: boolean
  /** 'board': follow the theme chosen for the team. 'mine': always use my own theme on my screen. */
  themeMode: 'board' | 'mine'
  myTheme: string | null
  /** Theme preselected when creating a board. */
  defaultTheme: string | null
  avatarHue: number
  /** UI language: 'auto' follows the browser. */
  locale: LocalePref
  /** Let AI agents built into the browser use this site's tools (WebMCP). Off by default. */
  browserAgents: boolean
  /** Days the encrypted copy of a board stays in this browser; 0 = delete it when I leave the board. */
  retentionDays: 0 | 1 | 7 | 30
}

const KEY = 'retroboard:settings'
export const AVATAR_HUES = [8, 32, 52, 140, 175, 210, 260, 320] as const
const DEFAULTS: LocalSettings = {
  ambient: true, motion: 'auto', density: 'comfortable', sound: false,
  themeMode: 'board', myTheme: null, defaultTheme: null, avatarHue: 210, locale: 'auto', browserAgents: false,
  retentionDays: 30,
}

/** Personal, local-only preferences. Nothing here is sent to the server. */
export const useSettingsStore = defineStore('settings', () => {
  const s = reactive<LocalSettings>({ ...DEFAULTS, ...safeStorage.get<Partial<LocalSettings>>(KEY, {}) })

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
