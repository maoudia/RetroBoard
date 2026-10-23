import { currentLocale } from '~/i18n'
import { suggestThemeForDate } from '~~/shared/domain/suggest'

/** First paint: apply local settings, then the preferred or seasonal theme. Pages and boards then take over. */
export default defineNuxtPlugin(() => {
  const settings = useSettingsStore()
  settings.apply()
  useHead({ htmlAttrs: { lang: currentLocale } })
  const theme = useThemeStore()
  void theme.use(settings.s.themeMode === 'mine' && settings.s.myTheme ? settings.s.myTheme : (settings.s.defaultTheme ?? suggestThemeForDate(new Date()).themeId), false)
})
