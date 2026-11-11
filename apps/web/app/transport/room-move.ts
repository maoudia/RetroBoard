/**
 * Move to a fresh link (change facilitator-moderation, ADR-0035), the parts that need no I/O.
 *
 * The facilitator sends each remaining participant one `room.moved` frame in the old room. The frame is encrypted with the
 * old room key like any live frame, so a removed participant (who still holds that key) can open the outside of it; what
 * matters is inside: the new link, sealed to the recipient's X25519 key with the existing `sealTo`, together with a signature
 * of the lead facilitator over the link, the recipient and the signing domain. Without the signature a removed person could
 * send the team to a room they control.
 */
import { fromBase64Url, fromUtf8, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'
import type { SignerPort, VerifierPort } from '@retroboard/application'
import { type KeyRing, type Ledger, parseInvite, signingRoom } from '@retroboard/domain'
import type { Presence } from '@retroboard/protocol'

const INFO = 'rb/room-moved/v1'

/** The recipient's side of the sealing: its X25519 public key, and opening what was sealed to it. */
export interface SessionAgreement {
  readonly publicKey: string
  open(sealed: Uint8Array, aad: Uint8Array): Promise<Uint8Array | null>
}

/** What is sealed to a participant. */
interface MovedPayload { readonly link: string; readonly by: string; readonly sig: string }

/** Bound to the old room, so a frame sealed in one room never means anything in another. */
const aadOf = (fromRoom: string): Uint8Array => utf8(`${INFO}|${fromRoom}`)

/** What the facilitator signs: the signing domain, the recipient and the link (the hash after `#`). */
export const movedMessage = (domain: string, recipientKey: string, link: string): string => `${INFO}\n${domain}\n${recipientKey}\n${link}`

/** Who gets a frame: the participants present when the move started, never a removed, hidden or key-less one, never me. */
export interface Recipient { readonly conn: string; readonly xkey: string }

export function moveRecipients(
  ledger: Pick<Ledger, 'removed' | 'hidden'>,
  presence: ReadonlyMap<string, Presence>,
  roster: ReadonlySet<string>,
  me: { readonly conn: string | null; readonly key: string },
  removing: string | null,
): Recipient[] {
  const out: Recipient[] = []
  for (const conn of roster) {
    const p = presence.get(conn)
    if (!p || conn === me.conn || !p.key || !p.xkey || p.key === me.key) continue
    if (p.key === removing || ledger.removed.includes(p.key) || ledger.hidden.includes(p.key)) continue
    out.push({ conn, xkey: p.xkey })
  }
  return out
}

/** One frame for one recipient: the ciphertext of its `room.moved` envelope. Null when the key is not a valid X25519 key. */
export async function sealMoved(signer: SignerPort, fromRoom: string, ring: KeyRing, recipient: Recipient, link: string): Promise<string | null> {
  const pub = fromBase64Url(recipient.xkey)
  if (!pub || pub.length !== 32) return null
  const sig = await signer.sign(movedMessage(signingRoom(ring), recipient.xkey, link))
  const payload: MovedPayload = { link, by: signer.publicKey, sig }
  return toBase64Url(await sealTo(pub, utf8(JSON.stringify(payload)), aadOf(fromRoom)))
}

export interface OpenedMove { readonly ring: KeyRing; readonly hash: string }

/**
 * A participant opens a frame addressed to it. Everything is checked; anything wrong is a null and leaves no trace:
 * sealed to my key for this room, signed by the lead of my ledger, a link to another room of the same signing domain,
 * for participants (no facilitator secret).
 */
export async function openMoved(
  me: SessionAgreement,
  verifier: VerifierPort,
  fromRoom: string,
  domain: string,
  leads: (key: string) => boolean,
  ct: string,
): Promise<OpenedMove | null> {
  const sealed = fromBase64Url(ct)
  const plain = sealed && await me.open(sealed, aadOf(fromRoom))
  if (!plain) return null
  let payload: unknown
  try { payload = JSON.parse(fromUtf8(plain)) } catch { return null }
  if (typeof payload !== 'object' || payload === null) return null
  const { link, by, sig } = payload as Partial<MovedPayload>
  if (typeof link !== 'string' || typeof by !== 'string' || typeof sig !== 'string' || !leads(by)) return null
  if (!await verifier.verify(by, sig, movedMessage(domain, me.publicKey, link))) return null
  const invite = parseInvite(link)
  if (invite?.kind !== 'encrypted') return null
  const { ring } = invite
  if (ring.signRoomId !== domain || ring.roomId === fromRoom || ring.facilitatorSecret !== undefined) return null
  return { ring, hash: link }
}
