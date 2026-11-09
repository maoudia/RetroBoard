import { describe, expect, it } from 'vitest'
import { topKeywords, trimTrailingJoiners } from '../src/read-models/keywords'

describe('trimTrailingJoiners', () => {
  it('drops trailing apostrophes and hyphens only', () => {
    expect(trimTrailingJoiners("rock'n'")).toBe("rock'n")
    expect(trimTrailingJoiners('well-')).toBe('well')
    expect(trimTrailingJoiners("a-'-'")).toBe('a')
    expect(trimTrailingJoiners("don't")).toBe("don't")
    expect(trimTrailingJoiners('-')).toBe('')
    expect(trimTrailingJoiners('')).toBe('')
  })

  it('stays fast on a very long run of apostrophes', () => {
    const t = Date.now()
    expect(trimTrailingJoiners(`a${"'".repeat(200_000)}`)).toBe('a')
    expect(Date.now() - t).toBeLessThan(200)
  })

  it('keeps topKeywords counting the same words', () => {
    const k = topKeywords(["retros' end", 'retros start'], { minNotes: 2 })
    expect(k.map((x) => x.word)).toContain('retros')
  })
})
