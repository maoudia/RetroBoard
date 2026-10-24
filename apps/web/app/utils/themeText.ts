import { type ThemeDefinition, type ThemeText, themeText as localized } from '@retroboard/themes'
import { currentLocale } from '~/i18n'

/** Theme texts in the current UI language (reactive inside templates). */
export function themeText(theme: ThemeDefinition): ThemeText {
  return localized(theme, currentLocale.value)
}
