/**
 * Access bounded context: who can read a board (room key) and who can steer it
 * (facilitator secret). Keys are opaque base64url strings here; the crypto package
 * turns them into bytes. Pure: no I/O, no URL API.
 *
 * Invitation fragment (never sent to the server, RFC 3986 section 3.5):
 *   participant: #r=<roomId>&k=<roomKey>
 *   facilitator: #r=<roomId>&k=<roomKey>&f=<facilitatorSecret>
 *   passcode:    &p=1 is appended when the board needs a passcode (the passcode itself never
 *                travels in a link; it is shared through another channel).
 * Compact form (ADR-0029), for boards whose secrets are 128 bits (22 characters):
 *   participant: #c=<roomId 22><roomKey 22>
 *   facilitator: #c=<roomId 22><roomKey 22><facilitatorSecret 22>
 * Boards made before it keep their 256-bit keys and their long links.
 * A bare #<roomId> is a legacy (protocol v1, unencrypted) link.
 */

export const ROOM_ID_RE = /^[A-Za-z0-9_-]{22,64}$/
/** 32 bytes in base64url without padding. */
export const KEY_RE = /^[A-Za-z0-9_-]{43}$/
/** 16 bytes in base64url without padding: the room key and facilitator secret of boards made since ADR-0029. */
export const SECRET128_RE = /^[A-Za-z0-9_-]{22}$/
const isSecret = (s: string): boolean => KEY_RE.test(s) || SECRET128_RE.test(s)
const COMPACT_RE = /^[A-Za-z0-9_-]+$/

export interface KeyRing {
  readonly roomId: string
  /** 256 bits (43 characters, boards made before ADR-0029) or 128 bits (22 characters). */
  readonly roomKey: string
  /** Present only for the facilitator (and delegated co-facilitators). Same size as the room key. */
  readonly facilitatorSecret?: string
  /** True when the content key also depends on a passcode. */
  readonly passcode?: boolean
}

export type Invite =
  | { readonly kind: 'encrypted'; readonly ring: KeyRing }
  | { readonly kind: 'legacy'; readonly roomId: string }

export const isFacilitatorRing = (ring: KeyRing): boolean => ring.facilitatorSecret !== undefined

/** The ring a participant receives: same room and key, never the facilitator secret. */
export const participantRing = ({ roomId, roomKey, passcode }: KeyRing): KeyRing => (passcode ? { roomId, roomKey, passcode } : { roomId, roomKey })

export function formatInvite(ring: KeyRing, role: 'participant' | 'facilitator' = 'participant'): string {
  if (!ROOM_ID_RE.test(ring.roomId) || !isSecret(ring.roomKey)) throw new Error('invalid key ring')
  const withSecret = role === 'facilitator'
  if (withSecret && (!ring.facilitatorSecret || !isSecret(ring.facilitatorSecret))) throw new Error('missing facilitator secret')
  const tail = ring.passcode ? '&p=1' : ''
  const secret = withSecret ? ring.facilitatorSecret! : ''
  // Compact when every part has its fixed size; anything else keeps the long, labelled form.
  if (ring.roomId.length === 22 && SECRET128_RE.test(ring.roomKey) && (!withSecret || SECRET128_RE.test(secret))) return `c=${ring.roomId}${ring.roomKey}${secret}${tail}`
  return `r=${ring.roomId}&k=${ring.roomKey}${withSecret ? `&f=${secret}` : ''}${tail}`
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
  const p = fields.get('p')
  if (p !== undefined && p !== '1') return null
  const passcode = p ? { passcode: true } : {}

  const compact = fields.get('c')
  if (compact !== undefined) {
    for (const name of fields.keys()) if (name !== 'c' && name !== 'p') return null
    if (!COMPACT_RE.test(compact) || (compact.length !== 44 && compact.length !== 66)) return null
    const facilitatorSecret = compact.slice(44)
    return { kind: 'encrypted', ring: { roomId: compact.slice(0, 22), roomKey: compact.slice(22, 44), ...(facilitatorSecret ? { facilitatorSecret } : {}), ...passcode } }
  }

  const roomId = fields.get('r'); const roomKey = fields.get('k'); const secret = fields.get('f')
  if (!roomId || !ROOM_ID_RE.test(roomId) || !roomKey || !isSecret(roomKey)) return null
  if (secret !== undefined && !isSecret(secret)) return null
  for (const name of fields.keys()) if (!['r', 'k', 'f', 'p'].includes(name)) return null
  return { kind: 'encrypted', ring: { roomId, roomKey, ...(secret === undefined ? {} : { facilitatorSecret: secret }), ...passcode } }
}
