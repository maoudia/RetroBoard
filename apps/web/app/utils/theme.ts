import { NOTE_COLOR_COUNT } from '@retroboard/domain'
import { type ThemeDefinition, type ThemeVariant, tokensFor } from '@retroboard/themes'

/** Writes a theme as CSS custom properties and data attributes. Pure DOM, no framework. */
export function applyTheme(theme: ThemeDefinition, variant: ThemeVariant = theme.scheme, root: HTMLElement = document.documentElement): void {
  const t = tokensFor(theme, variant)
  const vars: Record<string, string> = {
    '--bg': t.bg, '--bg2': t.bg2, '--surface': t.surface, '--surface2': t.surface2, '--border': t.border,
    '--text': t.text, '--muted': t.muted, '--accent': t.accent, '--accent2': t.accent2, '--accent-ink': t.accentInk,
    '--danger': t.danger, '--success': t.success, '--note-ink': t.noteInk,
    '--f-display': theme.fonts.display, '--f-body': theme.fonts.body, '--f-mono': theme.fonts.mono,
    '--r-card': `${theme.radius.card}px`, '--r-control': `${theme.radius.control}px`,
    '--enter-ms': `${theme.motion.enterMs}ms`, '--ease': theme.motion.ease,
  }
  for (let i = 0; i < NOTE_COLOR_COUNT; i++) vars[`--note-${i}`] = theme.noteColors[i]!
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.style.colorScheme = variant
  root.dataset.theme = theme.id
  root.dataset.variant = variant
  root.dataset.enter = theme.motion.enter
  root.dataset.leave = theme.motion.leave
}
