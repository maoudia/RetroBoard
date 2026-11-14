/**
 * Recovery key (change user-drive-storage): the same master key wrapped a second time with 160 random bits, printed as
 * base32 groups with a check character and as a QR payload. Typing it wrong is detected before any derivation, so a
 * typo says "check the key" instead of "wrong key".
 */
import { BASE32_ALPHABET, fromBase32, toBase32 } from './base32'
import type { Bytes } from './bytes'
import { type KeyWrap, type Unlocked, type VaultInfo, unlockWith, wrapMasterKey } from './kdf'
import { randomBytes } from './primitives'

export const RECOVERY_KEY_BYTES = 20
const KEY_CHARS = 32
const GROUP = 4

const CHECK_CHARS = 2
/** 1,009 is prime and above 32 * 32, so a weight of 1..32 never cancels a change of one value. */
const CHECK_MODULUS = 1009

/** Position-weighted sum mod 1,009 as two base32 characters: catches any single wrong character and any two neighbours swapped. */
function checkChars(chars: string): string {
  let sum = 0
  for (let i = 0; i < chars.length; i++) sum += (i + 1) * BASE32_ALPHABET.indexOf(chars[i]!)
  const n = sum % CHECK_MODULUS
  return BASE32_ALPHABET[n >> 5]! + BASE32_ALPHABET[n & 31]!
}

export interface RecoveryKey {
  readonly bytes: Bytes
  /** `ABCD-EFGH-...-CC`: eight groups of four and the two check characters, to print or copy. */
  readonly text: string
  /** The text for a QR code, a longer string a camera reads without a typo. */
  readonly qr: string
}

export const RECOVERY_QR_PREFIX = 'RBR1:'

/** The printed forms of 160 bits. */
export function recoveryKeyFromBytes(bytes: Bytes): RecoveryKey {
  const chars = toBase32(bytes)
  const groups = chars.match(new RegExp(`.{${GROUP}}`, 'g'))!.map((g) => g.toUpperCase())
  const check = checkChars(chars).toUpperCase()
  return { bytes, text: `${groups.join('-')}-${check}`, qr: `${RECOVERY_QR_PREFIX}${chars.toUpperCase()}${check}` }
}

export const generateRecoveryKey = (): RecoveryKey => recoveryKeyFromBytes(randomBytes(RECOVERY_KEY_BYTES))

export type RecoveryKeyParse = { readonly ok: true; readonly key: RecoveryKey } | { readonly ok: false; readonly reason: 'length' | 'characters' | 'check' }

/** Accepts the printed text (any case, spaces, hyphens) or a QR payload. */
export function parseRecoveryKey(input: string): RecoveryKeyParse {
  const text = (input.startsWith(RECOVERY_QR_PREFIX) ? input.slice(RECOVERY_QR_PREFIX.length) : input).replace(/[\s-]/g, '').toLowerCase()
  if (text.length !== KEY_CHARS + CHECK_CHARS) return { ok: false, reason: 'length' }
  const bytes = fromBase32(text.slice(0, KEY_CHARS))
  if (!bytes) return { ok: false, reason: 'characters' }
  if (checkChars(text.slice(0, KEY_CHARS)) !== text.slice(KEY_CHARS)) return { ok: false, reason: 'check' }
  return { ok: true, key: recoveryKeyFromBytes(bytes) }
}

/** Adds (or replaces) the recovery wrap. The recovery key is returned once, for the person to store. */
export async function addRecoveryWrap(info: VaultInfo, master: Uint8Array, now: number): Promise<{ info: VaultInfo; recoveryKey: RecoveryKey }> {
  const recoveryKey = generateRecoveryKey()
  const wrap: KeyWrap = await wrapMasterKey(master, recoveryKey.bytes, { vaultId: info.vaultId, keyId: info.activeKeyId.value, kind: 'recovery', kdf: { id: 'hkdf-sha256' }, now })
  return { info: { ...info, wraps: [...info.wraps.filter((w) => w.kind !== 'recovery'), wrap] }, recoveryKey }
}

/** `null` for a wrong key; a malformed one is told apart earlier by `parseRecoveryKey`. */
export async function unlockWithRecoveryKey(info: VaultInfo, key: RecoveryKey): Promise<Unlocked | null> {
  return unlockWith(info, 'recovery', key.bytes)
}
