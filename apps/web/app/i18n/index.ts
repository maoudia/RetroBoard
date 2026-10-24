import { type Locale, type MessageBase, type Params, translate } from '@retroboard/i18n'
import { ref } from 'vue'

export * from '@retroboard/i18n'

/** Current UI language. Module level so stores and utils can translate too. */
export const currentLocale = ref<Locale>('fr')

/** Reactive when read inside a template, computed or watcher. */
export function t(key: MessageBase, params?: Params): string {
  return translate(currentLocale.value, key, params)
}

/** Same as `t` for keys built at runtime (`error.${code}`); an unknown key falls back to the key itself. */
export function td(key: string, params?: Params): string {
  return translate(currentLocale.value, key, params)
}
