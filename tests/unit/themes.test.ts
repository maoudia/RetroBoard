import { describe, expect, it } from 'vitest'
import { THEMES, getTheme } from '../../apps/web/app/themes'
import { contrast } from '../../apps/web/app/utils/color'
import { NOTE_COLOR_COUNT } from '@retroboard/domain'

describe.each(THEMES.map((t) => [t.id, t] as const))('theme %s', (_id, t) => {
  it('is complete', () => {
    expect(t.noteColors).toHaveLength(NOTE_COLOR_COUNT)
    for (const [k, v] of Object.entries(t.tokens)) expect(v, k).toMatch(/^#[0-9a-f]{6}$/i)
    for (const c of t.noteColors) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    expect(t.motion.enterMs).toBeGreaterThan(100)
  })

  it('has readable text (WCAG AA 4.5:1)', () => {
    const k = t.tokens
    expect(contrast(k.text, k.bg), 'text on bg').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.text, k.surface), 'text on surface').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.muted, k.bg), 'muted on bg').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.muted, k.surface), 'muted on surface').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.accentInk, k.accent), 'ink on accent').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.accent, k.surface), 'accent on surface').toBeGreaterThanOrEqual(3)
    expect(contrast(k.danger, k.surface), 'danger on surface').toBeGreaterThanOrEqual(3)
  })

  it('has readable sticky notes', () => {
    t.noteColors.forEach((c, i) => {
      expect(contrast(t.tokens.noteInk, c), `note ${i}`).toBeGreaterThanOrEqual(4.5)
    })
  })
})

describe('registry', () => {
  it('has unique ids and a safe fallback', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length)
    expect(getTheme('does-not-exist').id).toBeTruthy()
    expect(getTheme(null).id).toBe(getTheme(undefined).id)
  })
})
