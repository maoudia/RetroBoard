import { formatInvite, type Invite, type KeyRing, parseInvite } from '@retroboard/domain'
import { isLocalRoom } from '~/transport'
import { randomId } from '~/utils/storage'

/** Invite in a location hash; local solo rooms are the only bare ids still accepted. */
export const inviteFromHash = (hash: string): Invite | null =>
  parseInvite(hash, (id) => isLocalRoom(id) && id.length >= 12 && /^[A-Za-z0-9_-]+$/.test(id))

/** A bare shared-room id: an unencrypted link from protocol v1, whose server storage was removed. */
export const isRetiredLink = (hash: string): boolean => {
  const raw = hash.replace(/^#/, '')
  return !isLocalRoom(raw) && /^[A-Za-z0-9_-]{22,64}$/.test(raw)
}

/** A new encrypted room: 128-bit id, 256-bit room key, 256-bit facilitator seed. */
export const newKeyRing = (): KeyRing => ({ roomId: randomId(16), roomKey: randomId(32), facilitatorSecret: randomId(32) })

export const boardHash = (invite: Invite, role: 'participant' | 'facilitator' = 'participant'): string =>
  `#${invite.kind === 'legacy' ? invite.roomId : formatInvite(invite.ring, role === 'facilitator' && invite.ring.facilitatorSecret ? 'facilitator' : 'participant')}`

/** The link participants open: never the facilitator secret, whoever builds it. */
export const participantLink = (invite: Invite, origin: string): string => `${origin}/board${boardHash(invite, 'participant')}`

export const inviteRoomId = (invite: Invite): string => (invite.kind === 'legacy' ? invite.roomId : invite.ring.roomId)
