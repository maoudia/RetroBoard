import { contrast, mix } from './color'

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

/**
 * Advanced palette (change composer-and-colour-v3): index 0..7 are the base colours, 8..15 their soft tints and
 * 16..23 their deep shades. No free colour: every extended colour is derived from a base one, and a shade is only
 * darkened while the note ink keeps at least 4.5:1 on it (tints toward white always do).
 */
export const STICKY_MIN_CONTRAST = 4.5
const TINT = 0.5
const MAX_DEEPEN = 0.4

export function stickyColor(index: number, variant: 'light' | 'dark'): string {
  const n = STICKY_COLORS.length
  const total = n * 3
  const idx = ((index % total) + total) % total
  const family = idx % n
  const base = STICKY_COLORS[family]![variant]
  const level = Math.floor(idx / n)
  if (level === 1) return mix(base, '#ffffff', 1 - TINT)
  if (level >= 2) {
    let best = base
    for (let d = 0.04; d <= MAX_DEEPEN + 1e-9; d += 0.04) {
      const c = mix(base, '#000000', 1 - d)
      if (contrast(STICKY_INK, c) < STICKY_MIN_CONTRAST) break
      best = c
    }
    return best
  }
  return base
}
