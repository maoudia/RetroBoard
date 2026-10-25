/**
 * Sticky-note palette shared by every theme (change sticky-notes-v2). The index is the
 * `color` stored on a note, so the order never changes: it follows the original eight slots
 * (yellow, pink, green, blue, lilac, orange, mint, white).
 * `light` and `dark` are the paper colours for each participant variant; the ink is the same.
 */
export interface StickyColor {
  id: 'yellow' | 'pink' | 'green' | 'blue' | 'lilac' | 'orange' | 'mint' | 'white'
  light: string
  dark: string
}

export const STICKY_INK = '#1b1d2a'

export const STICKY_COLORS: readonly StickyColor[] = [
  { id: 'yellow', light: '#fff59d', dark: '#f0d95a' },
  { id: 'pink', light: '#ffc4dd', dark: '#e8a0c0' },
  { id: 'green', light: '#c8f0a8', dark: '#a6d37f' },
  { id: 'blue', light: '#b8dcff', dark: '#8fbfee' },
  { id: 'lilac', light: '#dcc8ff', dark: '#bda5ea' },
  { id: 'orange', light: '#ffd0a0', dark: '#eab07a' },
  { id: 'mint', light: '#b4f0dc', dark: '#86d4bb' },
  { id: 'white', light: '#fbfbf6', dark: '#d9d9d2' },
]

export function stickyColor(index: number, variant: 'light' | 'dark'): string {
  const c = STICKY_COLORS[((index % STICKY_COLORS.length) + STICKY_COLORS.length) % STICKY_COLORS.length]!
  return c[variant]
}
