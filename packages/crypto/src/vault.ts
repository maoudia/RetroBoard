/**
 * Vault object format and key schedule (change user-drive-storage, ADR-0039).
 *
 * An object is a plaintext header, then AES-256-GCM chunks:
 *   header  = magic "RBOB" | version u8 | cipher u8 | key id (8 bytes) | salt (16) | plaintext chunk size u32   (34 bytes)
 *   chunk i = AES-GCM(key = HKDF(streamKey, salt), nonce = counter i, aad = header hash | i | final | path class | stream)
 * The plaintext is `length u32 | data | zeros`, sized so that the whole object is a power of two of at least 1 KiB:
 * a target sees buckets, not exact lengths. Truncation, reordering and moving an object to another stream or path
 * class all fail authentication. The plaintext chunk size is 64 KiB minus the tag, so a stored chunk is exactly 64 KiB
 * and the last chunk always fits whatever the padded size is.
 */
import { toBase32 } from './base32'
import { type Bytes, concat, equalBytes, fromHex, toHex, utf8 } from './bytes'
import { hkdf, randomBytes } from './primitives'
import { subtle } from './webcrypto'

export const OBJECT_MAGIC = utf8('RBOB')
export const OBJECT_VERSION = 1
export const CIPHER_AES_256_GCM = 1
export const KEY_ID_BYTES = 8
export const SALT_BYTES = 16
export const HEADER_BYTES = 34
const TAG_BYTES = 16
/** Stored chunk = 65,536 bytes: 65,520 of plaintext and the tag. */
export const CHUNK_PLAINTEXT = 65_536 - TAG_BYTES
export const MIN_OBJECT_BYTES = 1024
/** A guard against absurd sizes: segments stay under 4 MiB and checkpoints are far from this. */
export const MAX_OBJECT_DATA = 256 * 1024 * 1024

/** What an object is for: part of the authenticated data, so a segment cannot pass for a manifest or a checkpoint. */
export type PathClass = 'seg' | 'chk' | 'man'
const PATH_CLASSES: readonly PathClass[] = ['seg', 'chk', 'man']

export interface ObjectBinding {
  readonly pathClass: PathClass
  /** The stream id as it appears in the path (the keyed hash, never the plain name); empty for a manifest. */
  readonly stream: string
}

export interface ObjectHeader {
  readonly keyId: string
  readonly salt: Bytes
  readonly chunkSize: number
}

const u32 = (n: number): Bytes => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
const aesKey = (raw: Bytes, usage: KeyUsage) => subtle().importKey('raw', raw, 'AES-GCM', false, [usage])

/** The stored size of an object that carries `dataLength` bytes: the smallest power of two, at least 1 KiB, that holds it. */
export function paddedSize(dataLength: number): number {
  const need = dataLength + 4
  for (let size = MIN_OBJECT_BYTES; size <= 2 ** 31; size *= 2) {
    if (capacity(size) >= need) return size
  }
  throw new Error('object too large')
}

const chunkCount = (size: number) => Math.ceil((size - HEADER_BYTES) / (CHUNK_PLAINTEXT + TAG_BYTES))
const capacity = (size: number) => size - HEADER_BYTES - TAG_BYTES * chunkCount(size)

const isPowerOfTwo = (n: number) => n >= MIN_OBJECT_BYTES && (n & (n - 1)) === 0

function header(keyId: Bytes, salt: Bytes): Bytes {
  return concat(OBJECT_MAGIC, new Uint8Array([OBJECT_VERSION, CIPHER_AES_256_GCM]), keyId, salt, u32(CHUNK_PLAINTEXT))
}

/** Parses the plaintext header, or null when the bytes are not an object of a format this build reads. */
export function readObjectHeader(bytes: Uint8Array): ObjectHeader | null {
  if (bytes.length < HEADER_BYTES) return null
  if (!equalBytes(bytes.subarray(0, 4), OBJECT_MAGIC) || bytes[4] !== OBJECT_VERSION || bytes[5] !== CIPHER_AES_256_GCM) return null
  const chunkSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(30)
  if (chunkSize !== CHUNK_PLAINTEXT) return null
  return { keyId: toHex(bytes.subarray(6, 6 + KEY_ID_BYTES)), salt: bytes.slice(14, 14 + SALT_BYTES), chunkSize }
}

async function objectKey(streamKey: Uint8Array, salt: Uint8Array): Promise<Bytes> {
  return hkdf(streamKey, salt, utf8('rb/object/v1'))
}

async function chunkAad(head: Bytes, binding: ObjectBinding, index: number, final: boolean): Promise<Bytes> {
  const headHash = new Uint8Array(await subtle().digest('SHA-256', head))
  const stream = utf8(binding.stream)
  if (stream.length > 255) throw new Error('stream id too long')
  const cls = utf8(binding.pathClass)
  return concat(utf8('rb/object-aad/v1'), headHash, u32(index), new Uint8Array([final ? 1 : 0, cls.length]), cls, new Uint8Array([stream.length]), stream)
}

/** Counter nonce: the key is unique to the object (random salt), so the chunk index alone never repeats under it. */
const nonce = (index: number): Bytes => { const n = new Uint8Array(12); new DataView(n.buffer).setUint32(8, index); return n }

/**
 * Seals `data` as one object. `keyId` names the master key the stream key came from (hex, 8 bytes). `salt` is for tests
 * with fixed vectors; production draws 128 random bits per object.
 */
export async function sealObject(streamKey: Uint8Array, keyId: string, binding: ObjectBinding, data: Uint8Array, salt: Bytes = randomBytes(SALT_BYTES)): Promise<Bytes> {
  if (data.length > MAX_OBJECT_DATA) throw new Error('object too large')
  const id = fromHex(keyId)
  if (id.length !== KEY_ID_BYTES || salt.length !== SALT_BYTES) throw new Error('bad key id or salt')
  const head = header(id, salt)
  const size = paddedSize(data.length)
  const plain = new Uint8Array(capacity(size))
  plain.set(u32(data.length), 0)
  plain.set(data, 4)
  const key = await aesKey(await objectKey(streamKey, salt), 'encrypt')
  const count = chunkCount(size)
  const parts: Uint8Array[] = [head]
  for (let i = 0; i < count; i++) {
    const final = i === count - 1
    const slice = plain.subarray(i * CHUNK_PLAINTEXT, final ? plain.length : (i + 1) * CHUNK_PLAINTEXT)
    parts.push(new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: nonce(i), additionalData: await chunkAad(head, binding, i, final) }, key, slice as Bytes)))
  }
  return concat(...parts)
}

/** Returns the data, or null for an object that is truncated, reordered, forged, from another place or under another key. */
export async function openObject(streamKey: Uint8Array, binding: ObjectBinding, bytes: Uint8Array): Promise<Bytes | null> {
  const parsed = readObjectHeader(bytes)
  if (!parsed || !isPowerOfTwo(bytes.length) || !PATH_CLASSES.includes(binding.pathClass)) return null
  const head = bytes.slice(0, HEADER_BYTES)
  try {
    const key = await aesKey(await objectKey(streamKey, parsed.salt), 'decrypt')
    const count = chunkCount(bytes.length)
    const parts: Uint8Array[] = []
    for (let i = 0; i < count; i++) {
      const final = i === count - 1
      const start = HEADER_BYTES + i * (CHUNK_PLAINTEXT + TAG_BYTES)
      const chunk = bytes.subarray(start, final ? bytes.length : start + CHUNK_PLAINTEXT + TAG_BYTES)
      parts.push(new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: nonce(i), additionalData: await chunkAad(head, binding, i, final) }, key, chunk as Bytes)))
    }
    const plain = concat(...parts)
    const length = new DataView(plain.buffer).getUint32(0)
    return length <= plain.length - 4 ? plain.slice(4, 4 + length) : null
  } catch {
    return null
  }
}

/** Keys derived from a vault's master key (design "Keys"). Nothing here is stored: the master key is in memory only. */
export interface VaultKeys {
  readonly vaultId: string
  /** Key of the sealed library entries. */
  library(): Promise<Bytes>
  /** Key of the per-device manifests. */
  manifest(): Promise<Bytes>
  /** Key of one stream's segments and checkpoints, by stream id (the keyed hash of its name). */
  stream(streamId: string): Promise<Bytes>
  /** `base32lower(HMAC(nameKey, name))` truncated to 128 bits: the stream id that appears in paths. */
  streamId(name: string): Promise<string>
}

export async function deriveVaultKeys(master: Uint8Array, vaultId: string): Promise<VaultKeys> {
  if (master.length !== 32) throw new Error('master key must be 32 bytes')
  const salt = utf8(vaultId)
  const derive = (info: string) => hkdf(master, salt, utf8(info))
  const nameKey = await subtle().importKey('raw', await derive('rb/vault/name/v1'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return {
    vaultId,
    library: () => derive('rb/vault/library/v1'),
    manifest: () => derive('rb/vault/manifest/v1'),
    stream: (streamId) => derive(`rb/vault/stream/v1/${streamId}`),
    streamId: async (name) => toBase32(new Uint8Array(await subtle().sign('HMAC', nameKey, utf8(name))).subarray(0, 16)),
  }
}
