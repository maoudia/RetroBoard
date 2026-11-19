/**
 * Where the refresh token rests between sessions (change user-drive-storage): sealed with the device key (a non-extractable key
 * that never leaves IndexedDB) in this connection's small IndexedDB database, never in `localStorage`, never synced. Alongside
 * it, when the person last signed in with the browser in front of them: a single-page application's refresh token ends 24 hours
 * after that moment, whatever renewals happened since, so the interface can say "sign in again" without a failing request.
 */
import type { SyncStateStore } from '~/adapters/sync/sync-state'

export interface Sealer {
  seal(text: string): Promise<string>
  open(sealed: string): Promise<string | null>
}

export interface StoredToken {
  readonly refreshToken: string
  /** The interactive sign-in that the 24 hours count from. */
  readonly signedAt: number
}

/** Microsoft's fixed lifetime of a refresh token issued to a single-page application. */
export const REFRESH_LIFETIME_MS = 24 * 60 * 60 * 1000
/** Stop trusting a token a little before it ends, so a request does not leave with one that dies on the way. */
const MARGIN_MS = 5 * 60_000
const KEY = 'onedrive-token'

interface Stored { sealed: string; signedAt: number }

export interface TokenStore {
  /** A new sign-in: the 24 hours start now. */
  signedIn(refreshToken: string, now: number): Promise<void>
  /** A renewal handed out a rotated token: the 24 hours do not move. */
  rotated(refreshToken: string): Promise<void>
  load(): Promise<StoredToken | null>
  clear(): Promise<void>
}

export const stillValid = (token: StoredToken, now: number): boolean => now - token.signedAt < REFRESH_LIFETIME_MS - MARGIN_MS

export function createTokenStore(state: SyncStateStore, sealer: Sealer): TokenStore {
  const write = async (refreshToken: string, signedAt: number) => { await state.set(KEY, { sealed: await sealer.seal(refreshToken), signedAt } satisfies Stored) }
  return {
    signedIn: (refreshToken, now) => write(refreshToken, now),
    async rotated(refreshToken) {
      const known = await state.get<Stored>(KEY)
      // A rotation that arrives with nothing stored is a sign-in that is not finished yet: the exchange records it.
      if (known) await write(refreshToken, known.signedAt)
    },
    async load() {
      const known = await state.get<Stored>(KEY)
      if (!known) return null
      const refreshToken = await sealer.open(known.sealed)
      return refreshToken ? { refreshToken, signedAt: known.signedAt } : null
    },
    clear: () => state.delete(KEY),
  }
}
