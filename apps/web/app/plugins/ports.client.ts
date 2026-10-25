import type { ChannelFactory, ClipboardPort, FilePort, NotifierPort, ReplicaStorePort } from '@retroboard/application'
import { deriveContentKey, fromBase64Url } from '@retroboard/crypto'
import type { KeyRing } from '@retroboard/domain'
import { createIdbReplicaStore, openReplicaDb, requestPersistence } from '~/adapters/replica-idb'
import { createSessionSigner, ed25519Verifier, signerFor } from '~/adapters/signing'
import { localTransportFactory } from '~/transport'
import { buildWs2Url, EncryptedRelayTransport } from '~/transport/encrypted'
import { download } from '~/utils/export'

export interface Ports {
  /** Solo (local-) boards: in-tab loopback. */
  channelFactory: ChannelFactory
  /** Protocol v2: end-to-end encrypted room for a key ring. */
  /** `creator`: this tab is the one that just created the board (it alone may write its first event). */
  encryptedChannelFactory(ring: KeyRing, passcode?: string, opts?: { creator?: boolean }): ChannelFactory
  clipboard: ClipboardPort
  file: FilePort
  notifier: NotifierPort
  /** null when IndexedDB is unavailable (some private modes): memory only. */
  replica: ReplicaStorePort | null
}

/** Composition root: the only place where application ports meet browser adapters. */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { push } = useToasts()
  const settings = useSettingsStore()
  let replica: ReplicaStorePort | null = null
  try { replica = typeof indexedDB === 'undefined' ? null : createIdbReplicaStore(openReplicaDb()) } catch { replica = null }
  // Retention: expired local copies are deleted at start-up ("until I leave" is handled on the board page).
  // "Until I leave" also purges everything at start-up: a delete started while leaving a page may not finish.
  if (replica) void replica.purge(settings.s.retentionDays > 0 ? Date.now() - settings.s.retentionDays * 86_400_000 : Number.MAX_SAFE_INTEGER).catch(() => {})
  if (replica) void requestPersistence()
  const ports: Ports = {
    channelFactory: localTransportFactory,
    encryptedChannelFactory: (ring, passcode, opts) => (roomId, handlers) => new EncryptedRelayTransport(
      buildWs2Url(config.public.wsUrl as string, roomId, window.location), ring, handlers,
      (async () => ({
        contentKey: await deriveContentKey(fromBase64Url(ring.roomKey)!, ring.roomId, ring.passcode ? passcode : undefined),
        session: await createSessionSigner(),
        facilitator: ring.facilitatorSecret ? await signerFor(ring.facilitatorSecret) : null,
        verifier: ed25519Verifier,
        replica: replica ?? undefined,
        p2p: settings.s.p2p,
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
  }
  return { provide: { ports } }
})
