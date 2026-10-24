/**
 * Access bounded context: who can read a board (room key) and who can steer it
 * (facilitator secret). Keys are opaque base64url strings here; the crypto package
 * turns them into bytes. Pure: no I/O, no URL API.
 *
 * Invitation fragment (never sent to the server, RFC 3986 section 3.5):
 *   participant: #r=<roomId>&k=<roomKey>
 *   facilitator: #r=<roomId>&k=<roomKey>&f=<facilitatorSecret>
 * A bare #<roomId> is a legacy (protocol v1, unencrypted) link.
 */

export const ROOM_ID_RE = /^[A-Za-z0-9_-]{22,64}$/
/** 32 bytes in base64url without padding. */
export const KEY_RE = /^[A-Za-z0-9_-]{43}$/

export interface KeyRing {
  readonly roomId: string
  readonly roomKey: string
  /** Present only for the facilitator (and delegated co-facilitators). */
  readonly facilitatorSecret?: string
}

export type Invite =
  | { readonly kind: 'encrypted'; readonly ring: KeyRing }
  | { readonly kind: 'legacy'; readonly roomId: string }

export const isFacilitatorRing = (ring: KeyRing): boolean => ring.facilitatorSecret !== undefined

/** The ring a participant receives: same room and key, never the facilitator secret. */
export const participantRing = ({ roomId, roomKey }: KeyRing): KeyRing => ({ roomId, roomKey })

export function formatInvite(ring: KeyRing, role: 'participant' | 'facilitator' = 'participant'): string {
  if (!ROOM_ID_RE.test(ring.roomId) || !KEY_RE.test(ring.roomKey)) throw new Error('invalid key ring')
  const base = `r=${ring.roomId}&k=${ring.roomKey}`
  if (role === 'participant') return base
  if (!ring.facilitatorSecret || !KEY_RE.test(ring.facilitatorSecret)) throw new Error('missing facilitator secret')
  return `${base}&f=${ring.facilitatorSecret}`
}

/**
 * Parses a location fragment (with or without the leading '#').
 * Returns null for anything malformed: links are untrusted input.
 * `isLegacyRoom` lets the caller accept extra legacy ids (local rooms).
 */
export function parseInvite(fragment: string, isLegacyRoom: (id: string) => boolean = (id) => ROOM_ID_RE.test(id)): Invite | null {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!raw.includes('=')) return isLegacyRoom(raw) ? { kind: 'legacy', roomId: raw } : null

  const fields = new Map<string, string>()
  for (const part of raw.split('&')) {
    const eq = part.indexOf('=')
    if (eq <= 0) return null
    const name = part.slice(0, eq)
    if (fields.has(name)) return null
    fields.set(name, part.slice(eq + 1))
  }
  const roomId = fields.get('r'); const roomKey = fields.get('k'); const secret = fields.get('f')
  if (!roomId || !ROOM_ID_RE.test(roomId) || !roomKey || !KEY_RE.test(roomKey)) return null
  if (secret !== undefined && !KEY_RE.test(secret)) return null
  for (const name of fields.keys()) if (!['r', 'k', 'f'].includes(name)) return null
  return { kind: 'encrypted', ring: secret === undefined ? { roomId, roomKey } : { roomId, roomKey, facilitatorSecret: secret } }
}
