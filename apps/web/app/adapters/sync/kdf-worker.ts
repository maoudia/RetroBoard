/**
 * First-party worker that runs the Argon2id derivation off the main thread (change user-drive-storage, task 2.3): the
 * memory-hard function takes a fraction of a second on a desktop and seconds on a phone, and typing a password must not
 * freeze the page. It is a module of this origin, so `script-src 'self'` covers it and the CSP is unchanged; it opens no
 * connection and holds no key beyond the one call it is answering.
 */
import { type KdfParams, deriveWrapKey } from '@retroboard/crypto'

interface Request { id: number; secret: Uint8Array; salt: Uint8Array; kdf: KdfParams }

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, secret, salt, kdf } = event.data
  try {
    self.postMessage({ id, key: await deriveWrapKey(secret, salt, kdf) })
  } catch {
    self.postMessage({ id, error: 'derivation-failed' })
  }
}
