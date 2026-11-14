/**
 * Binds the vault use cases to the layers they may not import (change user-drive-storage): the key schedule and the password
 * and recovery wraps of `packages/crypto`, and the engine of `packages/sync`. Application code sees `VaultCryptoPort` and
 * `UnlockedVault`; the master key lives in these closures, in memory, and is never returned.
 */
import type { RecoveryKeyView, SyncTargetPort, UnlockOutcome, UnlockedVault, VaultCryptoPort, VaultEnginePort, VaultInfo } from '@retroboard/application'
import {
  type Bytes, type VaultInfo as CryptoInfo, acceptablePassword, addRecoveryWrap, createVaultInfo, createVaultSealer, deriveVaultKeys, parseRecoveryKey, unlockWithPassword,
  unlockWithRecoveryKey,
} from '@retroboard/crypto'
import { type InfoDoc, type MemoryPort, READER_VERSION, type VaultLocal, createVaultEngine, parseInfo } from '@retroboard/sync'

export interface VaultKitContext {
  readonly target: SyncTargetPort
  readonly local: VaultLocal
  readonly memory: MemoryPort
  /** This device's id as it appears in file names. */
  readonly device: string
  readonly deviceName: string
  readonly now?: () => number
  /** Eight lowercase hex characters (default: random). */
  readonly random?: () => string
}

const randomHex = (): string => [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('')
const view = (k: { text: string; qr: string }): RecoveryKeyView => ({ text: k.text, qr: k.qr })

export function createVaultKit(ctx: VaultKitContext): VaultCryptoPort {
  async function open(info: CryptoInfo, master: Bytes): Promise<UnlockedVault> {
    const sealer = createVaultSealer(await deriveVaultKeys(master, info.vaultId), info.activeKeyId.value)
    const engine = createVaultEngine({
      target: ctx.target, crypto: sealer, local: ctx.local, memory: ctx.memory, device: ctx.device, deviceName: ctx.deviceName,
      info: info as unknown as InfoDoc, now: ctx.now ?? Date.now, random: ctx.random ?? randomHex,
    })
    const port: VaultEnginePort = {
      sync: (request) => engine.sync(request) as unknown as ReturnType<VaultEnginePort['sync']>,
      publishInfo: (i) => engine.publishInfo(i as unknown as InfoDoc),
      updateInfo: (i) => engine.updateInfo(i as unknown as InfoDoc),
      deleteStream: (name) => engine.deleteStream(name),
      deleteVault: () => engine.deleteVault(),
    }
    let current = info
    return {
      get info() { return current as unknown as VaultInfo },
      engine: port,
      async newRecoveryKey(now) {
        const next = await addRecoveryWrap(current, master, now)
        current = next.info
        await engine.updateInfo(next.info as unknown as InfoDoc)
        return view(next.recoveryKey)
      },
    }
  }

  return {
    parseInfo: (bytes) => parseInfo<InfoDoc>(new TextDecoder().decode(bytes)) as unknown as VaultInfo | null,
    acceptablePassword,
    tooNew: (info) => (info as unknown as InfoDoc).minReader > READER_VERSION,
    async create(password, now) {
      const created = await createVaultInfo(password, now)
      const withRecovery = await addRecoveryWrap(created.info, created.master, now)
      return { info: withRecovery.info as unknown as VaultInfo, recoveryKey: view(withRecovery.recoveryKey), vault: await open(withRecovery.info, created.master) }
    },
    async unlock(info, secret): Promise<UnlockOutcome> {
      const doc = info as unknown as CryptoInfo
      let unlocked
      if ('password' in secret) unlocked = await unlockWithPassword(doc, secret.password)
      else {
        const parsed = parseRecoveryKey(secret.recoveryKey)
        if (!parsed.ok) return { ok: false, reason: 'malformed-key' }
        unlocked = await unlockWithRecoveryKey(doc, parsed.key)
      }
      return unlocked ? { ok: true, vault: await open(doc, unlocked.master) } : { ok: false, reason: 'wrong-secret' }
    },
  }
}
