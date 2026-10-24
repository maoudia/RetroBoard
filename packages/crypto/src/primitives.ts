/**
 * WebCrypto primitives (docs/PLAN.md 5.1, change e2e-encrypted-rooms).
 * Every key crossing this boundary is raw bytes, so callers never hold CryptoKey handles
 * and the formats stay portable across browsers and the Worker.
 */
import { type Bytes, concat } from './bytes'
import { curves } from './curves'

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('WebCrypto is not available (secure context required)')
  return s
}

export const KEY_BYTES = 32
export const NONCE_BYTES = 12
/** OWASP 2023 recommendation for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000

export function randomBytes(length: number): Bytes {
  return globalThis.crypto.getRandomValues(new Uint8Array(length))
}

export const randomKey = (): Bytes => randomBytes(KEY_BYTES)

/** HKDF-SHA-256 (RFC 5869). */
export async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length = KEY_BYTES): Promise<Bytes> {
  const key = await subtle().importKey('raw', ikm as Bytes, 'HKDF', false, ['deriveBits'])
  const bits = await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt as Bytes, info: info as Bytes }, key, length * 8)
  return new Uint8Array(bits)
}

/** PBKDF2-HMAC-SHA-256 (RFC 8018), used to stretch a room passcode. */
export async function pbkdf2(secret: Uint8Array, salt: Uint8Array, iterations = PBKDF2_ITERATIONS, length = KEY_BYTES): Promise<Bytes> {
  const key = await subtle().importKey('raw', secret as Bytes, 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as Bytes, iterations }, key, length * 8)
  return new Uint8Array(bits)
}

const aesKey = (key: Uint8Array, usage: KeyUsage) => {
  if (key.length !== KEY_BYTES) throw new Error('AES key must be 32 bytes')
  return subtle().importKey('raw', key as Bytes, 'AES-GCM', false, [usage])
}

/** AES-256-GCM with a random 96-bit nonce. Output: nonce || ciphertext || tag. */
export async function seal(key: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Promise<Bytes> {
  const iv = randomBytes(NONCE_BYTES)
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad as Bytes }, await aesKey(key, 'encrypt'), plaintext as Bytes)
  return concat(iv, new Uint8Array(ct))
}

/** Returns null when the ciphertext, the key or the AAD does not match (tampering or wrong key). */
export async function open(key: Uint8Array, sealed: Uint8Array, aad: Uint8Array): Promise<Bytes | null> {
  if (sealed.length < NONCE_BYTES + 16) return null
  try {
    const pt = await subtle().decrypt(
      { name: 'AES-GCM', iv: sealed.slice(0, NONCE_BYTES), additionalData: aad as Bytes },
      await aesKey(key, 'decrypt'),
      sealed.slice(NONCE_BYTES),
    )
    return new Uint8Array(pt)
  } catch {
    return null
  }
}

export type KeyPair = { readonly publicKey: Bytes; readonly privateKey: Bytes }

const exact = (bytes: Uint8Array, what: string): Bytes => {
  if (bytes.length !== KEY_BYTES) throw new Error(`${what} must be 32 bytes`)
  return new Uint8Array(bytes) as Bytes
}

/** Ed25519 key pair; the private key is the 32-byte RFC 8032 seed. */
export async function signingKeyPair(seed: Uint8Array = randomKey()): Promise<KeyPair> {
  const privateKey = exact(seed, 'Ed25519 private key')
  return { publicKey: await (await curves()).edPublicKey(privateKey), privateKey }
}

export async function sign(privateKey: Uint8Array, message: Uint8Array): Promise<Bytes> {
  return (await curves()).edSign(exact(privateKey, 'Ed25519 private key'), message as Bytes)
}

/** Returns false for a bad signature, a malformed key or a malformed signature. */
export async function verify(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): Promise<boolean> {
  if (publicKey.length !== KEY_BYTES || signature.length !== 64) return false
  try {
    return await (await curves()).edVerify(publicKey as Bytes, signature as Bytes, message as Bytes)
  } catch {
    return false
  }
}

/** X25519 key pair (RFC 7748); the private key is the 32-byte scalar. */
export async function agreementKeyPair(seed: Uint8Array = randomKey()): Promise<KeyPair> {
  const privateKey = exact(seed, 'X25519 private key')
  return { publicKey: await (await curves()).xPublicKey(privateKey), privateKey }
}

/** Raw X25519 shared secret. Rejects all-zero output (low-order public keys). */
export async function x25519(privateKey: Uint8Array, publicKey: Uint8Array): Promise<Bytes> {
  const shared = await (await curves()).xShared(exact(privateKey, 'X25519 private key'), exact(publicKey, 'X25519 public key'))
  if (shared.every((b) => b === 0)) throw new Error('X25519 produced a zero shared secret')
  return shared
}

const SEAL_INFO = new TextEncoder().encode('rb/x25519-seal/v1')

/**
 * Anonymous public-key encryption to one recipient (ECIES-style):
 * ephemeral X25519 + HKDF(salt = ephemeralPub || recipientPub) + AES-GCM.
 * Output: ephemeralPub || nonce || ciphertext || tag.
 */
export async function sealTo(recipientPublicKey: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Promise<Bytes> {
  const eph = await agreementKeyPair()
  const shared = await x25519(eph.privateKey, recipientPublicKey)
  const key = await hkdf(shared, concat(eph.publicKey, recipientPublicKey), SEAL_INFO)
  return concat(eph.publicKey, await seal(key, plaintext, aad))
}

export async function openFrom(recipient: KeyPair, sealed: Uint8Array, aad: Uint8Array): Promise<Bytes | null> {
  if (sealed.length < KEY_BYTES) return null
  const ephPub = sealed.slice(0, KEY_BYTES)
  try {
    const shared = await x25519(recipient.privateKey, ephPub)
    const key = await hkdf(shared, concat(ephPub, recipient.publicKey), SEAL_INFO)
    return await open(key, sealed.slice(KEY_BYTES), aad)
  } catch {
    return null
  }
}
