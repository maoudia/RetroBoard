/**
 * Ed25519 adapters for the signing ports. One signing key per browser tab session:
 * kept in sessionStorage so a reload keeps authorship of your notes, gone when the tab closes.
 */
import type { SignerPort, VerifierPort } from '@retroboard/application'
import { fromBase64Url, sign, signingKeyPair, toBase64Url, utf8, verify } from '@retroboard/crypto'

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

/** Signer for a known seed (the facilitator secret from the link). */
export async function signerFor(seedB64: string): Promise<SignerPort | null> {
  const seed = fromBase64Url(seedB64)
  if (seed?.length !== 32) return null
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
