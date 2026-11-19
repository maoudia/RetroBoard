/**
 * A OneDrive connection as the page lives it (change user-drive-storage): the worker client, the sealed refresh token, and the
 * redirect round trip of "Sign in with Microsoft". It is the only place that starts a sign-in or finishes one; the vault runtime
 * asks it for a target and for the state of the sign-in, and the callback page hands it the redirect's query string.
 */
import type { SyncTargetPort } from '@retroboard/application'
import { type OnedriveClient, type WorkerLike, createOnedriveClient } from '~/adapters/sync/onedrive-client'
import type { OnedriveConfig } from '~/adapters/sync/onedrive-protocol'
import {
  NEEDS_INTERACTION, type SessionStorageLike, type SignInIntent, type SignInPrompt, parseCallback, startSignIn, takePending,
} from '~/adapters/sync/oauth-pkce'
import type { SyncStateStore } from '~/adapters/sync/sync-state'
import { type Sealer, createTokenStore, stillValid } from '~/adapters/sync/token-store'

export interface OnedriveSessionDeps {
  readonly config: OnedriveConfig
  readonly state: SyncStateStore
  readonly sealer: Sealer
  readonly storage: SessionStorageLike
  /** Sends the window to Microsoft (or back). */
  readonly navigate: (url: string) => void
  readonly now?: () => number
  readonly makeWorker?: () => WorkerLike
}

export type SignInOutcome =
  | { readonly kind: 'signed-in'; readonly returnTo: string; readonly intent: SignInIntent }
  /** A silent attempt found no Microsoft session: the window is on its way to the sign-in page. */
  | { readonly kind: 'redirecting' }
  | { readonly kind: 'failed'; readonly returnTo: string }
  /** Not a redirect of ours. */
  | { readonly kind: 'ignored' }

/** Where a failed or stray redirect lands. */
export const FALLBACK_RETURN = '/boards'

export interface OnedriveSession {
  readonly target: SyncTargetPort
  start(returnTo: string, intent: SignInIntent, prompt: SignInPrompt): Promise<void>
  complete(search: string): Promise<SignInOutcome>
  /** 'ready': a refresh token is back in the worker. 'sign-in-again': it ended (or never was). */
  restore(): Promise<'ready' | 'sign-in-again'>
  forget(): Promise<void>
}

export function createOnedriveSession(deps: OnedriveSessionDeps): OnedriveSession {
  const now = deps.now ?? Date.now
  const tokens = createTokenStore(deps.state, deps.sealer)
  const client: OnedriveClient = createOnedriveClient(deps.config, deps.makeWorker)
  // A renewal rotates the token: keep the newest, with the sign-in moment it counts from unchanged.
  client.onRefreshToken((refreshToken) => { void tokens.rotated(refreshToken).catch(() => undefined) })

  async function start(returnTo: string, intent: SignInIntent, prompt: SignInPrompt) {
    deps.navigate(await startSignIn({
      authority: deps.config.authority, clientId: deps.config.clientId, redirectUri: deps.config.redirectUri, returnTo, intent, prompt, storage: deps.storage, now,
    }))
  }

  return {
    target: client.target,
    start,
    async complete(search) {
      const back = parseCallback(search)
      if (!back) return { kind: 'ignored' }
      const pending = takePending(deps.storage, back.state, now())
      // A redirect nobody here asked for (a stale tab, a replayed link) is dropped without a word to Microsoft.
      if (!pending) return { kind: 'failed', returnTo: FALLBACK_RETURN }
      if (!back.ok) {
        if (pending.prompt === 'none' && NEEDS_INTERACTION.has(back.error)) {
          await start(pending.returnTo, pending.intent, 'select_account')
          return { kind: 'redirecting' }
        }
        return { kind: 'failed', returnTo: pending.returnTo }
      }
      try {
        const refreshToken = await client.exchange(back.code, pending.verifier)
        if (!refreshToken) return { kind: 'failed', returnTo: pending.returnTo }
        await tokens.signedIn(refreshToken, now())
        return { kind: 'signed-in', returnTo: pending.returnTo, intent: pending.intent }
      } catch { return { kind: 'failed', returnTo: pending.returnTo } }
    },
    async restore() {
      const stored = await tokens.load()
      if (!stored || !stillValid(stored, now())) return 'sign-in-again'
      await client.restore(stored.refreshToken)
      return 'ready'
    },
    async forget() {
      await client.forget()
      await tokens.clear()
    },
  }
}
