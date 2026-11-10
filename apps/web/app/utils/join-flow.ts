import { agreementKeyPair, fromBase64Url, fromUtf8, openFrom, randomBytes, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'
import { commitKey, committedNumber, type JoinMsg, JOIN_TTL_MS, newJoinCode, normalizeJoinCode, safetyNumber } from './join-code'

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

/** `verified`: the key was committed before the holder's challenge; a request from an older joiner is not. */
export interface Knock { n: string; name: string; pub: string; number: string; verified: boolean }
/** `imitation`: two requests showed the same safety number, so both were refused (someone tried to pass for another person). */
export interface HostState { code: string | null; expiresAt: number; knocks: Knock[]; connected: boolean; imitation: boolean }

export const MAX_KNOCKS = 5
export const JOINER_WAIT_MS = 90_000
/** A joiner falls back to the plain knock when the holder does not answer its committed one (an older holder). */
export const COMMIT_WAIT_MS = 3_000
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
  // Committed knocks waiting for their key: nonce -> commitment, name and the challenge sent back.
  const commits = new Map<string, { c: string; name: string; h: Uint8Array }>()

  /** A key pair is cheap to search for until its number matches another person's: two identical numbers are an imitation. */
  function addKnock(k: Knock) {
    const twin = state.knocks.find((x) => x.number === k.number)
    if (twin || imitated.has(k.number)) {
      imitated.add(k.number)
      state.knocks = state.knocks.filter((x) => x.number !== k.number)
      state.imitation = true
      return
    }
    state.knocks = [...state.knocks, k]
  }
  // The link is read when somebody is let in, so it is always the current one.
  let linkOf: () => string = () => ''

  function stop() {
    clearTimeout(timer)
    channel?.close()
    channel = null
    pending.clear()
    commits.clear()
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
        if (m.t === 'knock2') {
          if (state.knocks.length + pending.size + commits.size >= MAX_KNOCKS || pending.has(m.n) || commits.has(m.n) || state.knocks.some((k) => k.n === m.n)) return
          // The holder's value is chosen after the commitment, so a key cannot be searched for a number.
          const h = randomBytes(16)
          commits.set(m.n, { c: m.c, name: m.name, h })
          channel?.send({ t: 'challenge', n: m.n, h: toBase64Url(h) })
          return
        }
        if (m.t === 'reveal') {
          const held = commits.get(m.n)
          const pub = fromBase64Url(m.pub)
          if (!held || !pub || pub.length !== 32) return
          commits.delete(m.n)
          pending.add(m.n)
          void (async () => {
            const [ok, number] = await Promise.all([commitKey(pub, m.n).then((x) => x === held.c), committedNumber(pub, held.h, m.n)])
            if (!pending.delete(m.n) || state.code !== c || !ok) return
            addKnock({ n: m.n, name: held.name, pub: m.pub, number, verified: true })
          })()
          return
        }
        if (m.t !== 'knock' || state.knocks.length + pending.size + commits.size >= MAX_KNOCKS || pending.has(m.n) || state.knocks.some((k) => k.n === m.n)) return
        const pub = fromBase64Url(m.pub)
        if (!pub || pub.length !== 32) return
        pending.add(m.n)
        void safetyNumber(pub).then((number) => {
          // The code may have been stopped meanwhile: its knocks are gone for good.
          if (!pending.delete(m.n) || state.code !== c) return
          addKnock({ n: m.n, name: m.name, pub: m.pub, number, verified: false })
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
  async function join(text: string, displayName: string): Promise<string | null> {
    const code = normalizeJoinCode(text)
    if (!code) { ui.state = 'failed'; return null }
    reset()
    ui.state = 'connecting'
    const me = await agreementKeyPair()
    const n = toBase64Url(crypto.getRandomValues(new Uint8Array(12)))
    return await new Promise<string | null>((resolve) => {
      let done = false
      let ch: JoinChannel | null = null
      let fallback: ReturnType<typeof setTimeout> | undefined
      const finish = (link: string | null, next: JoinState) => { if (done) return; done = true; clearTimeout(timer); clearTimeout(fallback); ch?.close(); ui.state = next; resolve(link) }
      const pub = toBase64Url(me.publicKey)
      const name = displayName.slice(0, 40)
      /** An older holder ignores the committed knock: knock the plain way, with the plain number. */
      const knockPlain = () => { ch?.send({ t: 'knock', n, pub, name }); void safetyNumber(me.publicKey).then((number) => { if (!done) ui.number = number }) }
      const timer = setTimeout(() => finish(null, 'timeout'), waitMs)
      cancel = () => finish(null, 'idle')
      void openChannel(code, {
        onOpen: () => {
          ui.state = 'waiting'
          void commitKey(me.publicKey, n).then((c) => {
            if (done) return
            ch?.send({ t: 'knock2', n, c, name })
            fallback = setTimeout(knockPlain, COMMIT_WAIT_MS)
          })
        },
        onClose: () => finish(null, 'failed'),
        onMessage: (m) => {
          if (m.n !== n) return
          if (m.t === 'deny') return finish(null, 'denied')
          if (m.t === 'challenge') {
            // The holder answered: reveal the key, and show the number that depends on the holder's value.
            const h = fromBase64Url(m.h)
            if (!h || h.length !== 16 || ui.number) return
            clearTimeout(fallback)
            ch?.send({ t: 'reveal', n, pub })
            void committedNumber(me.publicKey, h, n).then((number) => { if (!done) ui.number = number })
            return
          }
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
