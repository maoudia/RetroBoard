import { type Locale, currentLocale, t } from '~/i18n'

export function useT() {
  return { t, locale: currentLocale as Ref<Locale> }
}
