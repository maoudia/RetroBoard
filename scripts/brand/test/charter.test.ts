import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrast, getTheme } from '@retroboard/themes'

// The brand charter is the Studio theme written down (change brand-identity): every colour it quotes is a token of the theme.
const charter = readFileSync('docs/brand.md', 'utf8')
const studio = getTheme('studio')

const variants = { light: studio.tokens, dark: studio.alt } as const
const value = (variant: 'light' | 'dark', token: string): string | undefined => {
  if (token === 'note-1') return studio.noteColors[0]
  return (variants[variant] as unknown as Record<string, string>)[token]
}

const cells = (line: string): string[] => line.split('|').slice(1, -1).map((c) => c.trim().replaceAll('`', ''))
const colourRows = charter.split('\n').filter((l) => /^\|.*\|\s*`#[0-9a-f]{6}/i.test(l)).map(cells)

describe('the brand charter colour table', () => {
  it('lists the colours', () => {
    expect(colourRows.length).toBeGreaterThanOrEqual(8)
  })

  it.each(colourRows)('%s: the quoted values are the Studio tokens', (name, token, light, dark) => {
    expect(value('light', token!), `${name} light`).toBe(light)
    expect(value('dark', token!), `${name} dark`).toBe(dark)
  })

  it.each(colourRows)('%s: the text pair reaches 4.5:1 and the quoted ratio is right', (name, _token, _light, _dark, pair, ratios) => {
    const m = /^(\S+) on (\S+)$/.exec(pair!)
    expect(m, `${name}: pair "${pair}"`).not.toBeNull()
    const quoted = ratios!.split('/').map((r) => r.trim())
    ;(['light', 'dark'] as const).forEach((variant, i) => {
      const fg = value(variant, m![1]!)
      const bg = value(variant, m![2]!)
      expect(fg && bg, `${name}: tokens of "${pair}"`).toBeTruthy()
      const ratio = contrast(fg!, bg!)
      expect(ratio, `${name} ${variant}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio.toFixed(2), `${name} ${variant} quoted ratio`).toBe(quoted[i])
    })
  })
})
