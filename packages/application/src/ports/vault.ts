/**
 * What the vault use cases need of the layers around them (change user-drive-storage). The vault engine and the key schedule
 * live in packages this layer may not import, so the app composes them behind these small ports, and the use cases decide
 * what the person is told: the status, the error, the next step.
 */

/** `info.json` as the use cases see it: its content is the crypto layer's business. */
export type VaultInfo = Readonly<Record<string, unknown>> & { readonly vaultId: string }

export interface RecoveryKeyView {
  /** `ABCD-EFGH-...` groups, to print, save or copy. */
  readonly text: string
  /** The payload of a QR code. */
  readonly qr: string
}

export interface VaultDevice { readonly device: string; readonly name: string; readonly updatedAt: number; readonly self: boolean }

export interface VaultSyncReport {
  readonly pushed: number
  readonly pulled: number
  readonly streams: readonly string[]
  readonly waiting: readonly { readonly path: string; readonly since: number }[]
  readonly warnings: readonly string[]
  readonly devices: readonly VaultDevice[]
  readonly info: VaultInfo
  readonly infoChanged: boolean
}

export interface VaultEnginePort {
  sync(request?: { readonly open?: readonly string[]; readonly compact?: readonly string[] }): Promise<VaultSyncReport>
  publishInfo(info: VaultInfo): Promise<void>
  /** Folds a document (a new recovery wrap, a changed password) into what the engine will write at the next pass. */
  updateInfo(info: VaultInfo): Promise<void>
  deleteStream(name: string): Promise<void>
  deleteVault(): Promise<void>
}

/** A vault whose master key is in memory: the engine seals and opens with it, and nothing here exposes it. */
export interface UnlockedVault {
  readonly info: VaultInfo
  readonly engine: VaultEnginePort
  /** A new recovery key that replaces the old one (the old key stops working). The engine writes the new wrap at the next pass. */
  newRecoveryKey(now: number): Promise<RecoveryKeyView>
}

export type UnlockSecret = { readonly password: string } | { readonly recoveryKey: string }

export type UnlockOutcome =
  | { readonly ok: true; readonly vault: UnlockedVault }
  | { readonly ok: false; readonly reason: 'wrong-secret' | 'malformed-key' }

export interface VaultCryptoPort {
  /** `null` for bytes that are not an `info.json` this build can read (an empty or half-synced file is not one). */
  parseInfo(bytes: Uint8Array): VaultInfo | null
  /** At least 12 characters once normalised. */
  acceptablePassword(password: string): boolean
  /** True when the vault asks for a newer reader than this build. */
  tooNew(info: VaultInfo): boolean
  /** A new vault: a random master key wrapped by the password and by a fresh recovery key. */
  create(password: string, now: number): Promise<{ info: VaultInfo; recoveryKey: RecoveryKeyView; vault: UnlockedVault }>
  unlock(info: VaultInfo, secret: UnlockSecret): Promise<UnlockOutcome>
}

/** What the person sees of sync, as text and an announcement. */
export type VaultStatus =
  | 'unsupported' | 'off' | 'locked' | 'syncing' | 'synced' | 'offline'
  | 'allow-folder' | 'folder-not-found' | 'waiting-for-file' | 'needs-attention' | 'target-full'
  /** A provider's sign-in ended (OneDrive: a refresh token lasts 24 hours): one click on "Sign in again". */
  | 'sign-in-again'

export type AttentionReason = 'newer-reader' | 'wrong-vault' | 'vault-missing' | 'auth-expired' | 'forbidden' | 'refused' | 'unexpected'
