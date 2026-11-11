/** Typed dictionaries and pure translation helpers. The reactive current locale lives in the web app. */
import { en } from './en'
import { fr } from './fr'
import { pseudolocalize } from './pseudo'

export type Locale = 'fr' | 'en'
export { en } from './en'
export { fr } from './fr'
export { PSEUDO_LANG, pseudolocalize, wantsPseudo } from './pseudo'

/** Display order everywhere: English first, then French, then future languages. */
export const LOCALES: readonly { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
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

/** The raw template of a key in a language (French when the language lacks it), or undefined when no dictionary has it. */
function lookup(locale: Locale, key: string, params?: Params): string | undefined {
  const dict = DICTS[locale] as Record<string, string>
  let k = key
  if (params && typeof params.n === 'number') {
    const cat = new Intl.PluralRules(locale).select(params.n) === 'one' ? 'one' : 'other'
    if (`${key}.${cat}` in dict) k = `${key}.${cat}`
  }
  return dict[k] ?? (fr as Record<string, string>)[k]
}

const fill = (raw: string, params?: Params) => (params ? raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`)) : raw)

export function translate(locale: Locale, key: string, params?: Params): string {
  return fill(lookup(locale, key, params) ?? key, params)
}

/** The pseudo-locale: French made longer. A key that no dictionary has comes back bare, without markers, so it stays visible. */
export function translatePseudo(key: string, params?: Params): string {
  const raw = lookup('fr', key, params)
  return raw === undefined ? key : fill(pseudolocalize(raw), params)
}
