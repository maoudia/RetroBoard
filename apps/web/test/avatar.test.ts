import { describe, expect, it } from 'vitest'
import { hueBg, nameHue, peerHue } from '../app/utils/avatar'

describe('peer avatar colour', () => {
  it('uses the hue the participant chose, whatever the name', () => {
    expect(peerHue({ name: 'Bob', hue: 175 })).toBe(175)
    expect(peerHue({ name: null, hue: 0 })).toBe(0)
  })
  it('falls back to a stable name-derived hue until the profile has arrived', () => {
    expect(peerHue({ name: 'Bob' })).toBe(nameHue('Bob'))
    expect(nameHue('Bob')).toBe(nameHue('Bob'))
    expect(nameHue('Bob')).toBeGreaterThanOrEqual(0)
    expect(nameHue('Bob')).toBeLessThan(360)
  })
  it('paints the same swatch as the profile picker', () => {
    expect(hueBg(175)).toEqual({ background: 'hsl(175 75% 78%)' })
  })
})
