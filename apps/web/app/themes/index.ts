import { corporate } from './corporate'
import { cyber } from './cyber'
import { halloween } from './halloween'
import { minimal } from './minimal'
import { noel } from './noel'
import { paper } from './paper'
import { sakura } from './sakura'
import { studio } from './studio'
import { slate } from './slate'
import type { ThemeDefinition } from './types'

/**
 * To add a theme: create `app/themes/<id>.ts` exporting a ThemeDefinition and add it here.
 * The contrast test (tests/unit/themes.test.ts) tells you if the palette is readable.
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

export type { ThemeDefinition } from './types'
