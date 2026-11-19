/**
 * Use cases of the vault (change user-drive-storage): create one, unlock one, run a sync pass, disconnect and forget. They
 * decide what the person is told (the status, the reason, the next step) and leave the keys, the engine and the target to the
 * ports. Local editing never waits on any of this: a failure here is a status, not an exception.
 */
import type { ClockPort } from '../ports/device'
import { TargetError, type SyncTargetPort } from '../ports/sync-target'
import type { AttentionReason, RecoveryKeyView, UnlockSecret, UnlockedVault, VaultCryptoPort, VaultStatus, VaultSyncReport } from '../ports/vault'

export interface VaultDeps {
  readonly target: SyncTargetPort
  readonly crypto: VaultCryptoPort
  readonly clock: ClockPort
}

/** A file from the person's sync client that has not arrived for this long becomes a status of its own. */
export const WAITING_FOR_FILE_MS = 24 * 60 * 60 * 1000

export interface SyncOutcome {
  readonly status: VaultStatus
  readonly reason?: AttentionReason
  /** The target asked to be left alone for this long. */
  readonly retryAfterMs?: number
  readonly report?: VaultSyncReport
}

const attention = (reason: AttentionReason): SyncOutcome => ({ status: 'needs-attention', reason })

/** What a failure of the target or of the vault means to the person. Content-free: no path, no body, no message. */
export function statusOfError(error: unknown): SyncOutcome {
  if (error instanceof TargetError) {
    switch (error.code) {
      case 'permission-needed': return { status: 'allow-folder' }
      case 'not-found': return { status: 'folder-not-found' }
      case 'unreachable': return { status: 'offline' }
      case 'target-full': return { status: 'target-full' }
      case 'throttled': return { status: 'offline', ...(error.retryAfterMs === undefined ? {} : { retryAfterMs: error.retryAfterMs }) }
      case 'auth-expired': return { status: 'sign-in-again' }
      case 'forbidden': return attention('forbidden')
      default: return attention('refused')
    }
  }
  // The engine's own errors live in a package this layer may not import: they are told by name.
  const e = error as { name?: string; code?: string } | null
  if (e?.name === 'VaultError') {
    if (e.code === 'min-reader') return attention('newer-reader')
    if (e.code === 'wrong-vault') return attention('wrong-vault')
    if (e.code === 'missing') return attention('vault-missing')
  }
  return attention('unexpected')
}

export type CreateVaultResult =
  | { readonly ok: true; readonly vault: UnlockedVault; readonly recoveryKey: RecoveryKeyView }
  | { readonly ok: false; readonly error: 'weak-password' | 'vault-exists' | 'target'; readonly outcome?: SyncOutcome }

async function hasVault(target: SyncTargetPort): Promise<boolean> {
  for await (const _ of target.list('info')) return true
  return false
}

/**
 * A new vault on an empty target: a random master key wrapped by the password and by a recovery key, and `info.json`
 * written create-only. A target that already holds a vault is never overwritten.
 */
export async function createVault(deps: VaultDeps, password: string): Promise<CreateVaultResult> {
  if (!deps.crypto.acceptablePassword(password)) return { ok: false, error: 'weak-password' }
  try {
    if (await hasVault(deps.target)) return { ok: false, error: 'vault-exists' }
    const { info, recoveryKey, vault } = await deps.crypto.create(password, deps.clock.now())
    await vault.engine.publishInfo(info)
    return { ok: true, vault, recoveryKey }
  } catch (e) {
    return { ok: false, error: 'target', outcome: statusOfError(e) }
  }
}

export type UnlockVaultResult =
  | { readonly ok: true; readonly vault: UnlockedVault }
  | { readonly ok: false; readonly error: 'no-vault' | 'unreadable' | 'newer-reader' | 'wrong-secret' | 'malformed-key' | 'target'; readonly outcome?: SyncOutcome }

/** Opens the vault the target holds with the password or the recovery key. A wrong secret says so and changes nothing. */
export async function unlockVault(deps: VaultDeps, secret: UnlockSecret): Promise<UnlockVaultResult> {
  try {
    const got = await deps.target.get('info.json')
    if (!got) return { ok: false, error: 'no-vault' }
    const info = deps.crypto.parseInfo(got.bytes)
    if (!info) return { ok: false, error: 'unreadable' }
    if (deps.crypto.tooNew(info)) return { ok: false, error: 'newer-reader' }
    const outcome = await deps.crypto.unlock(info, secret)
    return outcome.ok ? { ok: true, vault: outcome.vault } : { ok: false, error: outcome.reason }
  } catch (e) {
    return { ok: false, error: 'target', outcome: statusOfError(e) }
  }
}

/** One pass of the engine. Never throws: whatever goes wrong becomes the status the person sees. */
export async function syncVault(deps: Pick<VaultDeps, 'clock'>, vault: UnlockedVault, request?: Parameters<UnlockedVault['engine']['sync']>[0]): Promise<SyncOutcome> {
  try {
    const report = await vault.engine.sync(request)
    const stale = report.waiting.some((w) => deps.clock.now() - w.since >= WAITING_FOR_FILE_MS)
    return { status: stale ? 'waiting-for-file' : 'synced', report }
  } catch (e) {
    return statusOfError(e)
  }
}

export interface DisconnectOptions {
  /** Also delete the vault files from the target (needs the vault unlocked: the person typed the password for it). */
  readonly deleteFiles: boolean
  /** Removes what this browser keeps of the connection: the folder handle, the engine's memory, the cached key and settings. */
  readonly clearLocal: () => Promise<void>
}

export type DisconnectResult = { readonly ok: true } | { readonly ok: false; readonly error: 'locked' | 'target'; readonly outcome?: SyncOutcome }

/**
 * Stops sync and forgets the connection. Local boards stay. When the files are to go too and cannot be deleted, nothing is
 * forgotten, so the person can try again or disconnect without deleting.
 */
export async function disconnectAndForget(vault: UnlockedVault | null, opts: DisconnectOptions): Promise<DisconnectResult> {
  if (opts.deleteFiles) {
    if (!vault) return { ok: false, error: 'locked' }
    try { await vault.engine.deleteVault() } catch (e) { return { ok: false, error: 'target', outcome: statusOfError(e) } }
  }
  await opts.clearLocal()
  return { ok: true }
}
