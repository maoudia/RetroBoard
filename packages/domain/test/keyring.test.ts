import { describe, expect, it } from 'vitest'
import { formatInvite, isFacilitatorRing, type KeyRing, parseInvite, participantRing } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const roomKey = 'k'.repeat(42) + 'A'
const facilitatorSecret = 'f'.repeat(42) + 'Q'
const full: KeyRing = { roomId, roomKey, facilitatorSecret }

describe('invite links', () => {
  it('participant link never contains the facilitator secret', () => {
    const link = formatInvite(full)
    expect(link).toBe(`r=${roomId}&k=${roomKey}`)
    expect(link).not.toContain(facilitatorSecret)
    expect(formatInvite(participantRing(full), 'participant')).toBe(link)
    expect(participantRing(full)).not.toHaveProperty('facilitatorSecret')
  })

  it('facilitator link round-trips', () => {
    const link = formatInvite(full, 'facilitator')
    expect(parseInvite(`#${link}`)).toEqual({ kind: 'encrypted', ring: full })
    expect(isFacilitatorRing(full)).toBe(true)
    expect(isFacilitatorRing(participantRing(full))).toBe(false)
  })

  it('participant link round-trips without the f field', () => {
    expect(parseInvite(formatInvite(full))).toEqual({ kind: 'encrypted', ring: { roomId, roomKey } })
  })

  it('accepts legacy bare room ids, including caller-defined local ones', () => {
    expect(parseInvite(`#${roomId}`)).toEqual({ kind: 'legacy', roomId })
    expect(parseInvite('#local-abc')).toBeNull()
    expect(parseInvite('#local-abc', (id) => id.startsWith('local-'))).toEqual({ kind: 'legacy', roomId: 'local-abc' })
  })

  it.each([
    '', '#', 'r=short&k=' + roomKey, `r=${roomId}`, `r=${roomId}&k=short`, `r=${roomId}&k=${roomKey}&f=bad`,
    `r=${roomId}&k=${roomKey}&x=1`, `r=${roomId}&k=${roomKey}&k=${roomKey}`, `r=${roomId}&&k=${roomKey}`,
    `r=${roomId}&k=${roomKey.slice(1)}+`, '=abc', `r=${roomId}/../x&k=${roomKey}`,
  ])('rejects malformed fragment %j', (fragment) => {
    expect(parseInvite(fragment)).toBeNull()
  })

  it('flags a passcode in the link without carrying it', () => {
    const ring: KeyRing = { ...full, passcode: true }
    expect(formatInvite(ring)).toBe(`r=${roomId}&k=${roomKey}&p=1`)
    expect(parseInvite(formatInvite(ring, 'facilitator'))).toEqual({ kind: 'encrypted', ring })
    expect(participantRing(ring)).toEqual({ roomId, roomKey, passcode: true })
    expect(parseInvite(`r=${roomId}&k=${roomKey}&p=0`)).toBeNull()
  })

  it('refuses to format invalid rings', () => {
    expect(() => formatInvite({ roomId: 'x', roomKey })).toThrow()
    expect(() => formatInvite({ roomId, roomKey: 'x' })).toThrow()
    expect(() => formatInvite({ roomId, roomKey }, 'facilitator')).toThrow(/facilitator/)
    expect(() => formatInvite({ roomId, roomKey, facilitatorSecret: 'x' }, 'facilitator')).toThrow()
  })
})

describe('compact links (ADR-0029)', () => {
  const key128 = 'k'.repeat(21) + 'A'
  const secret128 = 'f'.repeat(21) + 'Q'
  const compact: KeyRing = { roomId, roomKey: key128, facilitatorSecret: secret128 }

  it('is shorter than the long form, positional, and never carries the facilitator secret for a participant', () => {
    const link = formatInvite(compact)
    expect(link).toBe(`c=${roomId}${key128}`)
    expect(link.length).toBe(46)
    expect(link).not.toContain(secret128)
    expect(formatInvite(compact, 'facilitator')).toBe(`c=${roomId}${key128}${secret128}`)
    expect(formatInvite(compact, 'facilitator').length).toBe(68)
  })

  it('round-trips for both roles and with a passcode flag', () => {
    expect(parseInvite(`#${formatInvite(compact)}`)).toEqual({ kind: 'encrypted', ring: { roomId, roomKey: key128 } })
    expect(parseInvite(formatInvite(compact, 'facilitator'))).toEqual({ kind: 'encrypted', ring: compact })
    const withCode: KeyRing = { ...compact, passcode: true }
    expect(formatInvite(withCode)).toBe(`c=${roomId}${key128}&p=1`)
    expect(parseInvite(formatInvite(withCode, 'facilitator'))).toEqual({ kind: 'encrypted', ring: withCode })
  })

  it('keeps the long form when a part has another size, and reads both forms of the same ring', () => {
    const long: KeyRing = { roomId: 'x'.repeat(30), roomKey: key128 }
    expect(formatInvite(long)).toBe(`r=${'x'.repeat(30)}&k=${key128}`)
    expect(parseInvite(formatInvite(long))).toEqual({ kind: 'encrypted', ring: long })
    expect(formatInvite({ roomId, roomKey: key128, facilitatorSecret: roomKey }, 'facilitator')).toBe(`r=${roomId}&k=${key128}&f=${roomKey}`)
    expect(parseInvite(`r=${roomId}&k=${key128}&f=${secret128}`)).toEqual({ kind: 'encrypted', ring: compact })
  })

  it('does not take a compact link for a legacy bare room id', () => {
    expect(parseInvite(`#${roomId}${key128}`)).toMatchObject({ kind: 'legacy' })
    expect(parseInvite(`#c=${roomId}${key128}`)).toMatchObject({ kind: 'encrypted' })
  })

  it.each([
    'c=', `c=${roomId}`, `c=${roomId}${key128}x`, `c=${roomId}${key128}${secret128}x`, `c=${roomId}${key128}${secret128}${secret128}`,
    `c=${roomId}${key128.slice(1)}+`, `c=${roomId}${key128}&k=${key128}`, `c=${roomId}${key128}&r=${roomId}`, `c=${roomId}${key128}&x=1`,
    `c=${roomId}${key128}&c=${roomId}${key128}`, `c=${roomId}${key128}&p=0`, `c=${roomId}/${key128.slice(1)}`,
  ])('rejects malformed compact fragment %j', (fragment) => {
    expect(parseInvite(fragment)).toBeNull()
  })
})
