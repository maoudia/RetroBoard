import { describe, expect, it } from 'vitest'
import { boardHash, hashFromScan, inviteFromHash, newKeyRing, participantLink } from '../app/utils/invite'

describe('board links', () => {
  const invite = { kind: 'encrypted' as const, ring: newKeyRing() }

  it('uses the /boards path, a compact fragment and never carries the facilitator secret', () => {
    const link = participantLink(invite, 'https://retroboard.maoudia.com')
    expect(link.startsWith('https://retroboard.maoudia.com/boards#c=')).toBe(true)
    expect(link.split('#')[1]).toHaveLength(46)
    expect(link).not.toContain(invite.ring.facilitatorSecret)
  })

  it('makes 128-bit secrets, and reads the compact link back for both roles', () => {
    expect(invite.ring.roomKey).toHaveLength(22)
    expect(invite.ring.facilitatorSecret).toHaveLength(22)
    expect(inviteFromHash(boardHash(invite, 'facilitator'))).toEqual(invite)
  })

  it('reads the board from the hash alone, so the path of an older link does not matter', () => {
    const hash = boardHash(invite, 'participant')
    expect(inviteFromHash(hash)).toMatchObject({ kind: 'encrypted', ring: { roomId: invite.ring.roomId, roomKey: invite.ring.roomKey } })
  })

  it('takes the board hash out of a scanned QR code, and nothing else', () => {
    const link = participantLink(invite, 'https://retroboard.maoudia.com')
    expect(hashFromScan(link)).toBe(boardHash(invite, 'participant'))
    expect(hashFromScan(`  ${link}  `)).toBe(boardHash(invite, 'participant'))
    expect(hashFromScan(boardHash(invite, 'participant'))).toBe(boardHash(invite, 'participant'))
    for (const text of ['', 'https://example.com', 'https://example.com/#hello', 'RB-7KQ2M9', 'WIFI:T:WPA;S:x;P:y;;', `${link}&x=1`]) expect(hashFromScan(text)).toBeNull()
  })
})
