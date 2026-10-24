/**
 * Signed board events: the bridge between the wire (signature over canonical bytes)
 * and the domain fold (which trusts `author` because this layer verified it).
 */
import type { EventBody, VerifiedEvent } from '@retroboard/domain'
import type { SignerPort, VerifierPort } from '../ports/signing'

export interface SignedEvent extends VerifiedEvent {
  readonly sig: string
}

/** Deterministic JSON: object keys sorted, undefined dropped, so every peer signs the same bytes. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`
}

/** Domain separation: a signature is bound to its room and to this message kind. */
export const signedMessage = (roomId: string, e: Pick<VerifiedEvent, 'id' | 'at' | 'author' | 'body'>): string =>
  `rb/event/v1\n${roomId}\n${canonicalJson({ id: e.id, at: e.at, author: e.author, body: e.body })}`

export async function signEvent(signer: SignerPort, roomId: string, e: { id: string; at: number; body: EventBody }): Promise<SignedEvent> {
  const unsigned = { ...e, author: signer.publicKey }
  return { ...unsigned, sig: await signer.sign(signedMessage(roomId, unsigned)) }
}

/** Returns the event without its signature when valid, null otherwise. */
export async function verifyEvent(verifier: VerifierPort, roomId: string, e: SignedEvent): Promise<VerifiedEvent | null> {
  const { sig, ...event } = e
  return (await verifier.verify(e.author, sig, signedMessage(roomId, event))) ? event : null
}
