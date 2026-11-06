import { agreementKeyPair, fromBase64Url, fromUtf8, openFrom, toBase64Url, utf8 } from '@retroboard/crypto'
import { openJoinChannel } from '~/adapters/join-channel'
import { normalizeJoinCode, safetyNumber } from '~/utils/join-code'

export type JoinState = 'idle' | 'connecting' | 'waiting' | 'denied' | 'timeout' | 'failed'
const WAIT_MS = 90_000

/** Joiner side of the join code (change short-links-and-join). Resolves to the board link (`/boards#...`, or `/board#...` from a holder on an older version) or null. */
export function useJoinByCode() {
  const config = useRuntimeConfig()
  const state = ref<JoinState>('idle')
  const number = ref('')
  let cancel: (() => void) | null = null

  function reset() { cancel?.(); cancel = null; state.value = 'idle'; number.value = '' }

  async function join(text: string, name: string): Promise<string | null> {
    const code = normalizeJoinCode(text)
    if (!code) { state.value = 'failed'; return null }
    reset()
    state.value = 'connecting'
    const me = await agreementKeyPair()
    const n = toBase64Url(crypto.getRandomValues(new Uint8Array(12)))
    number.value = await safetyNumber(me.publicKey)
    return await new Promise<string | null>((resolve) => {
      let done = false
      let ch: Awaited<ReturnType<typeof openJoinChannel>> | null = null
      const finish = (link: string | null, next: JoinState) => { if (done) return; done = true; clearTimeout(timer); ch?.close(); state.value = next; resolve(link) }
      const timer = setTimeout(() => finish(null, 'timeout'), WAIT_MS)
      cancel = () => finish(null, 'idle')
      void openJoinChannel(code, String(config.public.wsUrl ?? ''), {
        onOpen: () => { state.value = 'waiting'; ch?.send({ t: 'knock', n, pub: toBase64Url(me.publicKey), name: name.slice(0, 40) }) },
        onClose: () => finish(null, 'failed'),
        onMessage: (m) => {
          if (m.n !== n) return
          if (m.t === 'deny') return finish(null, 'denied')
          if (m.t !== 'let') return
          const ct = fromBase64Url(m.ct)
          void (ct ? openFrom(me, ct, utf8(n)) : Promise.resolve(null)).then((pt) => {
            const link = pt ? fromUtf8(pt) : ''
            // Only a link to this site's board page is followed.
            const own = link.startsWith(window.location.origin) ? link.slice(window.location.origin.length) : link
            if (/^\/boards?#/.test(own)) finish(own, 'idle')
            else finish(null, 'failed')
          })
        },
      }).then((c) => { ch = c; if (done) c.close() }).catch(() => finish(null, 'failed'))
    })
  }
  return { state, number, join, cancel: reset }
}
