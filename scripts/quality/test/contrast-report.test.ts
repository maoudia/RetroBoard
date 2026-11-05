import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { renderReport } from '../contrast-report.mjs'

describe('contrast report', () => {
  it('puts failing combinations first and names the offenders', () => {
    const md: string = renderReport([
      { theme: 'studio', variant: 'light', violations: [] },
      { theme: 'cyber', variant: 'dark', violations: [{ id: 'color-contrast', target: '.chip' }, { id: 'color-contrast', target: '.hint' }] },
    ])
    expect(md).toContain('2 theme and variant combinations, 1 with a violation')
    expect(md.indexOf('cyber')).toBeLessThan(md.indexOf('studio'))
    expect(md).toContain('2 fail')
    expect(md).toContain('`.chip`, `.hint`')
  })
})
