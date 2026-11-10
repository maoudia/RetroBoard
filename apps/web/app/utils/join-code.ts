import { fromBase64Url, fromUtf8, hkdf, open, randomBytes, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { envelopeAad, type Envelope, PROTOCOL_VERSION } from '@retroboard/protocol'
import { ulid } from '~/transport/ulid'

/**
 * Join by short code (change short-links-and-join). The code opens a small side room on the relay: the person who
 * holds the board waits there, the joiner knocks, the holder lets them in and the board link travels back sealed
 * to the joiner's one-time public key. The relay sees opaque envelopes and a room id derived from the code, never
 * the board key. A short code is guessable offline, so the holder compares a safety number with the joiner.
 */
export const JOIN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const JOIN_CODE_LENGTH = 6
export const JOIN_TTL_MS = 10 * 60_000

export function newJoinCode(): string {
  const b = randomBytes(JOIN_CODE_LENGTH)
  return `RB-${Array.from(b, (x) => JOIN_ALPHABET[x % JOIN_ALPHABET.length]).join('')}`
}

/** "rb-7kq2m9", "RB 7KQ2M9", "7KQ2M9" -> "RB-7KQ2M9"; null when it is not a join code. */
export function normalizeJoinCode(text: string): string | null {
  let s = text.trim().toUpperCase().replace(/[\s-]/g, '')
  if (s.startsWith('RB')) s = s.slice(2)
  return s.length === JOIN_CODE_LENGTH && [...s].every((c) => JOIN_ALPHABET.includes(c)) ? `RB-${s}` : null
}

const sha256 = async (text: string | Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', typeof text === 'string' ? utf8(text) : (text as Uint8Array<ArrayBuffer>)))

/** The side room of a code: a valid 22-character room id derived from it. */
export async function joinRoomId(code: string): Promise<string> {
  return toBase64Url(await sha256(`rb-join-room|${code}`)).slice(0, 22)
}
const joinKey = (code: string) => hkdf(utf8(code), utf8('rb-join'), utf8('envelope-key'))

/** Six digits from the first four bytes of a hash, written "123 456". */
function digits(h: Uint8Array): string {
  const n = ((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0
  const d = String(n % 1_000_000).padStart(6, '0')
  return `${d.slice(0, 3)} ${d.slice(3)}`
}

/** Six digits from the joiner's one-time public key, read aloud on both screens (older joiners, no commitment). */
export async function safetyNumber(publicKey: Uint8Array): Promise<string> {
  return digits(await sha256(publicKey))
}

const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}

/**
 * Commitment to a one-time key, sent before the key itself: a knock then cannot be ground against the number of
 * another request, because the number depends on a value the holder only chooses after the commitment (change
 * join-code-committed-sas).
 */
export async function commitKey(publicKey: Uint8Array, nonce: string): Promise<string> {
  return toBase64Url(await sha256(concatBytes(utf8(`rb-join-commit|${nonce}|`), publicKey)))
}

/** The number both screens show: it binds the key, the holder's fresh challenge and the request nonce. */
export async function committedNumber(publicKey: Uint8Array, challenge: Uint8Array, nonce: string): Promise<string> {
  return digits(await sha256(concatBytes(utf8(`rb-join-sas|${nonce}|`), challenge, publicKey)))
}

export type JoinMsg =
  | { t: 'knock'; n: string; pub: string; name: string }
  /** Committed knock: `c` is `commitKey(pub, n)`; the key follows in `reveal` once the holder answered with a `challenge`. */
  | { t: 'knock2'; n: string; c: string; name: string }
  | { t: 'challenge'; n: string; h: string }
  | { t: 'reveal'; n: string; pub: string }
  | { t: 'let'; n: string; ct: string }
  | { t: 'deny'; n: string }

export async function sealJoinMsg(code: string, room: string, msg: JoinMsg): Promise<Envelope> {
  const head = { v: PROTOCOL_VERSION, room, id: ulid(), hlc: Date.now() } as const
  const ct = await seal(await joinKey(code), utf8(JSON.stringify(msg)), utf8(envelopeAad(head)))
  return { ...head, ct: toBase64Url(ct) }
}

const isStr = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max

export async function openJoinMsg(code: string, env: Envelope): Promise<JoinMsg | null> {
  const ct = fromBase64Url(env.ct)
  const pt = ct && await open(await joinKey(code), ct, utf8(envelopeAad(env)))
  if (!pt) return null
  try {
    const m = JSON.parse(fromUtf8(pt)) as Record<string, unknown>
    if (!isStr(m.n, 40)) return null
    if (m.t === 'knock' && isStr(m.pub, 64) && isStr(m.name, 40)) return { t: 'knock', n: m.n, pub: m.pub, name: m.name }
    if (m.t === 'knock2' && isStr(m.c, 64) && isStr(m.name, 40)) return { t: 'knock2', n: m.n, c: m.c, name: m.name }
    if (m.t === 'challenge' && isStr(m.h, 64)) return { t: 'challenge', n: m.n, h: m.h }
    if (m.t === 'reveal' && isStr(m.pub, 64)) return { t: 'reveal', n: m.n, pub: m.pub }
    if (m.t === 'let' && isStr(m.ct, 4096)) return { t: 'let', n: m.n, ct: m.ct }
    if (m.t === 'deny') return { t: 'deny', n: m.n }
  } catch { /* not ours */ }
  return null
}
