import { describe, expect, it } from 'vitest'
import { nextTitle } from '../app/utils/next-title'

describe('nextTitle', () => {
  it('increments the number of the previous retro', () => {
    expect(nextTitle('Sprint 42')).toBe('Sprint 43')
    expect(nextTitle('Retro S12 - Team A')).toBe('Retro S13 - Team A')
    expect(nextTitle('Sprint 9')).toBe('Sprint 10')
  })
  it('counts only the last number', () => {
    expect(nextTitle('Team 2 - Sprint 42')).toBe('Team 2 - Sprint 43')
  })
  it('gives nothing for a dated default or a title without number', () => {
    expect(nextTitle('Retro 01/11')).toBeNull()
    expect(nextTitle('Retro 2026-11-01')).toBeNull()
    expect(nextTitle('Our retro')).toBeNull()
    expect(nextTitle('')).toBeNull()
    expect(nextTitle(null)).toBeNull()
  })
})
