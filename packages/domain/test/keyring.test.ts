import { describe, expect, it } from 'vitest'
import { formatInvite, isFacilitatorRing, KEY_RE, type KeyRing, movedRing, parseInvite, participantRing, signingRoom } from '../src'

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

describe('keys and links, exactly', () => {
  it('a 256-bit key is exactly 43 base64url characters', () => {
    const k = 'k'.repeat(43)
    expect(KEY_RE.test(k)).toBe(true)
    for (const bad of [`!${k}`, `${k}!`, k.slice(1), `${k}k`, `${k.slice(1)}+`]) expect(KEY_RE.test(bad), bad).toBe(false)
  })

  it('names the problem when a ring cannot be turned into a link', () => {
    expect(() => formatInvite({ roomId: 'x', roomKey })).toThrow('invalid key ring')
    expect(() => formatInvite({ roomId, roomKey }, 'facilitator')).toThrow('missing facilitator secret')
  })

  it('reads a participant link into a ring that has no facilitator secret at all, not even an empty one', () => {
    const ring = (parseInvite(formatInvite(full)) as { ring: KeyRing }).ring
    expect(Object.keys(ring).sort()).toEqual(['roomId', 'roomKey'])
    const compact = (parseInvite(`c=${roomId}${'k'.repeat(21)}A`) as { ring: KeyRing }).ring
    expect(Object.keys(compact).sort()).toEqual(['roomId', 'roomKey'])
  })

  it('refuses a part with no name or no equals sign', () => {
    for (const bad of [`=${roomKey}`, `r=${roomId}&${roomKey}`, `r=${roomId}&k=${roomKey}&f`, `${roomId}&k=${roomKey}`]) expect(parseInvite(bad), bad).toBeNull()
  })
})


describe('moved board (ADR-0034)', () => {
  const room2 = 'Zz9dEfGhIjKlMnOpQrStUv'
  const key2 = 'm'.repeat(21) + 'B'
  const compactFull: KeyRing = { roomId, roomKey: 'k'.repeat(21) + 'A', facilitatorSecret: 'f'.repeat(21) + 'Q' }

  it('signs for its own room unless the ring names another', () => {
    expect(signingRoom(full)).toBe(roomId)
    expect(signingRoom({ roomId: room2, signRoomId: roomId })).toBe(roomId)
  })

  it('moves to a new room and key, keeping the facilitator secret, the passcode flag and the signing room of the first room', () => {
    const moved = movedRing({ ...compactFull, passcode: true }, { roomId: room2, roomKey: key2 })
    expect(moved).toEqual({ roomId: room2, roomKey: key2, facilitatorSecret: compactFull.facilitatorSecret, passcode: true, signRoomId: roomId })
    // Moving again keeps the first room as the signing room, however many times the board moves.
    const third = movedRing(moved, { roomId: 'Yy9dEfGhIjKlMnOpQrStUv', roomKey: 'n'.repeat(21) + 'C' })
    expect(third.signRoomId).toBe(roomId)
    expect(Object.keys(movedRing({ roomId, roomKey }, { roomId: room2, roomKey: key2 })).sort()).toEqual(['roomId', 'roomKey', 'signRoomId'])
  })

  it('writes the signing room as d and reads it back, for participants and facilitators, with a passcode too', () => {
    const moved = movedRing({ ...compactFull, passcode: true }, { roomId: room2, roomKey: key2 })
    const link = formatInvite(participantRing(moved))
    expect(link).toBe(`r=${room2}&k=${key2}&d=${roomId}&p=1`)
    expect(link).not.toContain(compactFull.facilitatorSecret!)
    expect(parseInvite(link)).toEqual({ kind: 'encrypted', ring: { roomId: room2, roomKey: key2, passcode: true, signRoomId: roomId } })
    expect(parseInvite(formatInvite(moved, 'facilitator'))).toEqual({ kind: 'encrypted', ring: moved })
    expect(participantRing(moved)).not.toHaveProperty('facilitatorSecret')
    expect(participantRing(moved).signRoomId).toBe(roomId)
  })

  it('never uses the compact syntax for a moved board, and refuses to mix it with d', () => {
    const moved = movedRing(compactFull, { roomId: room2, roomKey: key2 })
    expect(formatInvite(moved)).toMatch(/^r=/)
    expect(formatInvite(compactFull)).toMatch(/^c=/)
    expect(parseInvite(`c=${room2}${key2}&d=${roomId}`)).toBeNull()
  })

  it('refuses a malformed or repeated signing room', () => {
    expect(parseInvite(`r=${room2}&k=${key2}&d=short`)).toBeNull()
    expect(parseInvite(`r=${room2}&k=${key2}&d=${roomId}&d=${roomId}`)).toBeNull()
    expect(() => formatInvite({ roomId: room2, roomKey: key2, signRoomId: 'short' })).toThrow('invalid key ring')
  })
})
