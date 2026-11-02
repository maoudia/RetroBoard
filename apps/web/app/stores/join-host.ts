import { fromBase64Url, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'
import { openJoinChannel, type JoinChannel } from '~/adapters/join-channel'
import { JOIN_TTL_MS, newJoinCode, safetyNumber } from '~/utils/join-code'

export interface Knock { n: string, name: string, pub: string, number: string }
const MAX_KNOCKS = 5

/**
 * Holder side of the join code (change short-links-and-join): any participant who has the board can show a code
 * and let a knocker in. The board link is sealed to the knocker's one-time key; the code expires after 10 minutes.
 */
export const useJoinHostStore = defineStore('join-host', () => {
  const config = useRuntimeConfig()
  const code = ref<string | null>(null)
  const expiresAt = ref(0)
  const knocks = ref<Knock[]>([])
  const connected = ref(false)
  let channel: JoinChannel | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop() {
    clearTimeout(timer)
    channel?.close()
    channel = null
    code.value = null
    knocks.value = []
    connected.value = false
  }

  async function start(link: () => string) {
    stop()
    const c = newJoinCode()
    code.value = c
    expiresAt.value = Date.now() + JOIN_TTL_MS
    timer = setTimeout(stop, JOIN_TTL_MS)
    const ch = await openJoinChannel(c, String(config.public.wsUrl ?? ''), {
      onOpen: () => { connected.value = true },
      onClose: () => { connected.value = false },
      onMessage: (m) => {
        if (m.t !== 'knock' || knocks.value.length >= MAX_KNOCKS || knocks.value.some((k) => k.n === m.n)) return
        const pub = fromBase64Url(m.pub)
        if (!pub || pub.length !== 32) return
        void safetyNumber(pub).then((number) => { knocks.value = [...knocks.value, { n: m.n, name: m.name, pub: m.pub, number }] })
      },
    })
    if (code.value !== c) { ch.close(); return }
    channel = ch
    // The link is read when somebody is let in, so it is always the current one.
    linkOf = link
  }
  let linkOf: () => string = () => ''

  async function admit(k: Knock) {
    const pub = fromBase64Url(k.pub)
    if (!pub || !channel) return
    const ct = await sealTo(pub, utf8(linkOf()), utf8(k.n))
    channel.send({ t: 'let', n: k.n, ct: toBase64Url(ct) })
    knocks.value = knocks.value.filter((x) => x.n !== k.n)
  }
  function refuse(k: Knock) {
    channel?.send({ t: 'deny', n: k.n })
    knocks.value = knocks.value.filter((x) => x.n !== k.n)
  }
  return { code, expiresAt, knocks, connected, start, stop, admit, refuse }
})
