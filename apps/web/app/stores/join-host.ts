import { openJoinChannel } from '~/adapters/join-channel'
import { createJoinHost, type HostState, type Knock } from '~/utils/join-flow'

export type { Knock }

/** Holder side of the join code (change short-links-and-join): the flow lives in `join-flow.ts`, this keeps its state reactive. */
export const useJoinHostStore = defineStore('join-host', () => {
  const config = useRuntimeConfig()
  const state = reactive<HostState>({ code: null, expiresAt: 0, knocks: [], connected: false, imitation: false })
  const host = createJoinHost({ openChannel: (code, handlers) => openJoinChannel(code, String(config.public.wsUrl ?? ''), handlers) }, state)
  return { ...toRefs(state), start: host.start, stop: host.stop, admit: host.admit, refuse: host.refuse }
})
