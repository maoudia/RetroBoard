// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- global *.css declaration for every consumer of this package
/// <reference path="./css.d.ts" />
import { corporate } from './corporate'
import { cyber } from './cyber'
import { halloween } from './halloween'
import { minimal } from './minimal'
import { noel } from './noel'
import { paper } from './paper'
import { sakura } from './sakura'
import { studio } from './studio'
import { slate } from './slate'
import { THEMES_EN as THEMES_EN_LOOKUP } from './texts.en'
import type { ThemeDefinition, ThemeTokens } from './types'

/**
 * To add a theme: create `packages/themes/src/<id>.ts` exporting a ThemeDefinition and add it here.
 * The contrast test (packages/themes/test/themes.test.ts) tells you if the palette is readable.
 */
export const THEMES: readonly ThemeDefinition[] = [studio, corporate, slate, paper, minimal, halloween, noel, cyber, sakura]
export const DEFAULT_THEME_ID = 'studio'

export const THEME_GROUPS = [
  { id: 'pro', label: 'Pro', hint: 'Sobres, lisibles, pour le travail' },
  { id: 'fun', label: 'Fun', hint: 'Saisonniers et ludiques' },
] as const

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!
}

export type * from './types'
export { contrast, luminance } from './color'
export { THEMES_EN, type ThemeText } from './texts.en'

/** Theme texts in a language. French is defined on the theme itself. */
export function themeText(theme: ThemeDefinition, locale: 'fr' | 'en'): import('./texts.en').ThemeText {
  const en = THEMES_EN_LOOKUP[theme.id]
  if (locale === 'en' && en) return en
  return { tagline: theme.tagline, ...theme.copy }
}

export type ThemeVariant = 'light' | 'dark'

/** Tokens of a theme for a variant: its native tokens, or the authored alternate ones. */
export const tokensFor = (theme: ThemeDefinition, variant: ThemeVariant): ThemeTokens => (variant === theme.scheme ? theme.tokens : theme.alt)
