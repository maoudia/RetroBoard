/**
 * Password wrap of a vault's master key (change user-drive-storage, ADR-0039 "Keys").
 * The master key is 256 random bits and exists on a target only wrapped: AES-GCM under a key derived from the
 * password by Argon2id (pure JavaScript, memory-hard), with the parameters stored in each wrap so a vault made with
 * stronger ones still unlocks on a slower device, and raising them later never locks anyone out.
 */
import { type Bytes, fromBase64Url, toBase64Url, utf8 } from './bytes'
import { hkdf, open, pbkdf2, randomBytes, randomKey, seal } from './primitives'

export type KdfParams =
  | { readonly id: 'argon2id'; /** memory in KiB */ readonly m: number; /** passes */ readonly t: number; /** lanes */ readonly p: number }
  | { readonly id: 'pbkdf2-sha256'; readonly iterations: number }
  /** No stretching: for a secret that is already 160 random bits (the recovery key). */
  | { readonly id: 'hkdf-sha256' }

/** OWASP floor for Argon2id (19 MiB, 2 passes, 1 lane): a wrap below it is refused, whoever wrote it. */
export const ARGON2ID_FLOOR = { m: 19 * 1024, t: 2, p: 1 } as const
/** Ceilings keep a hostile `info.json` from asking a device for gigabytes or minutes. */
export const ARGON2ID_CEILING = { m: 512 * 1024, t: 12, p: 4 } as const
/** Chosen from `quality/kdf-benchmark.json`: about 0.3 s on a desktop, an estimated 1.5 s on a mid-range phone. */
export const DEFAULT_ARGON2ID: KdfParams = { id: 'argon2id', m: 32 * 1024, t: 3, p: 1 }
/** Registered fallback where a memory-hard function is not wanted: PBKDF2-HMAC-SHA-256, OWASP 2023. */
export const PBKDF2_FALLBACK: KdfParams = { id: 'pbkdf2-sha256', iterations: 600_000 }
const PBKDF2_CEILING = 10_000_000
const PBKDF2_FLOOR = 600_000

export const MIN_PASSWORD_LENGTH = 12

const within = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max

/** True when the parameters are known, not below the floor and not above the ceiling. */
export function isAcceptableKdf(kdf: KdfParams): boolean {
  switch (kdf.id) {
    case 'argon2id': return within(kdf.m, ARGON2ID_FLOOR.m, ARGON2ID_CEILING.m) && within(kdf.t, ARGON2ID_FLOOR.t, ARGON2ID_CEILING.t) && within(kdf.p, ARGON2ID_FLOOR.p, ARGON2ID_CEILING.p)
    case 'pbkdf2-sha256': return within(kdf.iterations, PBKDF2_FLOOR, PBKDF2_CEILING)
    case 'hkdf-sha256': return true
    default: return false
  }
}

export async function deriveWrapKey(secret: Uint8Array, salt: Uint8Array, kdf: KdfParams): Promise<Bytes> {
  if (!isAcceptableKdf(kdf)) throw new Error('key derivation parameters refused')
  switch (kdf.id) {
    case 'argon2id': {
      // Lazy: the memory-hard function is only needed when a password is typed, so it stays out of the entry chunk.
      const { argon2idAsync } = await import('@noble/hashes/argon2.js')
      return new Uint8Array(await argon2idAsync(secret, salt, { m: kdf.m, t: kdf.t, p: kdf.p, dkLen: 32, asyncTick: 10 })) as Bytes
    }
    case 'pbkdf2-sha256': return pbkdf2(secret, salt, kdf.iterations)
    default: return hkdf(secret, salt, utf8('rb/wrap/hkdf/v1'))
  }
}

/** A password is compared after Unicode normalisation, so the same word typed on two keyboards derives the same key. */
export const passwordBytes = (password: string): Bytes => utf8(password.normalize('NFKC'))

export type WrapKind = 'password' | 'recovery'

/** One wrap of a master key, as stored in `info.json`. */
export interface KeyWrap {
  readonly kind: WrapKind
  /** The master key it opens (an id the object headers carry). */
  readonly keyId: string
  readonly kdf: KdfParams
  readonly salt: string
  readonly wrapped: string
  readonly updatedTime: number
}

const wrapAad = (vaultId: string, keyId: string, kind: WrapKind) => utf8(`rb/wrap/v1|${vaultId}|${keyId}|${kind}`)

export async function wrapMasterKey(
  master: Uint8Array, secret: Uint8Array, opts: { vaultId: string; keyId: string; kind: WrapKind; kdf: KdfParams; now: number },
): Promise<KeyWrap> {
  const salt = randomBytes(16)
  const wrapKey = await deriveWrapKey(secret, salt, opts.kdf)
  const sealed = await seal(wrapKey, master, wrapAad(opts.vaultId, opts.keyId, opts.kind))
  return { kind: opts.kind, keyId: opts.keyId, kdf: opts.kdf, salt: toBase64Url(salt), wrapped: toBase64Url(sealed), updatedTime: opts.now }
}

/** The master key, or null for a wrong secret, a refused parameter set or a wrap made for another vault. */
export async function unwrapMasterKey(wrap: KeyWrap, secret: Uint8Array, vaultId: string): Promise<Bytes | null> {
  const salt = fromBase64Url(wrap.salt)
  const sealed = fromBase64Url(wrap.wrapped)
  if (!salt || !sealed || !isAcceptableKdf(wrap.kdf)) return null
  return open(await deriveWrapKey(secret, salt, wrap.kdf), sealed, wrapAad(vaultId, wrap.keyId, wrap.kind))
}

/** A value with the time it was last changed: `info.json` merges per property by it, as Joplin's `info.json` does. */
export interface Timed<T> { readonly value: T; readonly updatedTime: number }

/**
 * `info.json`: the only plaintext object of a vault. It holds the format version, ids, key ids, wrapped keys with their
 * KDF parameters and update times, and nothing a person typed.
 */
export interface VaultInfo {
  readonly version: 1
  /** The oldest reader build that may open this vault. */
  readonly minReader: 1
  readonly vaultId: string
  readonly cipher: 'aes-256-gcm'
  readonly activeKeyId: Timed<string>
  readonly wraps: readonly KeyWrap[]
  readonly settings: Readonly<Record<string, Timed<string | number | boolean>>>
}

const randomId = (bytes: number) => [...randomBytes(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** A new vault: a random master key wrapped once by the password. Add the recovery key with `addRecoveryWrap`. */
export async function createVaultInfo(password: string, now: number, kdf: KdfParams = DEFAULT_ARGON2ID): Promise<{ info: VaultInfo; master: Bytes }> {
  if (!acceptablePassword(password)) throw new Error('password too short')
  const master = randomKey()
  const vaultId = randomId(16)
  const keyId = randomId(8)
  const wrap = await wrapMasterKey(master, passwordBytes(password), { vaultId, keyId, kind: 'password', kdf, now })
  return { info: { version: 1, minReader: 1, vaultId, cipher: 'aes-256-gcm', activeKeyId: { value: keyId, updatedTime: now }, wraps: [wrap], settings: {} }, master }
}

export interface Unlocked { readonly master: Bytes; readonly keyId: string }

/** Tries every wrap of the given kind: a password change leaves one, an interrupted merge may leave two. */
export async function unlockWith(info: VaultInfo, kind: WrapKind, secret: Uint8Array): Promise<Unlocked | null> {
  for (const wrap of info.wraps) {
    // Stryker disable next-line ConditionalExpression: a wrap of another kind fails to open anyway (its kind is authenticated); skipping it only saves a derivation
    if (wrap.kind !== kind) continue
    const master = await unwrapMasterKey(wrap, secret, info.vaultId)
    if (master) return { master, keyId: wrap.keyId }
  }
  return null
}

export const unlockWithPassword = (info: VaultInfo, password: string) => unlockWith(info, 'password', passwordBytes(password))

/** A password change re-wraps the master key only: nothing else in the vault is re-encrypted. */
export async function changePassword(info: VaultInfo, master: Uint8Array, newPassword: string, now: number, kdf: KdfParams = DEFAULT_ARGON2ID): Promise<VaultInfo> {
  if (!acceptablePassword(newPassword)) throw new Error('password too short')
  const wrap = await wrapMasterKey(master, passwordBytes(newPassword), { vaultId: info.vaultId, keyId: info.activeKeyId.value, kind: 'password', kdf, now })
  return { ...info, wraps: [...info.wraps.filter((w) => w.kind !== 'password'), wrap] }
}

/** At least 12 characters (code points) once normalised. */
export const acceptablePassword = (password: string): boolean => [...password.normalize('NFKC')].length >= MIN_PASSWORD_LENGTH

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

/** Thresholds in bits: under 40 weak, under 60 fair, under 80 good. */
export const strengthLevel = (bits: number): PasswordStrength => (bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'good' : 'strong')

const POOLS: readonly (readonly [RegExp, number])[] = [[/[a-z]/, 26], [/[A-Z]/, 26], [/\d/, 10], [/[ -/:-@[-`{-~]/, 33]]
const NON_ASCII_POOL = 100
const COMMON = ['password', 'motdepasse', 'azerty', 'qwerty', 'letmein', 'welcome', 'retroboard', 'iloveyou', 'admin', '123456', 'abcdef']
const COMMON_PENALTY = 20

/**
 * A local, offline hint, never a gate beyond the length: the number of distinct characters times the bits of the pool they
 * are drawn from, less a penalty when a common word is in it. It is advice shown while typing, not a measurement.
 */
export function passwordStrength(password: string): { bits: number; level: PasswordStrength } {
  const normalised = password.normalize('NFKC')
  const chars = [...normalised]
  const pool = POOLS.reduce((n, [re, size]) => n + (re.test(normalised) ? size : 0), 0) + (chars.some((c) => c.charCodeAt(0) > 126) ? NON_ASCII_POOL : 0)
  const raw = pool ? new Set(chars).size * Math.log2(pool) : 0
  const lower = normalised.toLowerCase()
  const bits = Math.max(0, Math.round(raw - (COMMON.some((w) => lower.includes(w)) ? COMMON_PENALTY : 0)))
  return { bits, level: strengthLevel(bits) }
}
