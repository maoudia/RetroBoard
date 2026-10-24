import type { ChannelFactory, ClipboardPort, FilePort, NotifierPort } from '@retroboard/application'
import { defaultTransportFactory } from '~/transport'
import { download } from '~/utils/export'

export interface Ports {
  channelFactory: ChannelFactory
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
    clipboard: {
      writeText: (text) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('clipboard unavailable'))),
    },
    file: { save: download },
    notifier: { notify: push },
  }
  return { provide: { ports } }
})
