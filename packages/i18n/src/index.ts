/** Typed dictionaries and pure translation helpers. The reactive current locale lives in the web app. */
import { en } from './en'
import { fr } from './fr'

export type Locale = 'fr' | 'en'
export { en } from './en'
export { fr } from './fr'

export const LOCALES: readonly { id: Locale; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
]
export type LocalePref = Locale | 'auto'

export type MessageKey = keyof typeof fr
/** Plural keys are written `base.one` / `base.other` and called with `t('base', { n })`. */
export type MessageBase = MessageKey extends infer K ? (K extends `${infer B}.${'one' | 'other'}` ? B : K) : never

const DICTS: Record<Locale, Record<MessageKey, string>> = { fr, en }

export function detectLocale(pref: LocalePref, langs: readonly string[] = []): Locale {
  if (pref !== 'auto') return pref
  for (const l of langs) {
    const base = l.toLowerCase().split('-')[0]
    if (base === 'fr' || base === 'en') return base
  }
  return 'en'
}

export type Params = Record<string, string | number>

export function translate(locale: Locale, key: string, params?: Params): string {
  const dict = DICTS[locale] as Record<string, string>
  let k = key
  if (params && typeof params.n === 'number') {
    const cat = new Intl.PluralRules(locale).select(params.n) === 'one' ? 'one' : 'other'
    if (`${key}.${cat}` in dict) k = `${key}.${cat}`
  }
  const raw = dict[k] ?? (fr as Record<string, string>)[k] ?? key
  return params ? raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`)) : raw
}
