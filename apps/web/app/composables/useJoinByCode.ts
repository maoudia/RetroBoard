import { openJoinChannel } from '~/adapters/join-channel'
import { createJoiner, type JoinerState } from '~/utils/join-flow'

/** Joiner side of the join code (change short-links-and-join): the flow lives in `join-flow.ts`, this keeps its state reactive. */
export function useJoinByCode() {
  const config = useRuntimeConfig()
  const ui = reactive<JoinerState>({ state: 'idle', number: '' })
  const joiner = createJoiner({ openChannel: (code, handlers) => openJoinChannel(code, String(config.public.wsUrl ?? ''), handlers), origin: window.location.origin }, ui)
  return { ...toRefs(ui), join: joiner.join, cancel: joiner.cancel }
}
