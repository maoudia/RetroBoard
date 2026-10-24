import { currentLocale } from '~/i18n'
import { THEMES_EN, type ThemeText } from '~/i18n/themes.en'
import type { ThemeDefinition } from '~/themes'

/** Theme texts in the current language (French is defined on the theme itself). */
export function themeText(theme: ThemeDefinition): ThemeText {
  if (currentLocale.value === 'en' && THEMES_EN[theme.id]) return THEMES_EN[theme.id]!
  return { tagline: theme.tagline, ...theme.copy }
}
