import { describe, expect, it } from 'vitest'
import { STICKY_COLORS, STICKY_INK, THEMES, contrast, getTheme, stickyColor, tokensFor } from '../src'
import { NOTE_COLOR_COUNT } from '@retroboard/domain'

describe.each(THEMES.map((t) => [t.id, t] as const))('theme %s', (_id, t) => {
  it('is complete', () => {
    expect(t.noteColors).toHaveLength(NOTE_COLOR_COUNT)
    for (const [k, v] of Object.entries(t.tokens)) expect(v, k).toMatch(/^#[0-9a-f]{6}$/i)
    for (const c of t.noteColors) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    expect(t.motion.enterMs).toBeGreaterThan(100)
  })

  it.each(['light', 'dark'] as const)('has readable text in the %s variant (WCAG AA 4.5:1)', (variant) => {
    const k = tokensFor(t, variant)
    for (const [name, v] of Object.entries(k)) expect(v, name).toMatch(/^#[0-9a-f]{6}$/i)
    expect(contrast(k.text, k.bg), 'text on bg').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.text, k.surface), 'text on surface').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.muted, k.bg), 'muted on bg').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.muted, k.surface), 'muted on surface').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.accentInk, k.accent), 'ink on accent').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.accent, k.surface), 'accent on surface').toBeGreaterThanOrEqual(3)
    expect(contrast(k.danger, k.surface), 'danger on surface').toBeGreaterThanOrEqual(3)
  })

  it.each(['light', 'dark'] as const)('has readable sticky notes in the %s variant', (variant) => {
    t.noteColors.forEach((c, i) => {
      expect(contrast(tokensFor(t, variant).noteInk, c), `note ${i}`).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('has a light and a dark variant that differ', () => {
    expect(tokensFor(t, 'light').bg).not.toBe(tokensFor(t, 'dark').bg)
    expect(contrast(tokensFor(t, 'light').bg, '#000000')).toBeGreaterThan(contrast(tokensFor(t, 'dark').bg, '#000000'))
  })
})

describe('registry', () => {
  it('has unique ids and a safe fallback', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length)
    expect(getTheme('does-not-exist').id).toBeTruthy()
    expect(getTheme(null).id).toBe(getTheme(undefined).id)
  })
})

describe('sticky-note palette', () => {
  it('has one colour per note slot, with distinct light and dark values', () => {
    expect(STICKY_COLORS).toHaveLength(NOTE_COLOR_COUNT)
    expect(new Set(STICKY_COLORS.map((c) => c.id)).size).toBe(NOTE_COLOR_COUNT)
    for (const c of STICKY_COLORS) {
      expect(c.light).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.dark).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.light).not.toBe(c.dark)
    }
  })
  it.each(['light', 'dark'] as const)('keeps the ink readable on every colour in the %s variant (WCAG AA 4.5:1)', (variant) => {
    STICKY_COLORS.forEach((c, i) => {
      expect(contrast(STICKY_INK, c[variant]), c.id).toBeGreaterThanOrEqual(4.5)
      expect(stickyColor(i, variant)).toBe(c[variant])
    })
  })
  it('keeps the colours of a note apart from each other (not near-identical)', () => {
    for (const variant of ['light', 'dark'] as const) {
      for (let a = 0; a < STICKY_COLORS.length; a++) for (let b = a + 1; b < STICKY_COLORS.length; b++) {
        expect(STICKY_COLORS[a]![variant]).not.toBe(STICKY_COLORS[b]![variant])
      }
    }
  })
  it('wraps unknown indexes onto the palette', () => {
    expect(stickyColor(8, 'light')).toBe(stickyColor(0, 'light'))
    expect(stickyColor(-1, 'dark')).toBe(stickyColor(7, 'dark'))
  })
})
