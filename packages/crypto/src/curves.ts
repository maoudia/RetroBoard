/**
 * Ed25519 / X25519 backends. Native WebCrypto is preferred (Chrome 137+, Firefox 130+, Safari 17+);
 * older engines lazy-load @noble/curves (audited, MIT), so the fallback costs nothing when unused.
 */
import { type Bytes, concat, fromHex } from './bytes'

export interface CurveBackend {
  readonly name: 'webcrypto' | 'noble'
  edPublicKey(seed: Bytes): Promise<Bytes>
  edSign(seed: Bytes, message: Bytes): Promise<Bytes>
  edVerify(publicKey: Bytes, signature: Bytes, message: Bytes): Promise<boolean>
  xPublicKey(scalar: Bytes): Promise<Bytes>
  xShared(scalar: Bytes, publicKey: Bytes): Promise<Bytes>
}

// PKCS#8 wrappers for a 32-byte private seed (RFC 8410).
const PKCS8_PREFIX = { Ed25519: fromHex('302e020100300506032b657004220420'), X25519: fromHex('302e020100300506032b656e04220420') }
type Curve = keyof typeof PKCS8_PREFIX

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('WebCrypto is not available (secure context required)')
  return s
}
const importPrivate = (curve: Curve, seed: Bytes, usages: KeyUsage[]) =>
  subtle().importKey('pkcs8', concat(PKCS8_PREFIX[curve], seed), { name: curve }, true, usages)

async function publicOf(key: CryptoKey): Promise<Bytes> {
  const { x } = await subtle().exportKey('jwk', key)
  if (!x) throw new Error('missing public key')
  return Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
}

export const webCryptoCurves: CurveBackend = {
  name: 'webcrypto',
  edPublicKey: async (seed) => publicOf(await importPrivate('Ed25519', seed, ['sign'])),
  edSign: async (seed, message) => new Uint8Array(await subtle().sign('Ed25519', await importPrivate('Ed25519', seed, ['sign']), message)),
  edVerify: async (publicKey, signature, message) =>
    subtle().verify('Ed25519', await subtle().importKey('raw', publicKey, 'Ed25519', false, ['verify']), signature, message),
  xPublicKey: async (scalar) => publicOf(await importPrivate('X25519', scalar, ['deriveBits'])),
  xShared: async (scalar, publicKey) => {
    const pub = await subtle().importKey('raw', publicKey, 'X25519', false, [])
    return new Uint8Array(await subtle().deriveBits({ name: 'X25519', public: pub }, await importPrivate('X25519', scalar, ['deriveBits']), 256))
  },
}

export async function nobleCurves(): Promise<CurveBackend> {
  const { ed25519, x25519 } = await import('@noble/curves/ed25519.js')
  const b = (u: Uint8Array) => new Uint8Array(u) as Bytes
  return {
    name: 'noble',
    edPublicKey: async (seed) => b(ed25519.getPublicKey(seed)),
    edSign: async (seed, message) => b(ed25519.sign(message, seed)),
    edVerify: async (publicKey, signature, message) => ed25519.verify(signature, message, publicKey),
    xPublicKey: async (scalar) => b(x25519.getPublicKey(scalar)),
    xShared: async (scalar, publicKey) => b(x25519.getSharedSecret(scalar, publicKey)),
  }
}

// RFC 8032 7.1 TEST 1 and RFC 7748 6.1: a backend is used only if it reproduces both.
const ED_SEED = fromHex('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60')
const ED_SIG = 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
const X_SCALAR = fromHex('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a')
const X_PEER = fromHex('de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f')
const X_SHARED = '4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742'
const hex = (u: Uint8Array) => [...u].map((v) => v.toString(16).padStart(2, '0')).join('')

/** Known-answer self-test; never throws. */
export async function selfTest(backend: CurveBackend): Promise<boolean> {
  try {
    const sig = await backend.edSign(ED_SEED, new Uint8Array())
    const ok = await backend.edVerify(await backend.edPublicKey(ED_SEED), sig, new Uint8Array())
    return ok && hex(sig) === ED_SIG && hex(await backend.xShared(X_SCALAR, X_PEER)) === X_SHARED
  } catch {
    return false
  }
}

let selected: Promise<CurveBackend> | null = null

/** Picks the native backend when it passes the self-test, otherwise noble. Memoized. */
export function curves(): Promise<CurveBackend> {
  selected ??= (async () => (await selfTest(webCryptoCurves)) ? webCryptoCurves : nobleCurves())()
  return selected
}

/** Test seam: force a backend (or reset to auto-detection with null). */
export function useCurves(backend: CurveBackend | null): void {
  selected = backend ? Promise.resolve(backend) : null
}
