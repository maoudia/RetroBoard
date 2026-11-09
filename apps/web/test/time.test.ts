import { describe, expect, it } from 'vitest'
import { formatClock } from '../app/utils/time'

const at = Date.UTC(2026, 10, 8, 23, 7)
const local = (h: number, m: number) => new Date(2026, 10, 8, h, m).getTime()

describe('formatClock', () => {
  it('uses a 12 hour clock where the language does (en) and a 24 hour clock where it does not (fr)', () => {
    expect(formatClock(local(23, 7), 'en-US')).toMatch(/^11:07\s?PM$/)
    expect(formatClock(local(23, 7), 'fr-FR')).toBe('23:07')
    expect(formatClock(local(9, 5), 'fr-FR')).toBe('09:05')
    expect(formatClock(local(9, 5), 'en-US')).toMatch(/^09:05\s?AM$/)
  })

  it('is the same for the same instant, whatever the locale object it is given', () => {
    expect(formatClock(at, 'en')).toBe(formatClock(at, 'en-US'))
  })
})
