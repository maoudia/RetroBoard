/**
 * The page's side of the OAuth 2.0 authorization code flow with PKCE as a single-page application (change user-drive-storage):
 * the verifier and the challenge, the authorize URL, and the pending sign-in kept in `sessionStorage` under a random `state` so
 * the redirect back to `/storage/callback` can find its verifier and send the person where they were. Nothing here is secret
 * beyond one verifier that lives for one sign-in in one tab; no token ever passes through this file.
 */
import { type Bytes, randomBytes, toBase64Url } from '@retroboard/crypto'
import { SCOPE } from '~/adapters/sync/onedrive-auth'

export type SignInIntent = 'connect' | 'renew'
/** `select_account` asks the person; `none` only succeeds with a live Microsoft session (a silent renewal). */
export type SignInPrompt = 'select_account' | 'none'

export interface PendingSignIn {
  readonly state: string
  readonly verifier: string
  readonly returnTo: string
  readonly intent: SignInIntent
  readonly prompt: SignInPrompt
  readonly startedAt: number
}

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** A sign-in the person abandoned must not be completed by an old link. */
export const PENDING_MS = 15 * 60_000
const KEY = (state: string): string => `retroboard:oauth:${state}`

const sha256 = async (text: string): Promise<Bytes> => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))

/** 43 URL-safe characters of 256 random bits, as RFC 7636 allows (43 to 128). */
export const newVerifier = (): string => toBase64Url(randomBytes(32))
export const challengeOf = async (verifier: string): Promise<string> => toBase64Url(await sha256(verifier))

export interface AuthorizeParams {
  readonly authority: string
  readonly clientId: string
  readonly redirectUri: string
  readonly state: string
  readonly challenge: string
  readonly prompt: SignInPrompt
}

export function authorizeUrl(p: AuthorizeParams): string {
  const url = new URL(`${p.authority}/oauth2/v2.0/authorize`)
  const q = url.searchParams
  q.set('client_id', p.clientId)
  q.set('response_type', 'code')
  q.set('redirect_uri', p.redirectUri)
  q.set('response_mode', 'query')
  q.set('scope', SCOPE)
  q.set('state', p.state)
  q.set('code_challenge', p.challenge)
  q.set('code_challenge_method', 'S256')
  q.set('prompt', p.prompt)
  return url.toString()
}

export interface StartParams {
  readonly authority: string
  readonly clientId: string
  readonly redirectUri: string
  readonly returnTo: string
  readonly intent: SignInIntent
  readonly prompt: SignInPrompt
  readonly storage: SessionStorageLike
  readonly now?: () => number
}

/** Remembers the sign-in and returns the URL to send the window to. */
export async function startSignIn(p: StartParams): Promise<string> {
  const state = toBase64Url(randomBytes(16))
  const verifier = newVerifier()
  const pending: PendingSignIn = { state, verifier, returnTo: p.returnTo, intent: p.intent, prompt: p.prompt, startedAt: (p.now ?? Date.now)() }
  p.storage.setItem(KEY(state), JSON.stringify(pending))
  return authorizeUrl({ authority: p.authority, clientId: p.clientId, redirectUri: p.redirectUri, state, challenge: await challengeOf(verifier), prompt: p.prompt })
}

export type CallbackResult =
  | { readonly ok: true; readonly state: string; readonly code: string }
  | { readonly ok: false; readonly state: string; readonly error: string }

/** What the redirect brought back: a code, or the error Microsoft named. Anything else is not for us. */
export function parseCallback(search: string): CallbackResult | null {
  const q = new URLSearchParams(search)
  const state = q.get('state')
  if (!state) return null
  const error = q.get('error')
  if (error) return { ok: false, state, error }
  const code = q.get('code')
  return code ? { ok: true, state, code } : null
}

/** A place to come back to is a path of this site, never a link elsewhere (the storage of a tab can be written by the page only, but be sure). */
export const safeReturn = (path: string, fallback = '/boards'): string => (/^\/(?!\/)[\w\-./?=&#%:~+@]*$/.test(path) ? path : fallback)

/** The pending sign-in of this `state`, once: it is removed whether or not it is still fresh. */
export function takePending(storage: SessionStorageLike, state: string, now = Date.now()): PendingSignIn | null {
  const raw = storage.getItem(KEY(state))
  storage.removeItem(KEY(state))
  if (!raw) return null
  try {
    const pending = JSON.parse(raw) as PendingSignIn
    return pending.state === state && now - pending.startedAt <= PENDING_MS ? { ...pending, returnTo: safeReturn(pending.returnTo) } : null
  } catch { return null }
}

/** Errors that mean "ask the person instead": the silent attempt had no session to use. */
export const NEEDS_INTERACTION = new Set(['login_required', 'interaction_required', 'consent_required', 'account_selection_required'])
