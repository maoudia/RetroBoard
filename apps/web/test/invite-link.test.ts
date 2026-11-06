import { describe, expect, it } from 'vitest'
import { boardHash, inviteFromHash, newKeyRing, participantLink } from '../app/utils/invite'

describe('board links', () => {
  const invite = { kind: 'encrypted' as const, ring: newKeyRing() }

  it('uses the /boards path and never carries the facilitator secret', () => {
    const link = participantLink(invite, 'https://retroboard.maoudia.com')
    expect(link.startsWith('https://retroboard.maoudia.com/boards#')).toBe(true)
    expect(link).not.toContain(invite.ring.facilitatorSecret)
  })

  it('reads the board from the hash alone, so the path of an older link does not matter', () => {
    const hash = boardHash(invite, 'participant')
    expect(inviteFromHash(hash)).toMatchObject({ kind: 'encrypted', ring: { roomId: invite.ring.roomId, roomKey: invite.ring.roomKey } })
  })
})
