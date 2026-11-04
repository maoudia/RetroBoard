import type { ChannelFactory, ClipboardPort, FilePort, NotifierPort, ReplicaStorePort } from '@retroboard/application'
import { deriveContentKey, fromBase64Url } from '@retroboard/crypto'
import type { KeyRing } from '@retroboard/domain'
import { createIdbReplicaStore, openReplicaDb, requestPersistence } from '~/adapters/replica-idb'
import { createSessionReplicaStore, withSessionFallback } from '~/adapters/replica-session'
import { createIdbVault, createSessionVault, createVault, openVaultDb, type PasscodeVault } from '~/adapters/passcode-vault'
import { createSessionSigner, ed25519Verifier, signerFor } from '~/adapters/signing'
import { LocalRelaySocket } from '~/transport/local-relay'
import { buildWs2Url, EncryptedRelayTransport } from '~/transport/encrypted'
import { download } from '~/utils/export'

export interface Ports {
  /**
   * Protocol v2: end-to-end encrypted room for a key ring. `creator`: this tab is the one that just created the board
   * (it alone may write its first event). `solo`: the relay lives in this tab, same engine, nothing leaves it.
   */
  encryptedChannelFactory(ring: KeyRing, passcode?: string, opts?: { creator?: boolean, solo?: boolean }): ChannelFactory
  clipboard: ClipboardPort
  file: FilePort
  notifier: NotifierPort
  /** Where this device keeps boards (IndexedDB, or the tab in private modes and with "until I leave"). */
  replica: ReplicaStorePort | null
  /** Passcodes remembered on this device (sealed), or in the tab only. */
  vault: PasscodeVault
}

/** Composition root: the only place where application ports meet browser adapters. */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { push } = useToasts()
  const settings = useSettingsStore()
  let durable: ReplicaStorePort | null
  try { durable = typeof indexedDB === 'undefined' ? null : createIdbReplicaStore(openReplicaDb()) } catch { durable = null }
  let session: ReplicaStorePort | null = null
  try { session = createSessionReplicaStore(sessionStorage) } catch { /* no storage at all: memory only */ }
  // Private modes without IndexedDB keep the board in this tab (sessionStorage): a reload or back and forward reopens it.
  const replica: ReplicaStorePort | null = session ? withSessionFallback(durable, session) : durable
  // The durable copy is always kept (minimum one day): a board must reopen from this browser even when nobody else is online.
  const replicaFor = (): ReplicaStorePort | null => replica
  // Retention sweep, deferred: the board being opened marks its room as live first, so it is never swept while it opens.
  const sweep = () => { if (settings.s.retentionDays > 0) void replica?.purge(Date.now() - settings.s.retentionDays * 86_400_000).catch(() => {}) }
  let durableVault: PasscodeVault | null
  try { durableVault = typeof indexedDB === 'undefined' || !crypto?.subtle ? null : createIdbVault(openVaultDb()) } catch { durableVault = null }
  let tabVault: PasscodeVault
  try { tabVault = createSessionVault(sessionStorage) } catch { tabVault = { get: async () => null, set: async () => {}, delete: async () => {}, purge: async () => 0 } }
  const vault = createVault(durableVault, tabVault, () => false)
  const sweepVault = () => { if (settings.s.retentionDays > 0) void vault.purge(Date.now() - settings.s.retentionDays * 86_400_000) }
  setTimeout(() => { sweep(); sweepVault() }, 20_000)
  if (durable) void requestPersistence()
  const ports: Ports = {
    encryptedChannelFactory: (ring, passcode, opts) => (roomId, handlers) => new EncryptedRelayTransport(
      buildWs2Url(config.public.wsUrl as string, roomId, window.location), ring, handlers,
      (async () => ({
        contentKey: await deriveContentKey(fromBase64Url(ring.roomKey)!, ring.roomId, ring.passcode ? passcode : undefined),
        session: await createSessionSigner(),
        facilitator: ring.facilitatorSecret ? await signerFor(ring.facilitatorSecret) : null,
        verifier: ed25519Verifier,
        replica: replicaFor() ?? undefined,
        p2p: opts?.solo ? false : settings.s.p2p,
        ...(opts?.solo ? { WS: LocalRelaySocket as unknown as typeof WebSocket } : {}),
        creator: opts?.creator === true,
        iceServers: String(config.public.iceServers ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((urls) => ({ urls })),
      }))(),
    ),
    clipboard: {
      writeText: (text) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('clipboard unavailable'))),
      writeRich: async (html, text) => {
        if (!navigator.clipboard) throw new Error('clipboard unavailable')
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard.write) return navigator.clipboard.writeText(text)
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })])
      },
    },
    file: { save: download },
    notifier: { notify: push },
    replica,
    vault,
  }
  return { provide: { ports } }
})
