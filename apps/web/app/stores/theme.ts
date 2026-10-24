import { DEFAULT_THEME_ID, getTheme, type ThemeVariant } from '@retroboard/themes'
import { applyTheme } from '~/utils/theme'

/**
 * The theme on screen: the board's theme (imposed for everyone) in my light or dark variant.
 */
export const useThemeStore = defineStore('theme', () => {
  const settings = useSettingsStore()
  const themeId = ref(DEFAULT_THEME_ID)
  const theme = computed(() => getTheme(themeId.value))
  const systemDark = ref(false)
  if (import.meta.client && typeof matchMedia === 'function') {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mq.matches
    mq.addEventListener?.('change', (e) => { systemDark.value = e.matches })
  }
  /** The variant actually shown. */
  const variant = computed<ThemeVariant>(() => {
    const pref = settings.s.variant
    if (pref === 'light' || pref === 'dark') return pref
    if (pref === 'system') return systemDark.value ? 'dark' : 'light'
    return theme.value.scheme
  })
  watch(variant, (v) => { if (import.meta.client) applyTheme(theme.value, v) })

  /** Fonts load lazily per theme; the palette applies at once so the switch feels instant. */
  async function use(id: string, _remember = false) {
    const next = getTheme(id)
    themeId.value = next.id
    applyTheme(next, variant.value)
    try { await next.loadFonts() } catch { /* fall back to system fonts */ }
  }
  return { themeId, theme, variant, use }
})
