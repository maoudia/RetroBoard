import type { ChannelFactory, ClipboardPort, FilePort, NotifierPort } from '@retroboard/application'
import { deriveContentKey, fromBase64Url } from '@retroboard/crypto'
import type { KeyRing } from '@retroboard/domain'
import { createSessionSigner, ed25519Verifier, signerFor } from '~/adapters/signing'
import { defaultTransportFactory } from '~/transport'
import { buildWs2Url, EncryptedRelayTransport } from '~/transport/encrypted'
import { download } from '~/utils/export'

export interface Ports {
  channelFactory: ChannelFactory
  /** Protocol v2: end-to-end encrypted room for a key ring. */
  encryptedChannelFactory(ring: KeyRing): ChannelFactory
  clipboard: ClipboardPort
  file: FilePort
  notifier: NotifierPort
}

/** Composition root: the only place where application ports meet browser adapters. */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { push } = useToasts()
  const ports: Ports = {
    channelFactory: defaultTransportFactory(config.public.wsUrl as string),
    encryptedChannelFactory: (ring) => (roomId, handlers) => new EncryptedRelayTransport(
      buildWs2Url(config.public.wsUrl as string, roomId, window.location), ring, handlers,
      (async () => ({
        contentKey: await deriveContentKey(fromBase64Url(ring.roomKey)!, ring.roomId),
        session: await createSessionSigner(),
        facilitator: ring.facilitatorSecret ? await signerFor(ring.facilitatorSecret) : null,
        verifier: ed25519Verifier,
      }))(),
    ),
    clipboard: {
      writeText: (text) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('clipboard unavailable'))),
    },
    file: { save: download },
    notifier: { notify: push },
  }
  return { provide: { ports } }
})
