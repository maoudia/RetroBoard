/**
 * The token side of "Sign in with Microsoft" (change user-drive-storage), inside the provider worker: it trades the authorization
 * code for tokens and renews the access token from the refresh token. The access token lives in this object, in the worker's
 * memory, and nowhere else; each refresh token it receives is handed to `onRefreshToken` so the page can seal and keep it, and it
 * is sent to no one but the token endpoint. Microsoft rotates refresh tokens and a single-page application's last 24 hours from the
 * interactive sign-in, so when this says `auth-expired` the person signs in again.
 */
import { TargetError } from '@retroboard/application'

export const SCOPE = 'Files.ReadWrite.AppFolder offline_access'

export interface AuthDeps {
  readonly fetch: typeof fetch
  /** `https://login.microsoftonline.com/consumers`: the personal accounts only (the app folder is not for work or school accounts). */
  readonly authority: string
  readonly clientId: string
  readonly redirectUri: string
  readonly now?: () => number
  /** Every refresh token the endpoint hands out, to be kept by the page. */
  readonly onRefreshToken?: (refreshToken: string) => void
}

export interface OnedriveAuth {
  /** The authorization code of the redirect, with the PKCE verifier that went with it. */
  exchange(code: string, verifier: string): Promise<void>
  /** A refresh token kept by the page from an earlier session. */
  restore(refreshToken: string): void
  /** A usable access token, renewed first when it is about to end. */
  accessToken(): Promise<string>
  /** The access token was refused: renew it on the next call. */
  invalidate(): void
  readonly signedIn: boolean
  forget(): void
}

interface TokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }

/** Renew this long before the access token ends, so a request never leaves with a token that dies on the way. */
const EARLY_MS = 60_000
/** Answers that mean the person has to sign in again, not that the network failed. */
const SIGN_IN_AGAIN = new Set(['invalid_grant', 'interaction_required', 'consent_required', 'login_required', 'invalid_client', 'unauthorized_client'])

export function createOnedriveAuth(deps: AuthDeps): OnedriveAuth {
  const now = deps.now ?? Date.now
  let access: { token: string; expiresAt: number } | null = null
  let refresh: string | null = null
  let flight: Promise<void> | null = null

  async function post(form: Record<string, string>): Promise<void> {
    let res: Response
    try {
      res = await deps.fetch(`${deps.authority}/oauth2/v2.0/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: deps.clientId, scope: SCOPE, ...form }).toString(), credentials: 'omit', referrerPolicy: 'no-referrer',
      })
    } catch (e) { throw new TargetError('unreachable', { cause: e }) }
    let body: TokenResponse = {}
    try { body = (await res.json()) as TokenResponse } catch { /* a body that is not JSON is a failure below */ }
    if (!res.ok || !body.access_token) {
      if (res.status === 429) throw new TargetError('throttled')
      if (res.status >= 500) throw new TargetError('unreachable')
      throw new TargetError(SIGN_IN_AGAIN.has(body.error ?? '') ? 'auth-expired' : 'forbidden')
    }
    access = { token: body.access_token, expiresAt: now() + (body.expires_in ?? 3599) * 1000 }
    if (body.refresh_token) { refresh = body.refresh_token; deps.onRefreshToken?.(body.refresh_token) }
  }

  /** One renewal at a time: every request that finds the token old waits for the same answer. */
  function renew(): Promise<void> {
    if (!refresh) return Promise.reject(new TargetError('auth-expired'))
    flight ??= post({ grant_type: 'refresh_token', refresh_token: refresh }).finally(() => { flight = null })
    return flight
  }

  return {
    async exchange(code, verifier) {
      await post({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: deps.redirectUri })
    },
    restore(token) { refresh = token; access = null },
    async accessToken() {
      if (!access || access.expiresAt - EARLY_MS <= now()) await renew()
      return access!.token
    },
    invalidate() { access = null },
    get signedIn() { return refresh !== null },
    forget() { access = null; refresh = null },
  }
}
