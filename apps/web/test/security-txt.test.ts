import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM build script without type declarations
import { securityTxt } from '../scripts/security-txt.mjs'

const parse = (body: string) =>
  Object.fromEntries(body.trim().split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 2)]))

describe('security.txt (RFC 9116)', () => {
  it('has the required fields and expires one year ahead', () => {
    const now = Date.UTC(2026, 9, 24)
    const fields = parse(securityTxt(now) as string)
    expect(fields.Contact).toMatch(/^https:\/\//)
    expect(Date.parse(fields.Expires!)).toBe(Date.UTC(2027, 9, 24))
    expect(fields.Canonical).toBe('https://retroboard.maoudia.com/.well-known/security.txt')
  })
})
