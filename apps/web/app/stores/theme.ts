import { DEFAULT_THEME_ID, getTheme } from '@retroboard/themes'
import { applyTheme } from '~/utils/theme'

export const useThemeStore = defineStore('theme', () => {
  const themeId = ref(DEFAULT_THEME_ID)
  const theme = computed(() => getTheme(themeId.value))

  /** Fonts load lazily per theme; the palette applies at once so the switch feels instant. */
  async function use(id: string, _remember = false) {
    const next = getTheme(id)
    themeId.value = next.id
    applyTheme(next)
    try { await next.loadFonts() } catch { /* fall back to system fonts */ }
  }
  return { themeId, theme, use }
})
