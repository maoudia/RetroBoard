import { describe, expect, it } from 'vitest'
import { BREAKPOINTS, SCREEN_IDS, TYPE_SCALE, screenOf, screenTokens } from '../src'

describe('screen classes', () => {
  it('start at the documented widths', () => {
    expect(BREAKPOINTS).toEqual({ phone: 360, tablet: 600, laptop: 1024, wide: 1600, tv: 2400 })
  })

  it('classify every width, edges included', () => {
    const at = (w: number) => screenOf(w)
    expect([0, 320, 359, 360, 599].map(at)).toEqual(Array(5).fill('phone'))
    expect([600, 1023].map(at)).toEqual(['tablet', 'tablet'])
    expect([1024, 1599].map(at)).toEqual(['laptop', 'laptop'])
    expect([1600, 2399].map(at)).toEqual(['wide', 'wide'])
    expect([2400, 3840].map(at)).toEqual(['tv', 'tv'])
  })

  it('scale the type up only for wide screens and TVs', () => {
    expect(SCREEN_IDS.map((id) => TYPE_SCALE[id])).toEqual([1, 1, 1, 1.125, 1.5])
  })
})

describe('generated CSS variables', () => {
  it('phone', () => {
    expect(screenTokens('phone')).toMatchInlineSnapshot(`
      {
        "--bp-laptop": "1024px",
        "--bp-phone": "360px",
        "--bp-tablet": "600px",
        "--bp-tv": "2400px",
        "--bp-wide": "1600px",
        "--fluid-2xl": "calc(clamp(1.5rem, 1.3911rem + 0.4839vw, 1.875rem) * var(--type-scale))",
        "--fluid-3xl": "calc(clamp(1.75rem, 1.5323rem + 0.9677vw, 2.5rem) * var(--type-scale))",
        "--fluid-lg": "calc(clamp(1.125rem, 1.0887rem + 0.1613vw, 1.25rem) * var(--type-scale))",
        "--fluid-md": "calc(clamp(1rem, 0.9819rem + 0.0806vw, 1.0625rem) * var(--type-scale))",
        "--fluid-sm": "calc(clamp(0.875rem, 0.8569rem + 0.0806vw, 0.9375rem) * var(--type-scale))",
        "--fluid-xl": "calc(clamp(1.25rem, 1.1774rem + 0.3226vw, 1.5rem) * var(--type-scale))",
        "--fluid-xs": "calc(clamp(0.75rem, 0.7319rem + 0.0806vw, 0.8125rem) * var(--type-scale))",
        "--screen": "phone",
        "--type-scale": "1",
      }
    `)
  })

  it('tv', () => {
    expect(screenTokens('tv')).toMatchInlineSnapshot(`
      {
        "--bp-laptop": "1024px",
        "--bp-phone": "360px",
        "--bp-tablet": "600px",
        "--bp-tv": "2400px",
        "--bp-wide": "1600px",
        "--fluid-2xl": "calc(clamp(1.5rem, 1.3911rem + 0.4839vw, 1.875rem) * var(--type-scale))",
        "--fluid-3xl": "calc(clamp(1.75rem, 1.5323rem + 0.9677vw, 2.5rem) * var(--type-scale))",
        "--fluid-lg": "calc(clamp(1.125rem, 1.0887rem + 0.1613vw, 1.25rem) * var(--type-scale))",
        "--fluid-md": "calc(clamp(1rem, 0.9819rem + 0.0806vw, 1.0625rem) * var(--type-scale))",
        "--fluid-sm": "calc(clamp(0.875rem, 0.8569rem + 0.0806vw, 0.9375rem) * var(--type-scale))",
        "--fluid-xl": "calc(clamp(1.25rem, 1.1774rem + 0.3226vw, 1.5rem) * var(--type-scale))",
        "--fluid-xs": "calc(clamp(0.75rem, 0.7319rem + 0.0806vw, 0.8125rem) * var(--type-scale))",
        "--screen": "tv",
        "--type-scale": "1.5",
      }
    `)
  })

  it('differ between classes only by the screen name and the type scale', () => {
    const phone = screenTokens('phone')
    for (const id of SCREEN_IDS) {
      const vars = screenTokens(id)
      expect(Object.keys(vars)).toEqual(Object.keys(phone))
      const changed = Object.keys(vars).filter((k) => vars[k] !== phone[k])
      expect(changed.filter((k) => k !== '--screen' && k !== '--type-scale')).toEqual([])
    }
  })

  it('keep the note text at 24 px or more on a 3840 px TV', () => {
    const md = screenTokens('tv')['--fluid-md']!
    const max = Number(/, ([\d.]+)rem\) \*/.exec(md)![1])
    expect(max * 16 * TYPE_SCALE.tv).toBeGreaterThanOrEqual(24)
  })
})
