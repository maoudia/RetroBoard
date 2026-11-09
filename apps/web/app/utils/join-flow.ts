import { agreementKeyPair, fromBase64Url, fromUtf8, openFrom, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'
import { type JoinMsg, JOIN_TTL_MS, newJoinCode, normalizeJoinCode, safetyNumber } from './join-code'

/**
 * The two sides of the join code (change short-links-and-join), free of Nuxt so they are unit tested:
 * the person holding the board shows a code and lets knockers in, the joiner knocks with a one-time key.
 * The channel to the side room on the relay is injected.
 */
export interface JoinChannel {
  send(msg: JoinMsg): void
  close(): void
}
export interface ChannelHandlers { onMessage(m: JoinMsg): void; onOpen?(): void; onClose?(): void }
export type OpenChannel = (code: string, handlers: ChannelHandlers) => Promise<JoinChannel>

export interface Knock { n: string; name: string; pub: string; number: string }
/** `imitation`: two requests showed the same safety number, so both were refused (someone tried to pass for another person). */
export interface HostState { code: string | null; expiresAt: number; knocks: Knock[]; connected: boolean; imitation: boolean }

export const MAX_KNOCKS = 5
export const JOINER_WAIT_MS = 90_000
export type JoinState = 'idle' | 'connecting' | 'waiting' | 'denied' | 'timeout' | 'failed'

export interface HostDeps { openChannel: OpenChannel; newCode?: () => string; now?: () => number; ttlMs?: number }

/** Holder side: any participant who has the board can show a code (valid 10 minutes) and let a knocker in. */
export function createJoinHost(deps: HostDeps, state: HostState) {
  const { openChannel, newCode = newJoinCode, now = Date.now, ttlMs = JOIN_TTL_MS } = deps
  let channel: JoinChannel | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  // Knocks whose safety number is still being computed: they count against the limit and the duplicates already.
  const pending = new Set<string>()
  // Safety numbers seen twice for this code: nobody gets in with them, whatever the name or the nonce.
  const imitated = new Set<string>()
  // The link is read when somebody is let in, so it is always the current one.
  let linkOf: () => string = () => ''

  function stop() {
    clearTimeout(timer)
    channel?.close()
    channel = null
    pending.clear()
    imitated.clear()
    state.code = null
    state.knocks = []
    state.connected = false
    state.imitation = false
  }

  async function start(link: () => string) {
    stop()
    const c = newCode()
    state.code = c
    state.expiresAt = now() + ttlMs
    timer = setTimeout(stop, ttlMs)
    const ch = await openChannel(c, {
      onOpen: () => { state.connected = true },
      onClose: () => { state.connected = false },
      onMessage: (m) => {
        if (m.t !== 'knock' || state.knocks.length + pending.size >= MAX_KNOCKS || pending.has(m.n) || state.knocks.some((k) => k.n === m.n)) return
        const pub = fromBase64Url(m.pub)
        if (!pub || pub.length !== 32) return
        pending.add(m.n)
        void safetyNumber(pub).then((number) => {
          // The code may have been stopped meanwhile: its knocks are gone for good.
          if (!pending.delete(m.n) || state.code !== c) return
          // A key pair is cheap to search for until its number matches another person's: two identical numbers are an imitation.
          const twin = state.knocks.find((k) => k.number === number)
          if (twin || imitated.has(number)) {
            imitated.add(number)
            state.knocks = state.knocks.filter((k) => k.number !== number)
            state.imitation = true
            return
          }
          state.knocks = [...state.knocks, { n: m.n, name: m.name, pub: m.pub, number }]
        })
      },
    })
    if (state.code !== c) { ch.close(); return }
    channel = ch
    linkOf = link
  }

  /** Seals the board link to the knocker's one-time key: nobody else, the relay included, can open it. */
  async function admit(k: Knock) {
    const pub = fromBase64Url(k.pub)
    if (!pub || !channel) return
    const ct = await sealTo(pub, utf8(linkOf()), utf8(k.n))
    channel.send({ t: 'let', n: k.n, ct: toBase64Url(ct) })
    state.knocks = state.knocks.filter((x) => x.n !== k.n)
  }

  function refuse(k: Knock) {
    channel?.send({ t: 'deny', n: k.n })
    state.knocks = state.knocks.filter((x) => x.n !== k.n)
  }

  return { start, stop, admit, refuse }
}

export interface JoinerState { state: JoinState; number: string }
export interface JoinerDeps { openChannel: OpenChannel; origin: string; waitMs?: number }

/** Joiner side: knocks with a one-time key and waits for the link, sealed to that key, or for a refusal. */
export function createJoiner(deps: JoinerDeps, ui: JoinerState) {
  const { openChannel, origin, waitMs = JOINER_WAIT_MS } = deps
  let cancel: (() => void) | null = null

  function reset() { cancel?.(); cancel = null; ui.state = 'idle'; ui.number = '' }

  /** Resolves to the board path and hash (`/boards#...`, or `/board#...` from a holder on an older version), or null. */
  async function join(text: string, name: string): Promise<string | null> {
    const code = normalizeJoinCode(text)
    if (!code) { ui.state = 'failed'; return null }
    reset()
    ui.state = 'connecting'
    const me = await agreementKeyPair()
    const n = toBase64Url(crypto.getRandomValues(new Uint8Array(12)))
    ui.number = await safetyNumber(me.publicKey)
    return await new Promise<string | null>((resolve) => {
      let done = false
      let ch: JoinChannel | null = null
      const finish = (link: string | null, next: JoinState) => { if (done) return; done = true; clearTimeout(timer); ch?.close(); ui.state = next; resolve(link) }
      const timer = setTimeout(() => finish(null, 'timeout'), waitMs)
      cancel = () => finish(null, 'idle')
      void openChannel(code, {
        onOpen: () => { ui.state = 'waiting'; ch?.send({ t: 'knock', n, pub: toBase64Url(me.publicKey), name: name.slice(0, 40) }) },
        onClose: () => finish(null, 'failed'),
        onMessage: (m) => {
          if (m.n !== n) return
          if (m.t === 'deny') return finish(null, 'denied')
          if (m.t !== 'let') return
          const ct = fromBase64Url(m.ct)
          void (ct ? openFrom(me, ct, utf8(n)) : Promise.resolve(null)).then((pt) => {
            const link = pt ? fromUtf8(pt) : ''
            // Only a link to this site's board page is followed.
            const own = link.startsWith(origin) ? link.slice(origin.length) : link
            if (/^\/boards?#/.test(own)) finish(own, 'idle')
            else finish(null, 'failed')
          })
        },
      }).then((c) => { ch = c; if (done) c.close() }).catch(() => finish(null, 'failed'))
    })
  }

  return { join, cancel: reset }
}
