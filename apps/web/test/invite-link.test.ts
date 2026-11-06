import { describe, expect, it } from 'vitest'
import { boardHash, inviteFromHash, newKeyRing, participantLink } from '../app/utils/invite'

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
})
