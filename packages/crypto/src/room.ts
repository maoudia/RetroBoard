/** Room key schedule (change e2e-encrypted-rooms, design "Key derivation"). */
import { type Bytes, concat, utf8 } from './bytes'
import { hkdf, pbkdf2 } from './primitives'

/**
 * contentKey = HKDF(ikm = roomKey, salt = roomId, info = "rb/content/v1" || stretch)
 * stretch = PBKDF2(passcode, salt = roomId, 600k) when a passcode is set, empty otherwise.
 */
export async function deriveContentKey(roomKey: Uint8Array, roomId: string, passcode?: string, iterations?: number): Promise<Bytes> {
  const stretch = passcode ? await pbkdf2(utf8(passcode.normalize('NFKC')), utf8(roomId), iterations) : new Uint8Array()
  return hkdf(roomKey, utf8(roomId), concat(utf8('rb/content/v1'), stretch))
}

/**
 * Ed25519 seed of a 128-bit facilitator secret (ADR-0029). A 256-bit secret from an older board is the seed itself and
 * never goes through here.
 */
export const deriveFacilitatorSeed = (secret: Uint8Array): Promise<Bytes> => hkdf(secret, new Uint8Array(), utf8('rb/facilitator/v1'))

/** Board file key: bound to the content key (so to the passcode too) and to the room. */
export const deriveFileKey = (contentKey: Uint8Array, roomId: string): Promise<Bytes> =>
  hkdf(contentKey, utf8(roomId), utf8('rb/file/v1'))
