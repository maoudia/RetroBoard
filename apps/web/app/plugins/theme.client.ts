import { currentLocale } from '~/i18n'
import { suggestThemeForDate } from '@retroboard/domain'

/** First paint: apply local settings, then the preferred or seasonal theme. Pages and boards then take over. */
export default defineNuxtPlugin((nuxtApp) => {
  const settings = useSettingsStore()
  settings.apply()
  // A prerendered page (the landing, ADR-0038) is hydrated in the language it was rendered in, so the markup matches;
  // the visitor's language is applied as soon as the page has settled, before the next frame.
  if (nuxtApp.payload.serverRendered) {
    const rendered = document.documentElement.lang
    if (rendered === 'fr' || rendered === 'en') currentLocale.value = rendered
    nuxtApp.hook('app:suspense:resolve', () => settings.applyLocale())
  }
  // Density is kept per screen class: re-apply when the window moves to another class.
  watch(() => useLayoutStore().cls, () => settings.apply())
  useHead({ htmlAttrs: { lang: currentLocale } })
  const theme = useThemeStore()
  void theme.use(settings.s.defaultTheme ?? suggestThemeForDate(new Date()).themeId, false)
})
