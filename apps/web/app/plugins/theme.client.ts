import { currentLocale } from '~/i18n'
import { suggestThemeForDate } from '@retroboard/domain'

/** First paint: apply local settings, then the preferred or seasonal theme. Pages and boards then take over. */
export default defineNuxtPlugin(() => {
  const settings = useSettingsStore()
  settings.apply()
  // Density is kept per screen class: re-apply when the window moves to another class.
  watch(() => useLayoutStore().cls, () => settings.apply())
  useHead({ htmlAttrs: { lang: currentLocale } })
  const theme = useThemeStore()
  void theme.use(settings.s.defaultTheme ?? suggestThemeForDate(new Date()).themeId, false)
})
