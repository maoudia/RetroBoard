import { describe, expect, it } from 'vitest'
import { THEMES, contrast, getTheme, tokensFor } from '../src'
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
