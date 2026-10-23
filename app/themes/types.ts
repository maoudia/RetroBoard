export type AmbientKind = 'none' | 'bats' | 'snow' | 'matrix' | 'petals'
export type EnterMotion = 'pop' | 'drop' | 'float' | 'glitch' | 'bloom'
export type LeaveMotion = 'poof' | 'melt' | 'fade'

export interface ThemeTokens {
  bg: string
  bg2: string
  surface: string
  surface2: string
  border: string
  text: string
  muted: string
  accent: string
  accent2: string
  /** Text on top of `accent`. */
  accentInk: string
  danger: string
  success: string
  /** Text on sticky notes. */
  noteInk: string
}

export interface ThemeMotion {
  enter: EnterMotion
  leave: LeaveMotion
  /** CSS timing, in ms. */
  enterMs: number
  /** Easing for entering and moving notes. */
  ease: string
  ambient: AmbientKind
}

export interface ThemeDefinition {
  id: string
  name: string
  emoji: string
  tagline: string
  /** 'pro' themes are sober and work-ready, 'fun' ones are seasonal and playful. */
  group: 'pro' | 'fun'
  scheme: 'dark' | 'light'
  tokens: ThemeTokens
  /** Exactly NOTE_COLOR_COUNT sticky note colours. */
  noteColors: readonly string[]
  fonts: { display: string; body: string; mono: string }
  /** Corner radius scale, in px. */
  radius: { card: number; control: number }
  motion: ThemeMotion
  copy: { hero: string; emptyColumn: string; privateHint: string }
  /** Lazily loads self hosted font files for this theme. */
  loadFonts: () => Promise<unknown>
}
