import { describe, expect, it } from 'vitest'
import { lastOpenedLabel } from '../app/utils/relative-time'

const NOW = Date.UTC(2026, 10, 1, 12, 0, 0)
const ago = (ms: number) => NOW - ms

describe('lastOpenedLabel', () => {
  it('says just now under a minute', () => {
    expect(lastOpenedLabel(ago(20_000), NOW, 'fr')).toBe('à l\'instant')
    expect(lastOpenedLabel(ago(20_000), NOW, 'en')).toBe('just now')
  })

  it('counts minutes, hours and days in the language', () => {
    expect(lastOpenedLabel(ago(5 * 60_000), NOW, 'en')).toBe('5 minutes ago')
    expect(lastOpenedLabel(ago(3 * 3_600_000), NOW, 'fr')).toBe('il y a 3 heures')
    expect(lastOpenedLabel(ago(86_400_000), NOW, 'en')).toBe('yesterday')
    expect(lastOpenedLabel(ago(3 * 86_400_000), NOW, 'fr')).toBe('il y a 3 jours')
  })

  it('falls back to the date after a week and never goes negative', () => {
    expect(lastOpenedLabel(ago(10 * 86_400_000), NOW, 'en')).toMatch(/22 Oct/)
    expect(lastOpenedLabel(NOW + 5000, NOW, 'en')).toBe('just now')
  })
})
