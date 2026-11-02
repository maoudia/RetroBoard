import { formatInvite, type Invite, type KeyRing, parseInvite } from '@retroboard/domain'
import { randomId } from '~/utils/storage'

/** Invite in a location hash. Bare ids (protocol v1 and the old in-tab solo boards) are no longer boards. */
export const inviteFromHash = (hash: string): Invite | null => parseInvite(hash, () => false)

/** A bare shared-room id: an unencrypted link from protocol v1, whose server storage was removed. */
export const isRetiredLink = (hash: string): boolean => {
  const raw = hash.replace(/^#/, '')
  return /^[A-Za-z0-9_-]{22,64}$/.test(raw)
}

/** A new encrypted room: 128-bit id, 256-bit room key, 256-bit facilitator seed. */
export const newKeyRing = (): KeyRing => ({ roomId: randomId(16), roomKey: randomId(32), facilitatorSecret: randomId(32) })

export const boardHash = (invite: Invite, role: 'participant' | 'facilitator' = 'participant'): string =>
  `#${invite.kind === 'legacy' ? invite.roomId : formatInvite(invite.ring, role === 'facilitator' && invite.ring.facilitatorSecret ? 'facilitator' : 'participant')}`

/** The link participants open: never the facilitator secret, whoever builds it. */
export const participantLink = (invite: Invite, origin: string): string => `${origin}/board${boardHash(invite, 'participant')}`

export const inviteRoomId = (invite: Invite): string => (invite.kind === 'legacy' ? invite.roomId : invite.ring.roomId)
