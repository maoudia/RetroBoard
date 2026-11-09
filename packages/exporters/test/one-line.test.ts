import { describe, expect, it } from 'vitest'
import { oneLine } from '../src'

describe('oneLine', () => {
  it('joins lines with one space and trims', () => {
    expect(oneLine('a\nb')).toBe('a b')
    expect(oneLine('a \n  b')).toBe('a b')
    expect(oneLine('a\n\n \nb')).toBe('a b')
    expect(oneLine('\n  a  \n')).toBe('a')
    expect(oneLine('a\r\nb')).toBe('a b')
  })

  it('leaves inner spaces of a line alone', () => {
    expect(oneLine('a  b')).toBe('a  b')
    expect(oneLine('  a  b  ')).toBe('a  b')
    expect(oneLine('')).toBe('')
  })

  it('stays fast on a very long run of spaces', () => {
    const t = Date.now()
    expect(oneLine(`a${' '.repeat(200_000)}b`)).toBe(`a${' '.repeat(200_000)}b`)
    expect(oneLine(`${' '.repeat(200_000)}x`)).toBe('x')
    expect(Date.now() - t).toBeLessThan(200)
  })
})
