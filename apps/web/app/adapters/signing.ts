/**
 * Ed25519 adapters for the signing ports. One signing key per browser tab session:
 * kept in sessionStorage so a reload keeps authorship of your notes, gone when the tab closes.
 */
import type { SignerPort, VerifierPort } from '@retroboard/application'
import { agreementKeyPair, deriveFacilitatorSeed, fromBase64Url, hkdf, openFrom, sign, signingKeyPair, toBase64Url, utf8, verify } from '@retroboard/crypto'
import type { SessionAgreement } from '~/transport/room-move'

const SESSION_KEY = 'retroboard:session-signing-key'

export interface SeedStore { get(): string | null; set(seed: string): void }

const sessionSeedStore: SeedStore = {
  get: () => { try { return sessionStorage.getItem(SESSION_KEY) } catch { return null } },
  set: (seed) => { try { sessionStorage.setItem(SESSION_KEY, seed) } catch { /* private mode: memory only */ } },
}

export async function createSessionSigner(store: SeedStore = sessionSeedStore): Promise<SignerPort> {
  const saved = store.get()
  const seed = saved ? fromBase64Url(saved) : null
  const pair = await signingKeyPair(seed?.length === 32 ? seed : undefined)
  if (!saved || seed?.length !== 32) store.set(toBase64Url(pair.privateKey))
  return signerFromSeed(pair.privateKey, toBase64Url(pair.publicKey))
}

/**
 * X25519 key of this session, for what is sealed to me (the hand-off of a move to a fresh link). Derived from the same stored
 * seed as the signing key (HKDF, its own label), so a reload keeps it and no second secret is stored. Call after
 * `createSessionSigner`: it creates the seed.
 */
export async function createSessionAgreement(store: SeedStore = sessionSeedStore): Promise<SessionAgreement> {
  const saved = store.get()
  const seed = saved ? fromBase64Url(saved) : null
  const root = seed?.length === 32 ? seed : (await signingKeyPair()).privateKey
  const pair = await agreementKeyPair(await hkdf(root, new Uint8Array(), utf8('rb/session-agreement/v1')))
  return { publicKey: toBase64Url(pair.publicKey), open: (sealed, aad) => openFrom(pair, sealed, aad) }
}

/** Signer for the facilitator secret from the link: a 32-byte seed (older boards) or a 16-byte secret expanded to one. */
export async function signerFor(secretB64: string): Promise<SignerPort | null> {
  const secret = fromBase64Url(secretB64)
  if (secret?.length !== 32 && secret?.length !== 16) return null
  const seed = secret.length === 16 ? await deriveFacilitatorSeed(secret) : secret
  const pair = await signingKeyPair(seed)
  return signerFromSeed(pair.privateKey, toBase64Url(pair.publicKey))
}

const signerFromSeed = (seed: Uint8Array, publicKey: string): SignerPort => ({
  publicKey,
  sign: async (message) => toBase64Url(await sign(seed, utf8(message))),
})

export const ed25519Verifier: VerifierPort = {
  async verify(publicKey, signature, message) {
    const pub = fromBase64Url(publicKey); const sig = fromBase64Url(signature)
    return !!pub && !!sig && verify(pub, sig, utf8(message))
  },
}
