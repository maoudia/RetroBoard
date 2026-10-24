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

  it('refuses to format invalid rings', () => {
    expect(() => formatInvite({ roomId: 'x', roomKey })).toThrow()
    expect(() => formatInvite({ roomId, roomKey: 'x' })).toThrow()
    expect(() => formatInvite({ roomId, roomKey }, 'facilitator')).toThrow(/facilitator/)
    expect(() => formatInvite({ roomId, roomKey, facilitatorSecret: 'x' }, 'facilitator')).toThrow()
  })
})
