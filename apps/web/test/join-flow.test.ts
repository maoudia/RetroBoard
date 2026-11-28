import { agreementKeyPair, fromBase64Url, fromUtf8, openFrom, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JoinMsg } from '../app/utils/join-code'
import { commitKey, committedNumber } from '../app/utils/join-code'
import { type ChannelHandlers, COMMIT_WAIT_MS, createJoiner, createJoinHost, type HostState, type JoinerState, JOINER_WAIT_MS, MAX_KNOCKS } from '../app/utils/join-flow'

/** A fake side room: records what is sent and closed, and lets the test play the other end. */
function fakeRelay() {
  const sent: JoinMsg[] = []
  const state = { closed: 0, opened: 0, code: '', handlers: undefined as ChannelHandlers | undefined, fail: false }
  const openChannel = async (code: string, handlers: ChannelHandlers) => {
    if (state.fail) throw new Error('offline')
    state.opened++
    state.code = code
    state.handlers = handlers
    return { send: (m: JoinMsg) => { sent.push(m) }, close: () => { state.closed++ } }
  }
  return { sent, state, openChannel }
}

/** The real setTimeout, taken before the fake one is installed: WebCrypto answers on real threads, so these waits are real time. */
const realSetTimeout = globalThis.setTimeout
const sleep = (ms: number) => new Promise<void>((resolve) => { realSetTimeout(resolve, ms) })
/** Lets pending WebCrypto work finish, for tests that assert something did NOT happen. */
const flush = () => sleep(25)
/** Waits (up to 3 s) for something to happen. */
async function until(condition: () => boolean) {
  for (let i = 0; i < 600 && !condition(); i++) await sleep(5)
  expect(condition()).toBe(true)
}
const newHostState = (): HostState => ({ code: null, expiresAt: 0, knocks: [], connected: false, imitation: false })

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }) })
afterEach(() => { vi.useRealTimers() })

/** The committed exchange as a joiner plays it: knock2, then the key once the holder challenged. */
async function knockIn(relay: ReturnType<typeof fakeRelay>, n: string, name = 'Bob') {
  const keys = await agreementKeyPair()
  relay.state.handlers!.onMessage({ t: 'knock2', n, c: await commitKey(keys.publicKey, n), name })
  const challenge = relay.sent.find((m) => m.t === 'challenge' && m.n === n) as Extract<JoinMsg, { t: 'challenge' }> | undefined
  if (challenge) relay.state.handlers!.onMessage({ t: 'reveal', n, pub: toBase64Url(keys.publicKey) })
  return { keys, pub: toBase64Url(keys.publicKey), h: challenge && fromBase64Url(challenge.h)! }
}

describe('join code, holder side', () => {
  async function started(over: { ttlMs?: number; link?: () => string } = {}) {
    const relay = fakeRelay()
    const state = newHostState()
    const host = createJoinHost({ openChannel: relay.openChannel, newCode: () => 'RB-AAAAAA', now: () => 1_000, ttlMs: over.ttlMs ?? 600_000 }, state)
    await host.start(over.link ?? (() => 'https://x.test/boards#c=link'))
    return { relay, state, host }
  }

  it('shows the code with its expiry and says when the side room is connected', async () => {
    const { relay, state } = await started()
    expect(state).toMatchObject({ code: 'RB-AAAAAA', expiresAt: 601_000, knocks: [], connected: false })
    expect(relay.state.code).toBe('RB-AAAAAA')
    relay.state.handlers!.onOpen!()
    expect(state.connected).toBe(true)
    relay.state.handlers!.onClose!()
    expect(state.connected).toBe(false)
  })

  it('stops by itself after 10 minutes: the code is gone, the knocks too, and the side room is closed', async () => {
    const { relay, state } = await started({ ttlMs: 600_000 })
    await knockIn(relay, 'n1')
    await until(() => state.knocks.length === 1)
    await vi.advanceTimersByTimeAsync(599_999)
    expect(state.code).toBe('RB-AAAAAA')
    await vi.advanceTimersByTimeAsync(1)
    expect(state).toMatchObject({ code: null, knocks: [], connected: false })
    expect(relay.state.closed).toBe(1)
  })

  it('answers a committed knock with a challenge, and shows the number that depends on it once the key matches the commitment', async () => {
    const { relay, state } = await started()
    const keys = await agreementKeyPair()
    const n = 'c1'
    relay.state.handlers!.onMessage({ t: 'knock2', n, c: await commitKey(keys.publicKey, n), name: 'Bob' })
    await until(() => relay.sent.some((m) => m.t === 'challenge'))
    const challenge = relay.sent.find((m) => m.t === 'challenge') as Extract<JoinMsg, { t: 'challenge' }>
    expect(challenge.n).toBe(n)
    expect(fromBase64Url(challenge.h)).toHaveLength(16)
    // A key that is not the committed one is dropped.
    const other = await agreementKeyPair()
    relay.state.handlers!.onMessage({ t: 'reveal', n, pub: toBase64Url(other.publicKey) })
    await flush()
    expect(state.knocks).toEqual([])
  })

  it('lists a committed knock with its name and a number that no other request can be ground to match', async () => {
    const { relay, state } = await started()
    const real = await agreementKeyPair()
    relay.state.handlers!.onMessage({ t: 'knock2', n: 'real', c: await commitKey(real.publicKey, 'real'), name: 'Bob' })
    await until(() => relay.sent.filter((m) => m.t === 'challenge').length === 1)
    const h = fromBase64Url((relay.sent[0] as Extract<JoinMsg, { t: 'challenge' }>).h)!
    // Someone who read the commitment commits to a key of their own: it gets its own challenge, so its number differs.
    const attacker = await agreementKeyPair()
    relay.state.handlers!.onMessage({ t: 'knock2', n: 'evil', c: await commitKey(attacker.publicKey, 'evil'), name: 'Bob' })
    await until(() => relay.sent.filter((m) => m.t === 'challenge').length === 2)
    const h2 = fromBase64Url((relay.sent[1] as Extract<JoinMsg, { t: 'challenge' }>).h)!
    expect(h2).not.toEqual(h)
    relay.state.handlers!.onMessage({ t: 'reveal', n: 'real', pub: toBase64Url(real.publicKey) })
    relay.state.handlers!.onMessage({ t: 'reveal', n: 'evil', pub: toBase64Url(attacker.publicKey) })
    await until(() => state.knocks.length === 2)
    expect(state.imitation).toBe(false)
    const byNonce = Object.fromEntries(state.knocks.map((k) => [k.n, k]))
    expect(byNonce.real).toMatchObject({ name: 'Bob', number: await committedNumber(real.publicKey, h, 'real') })
    expect(byNonce.evil!.number).toBe(await committedNumber(attacker.publicKey, h2, 'evil'))
    expect(byNonce.evil!.number).not.toBe(byNonce.real!.number)
  })

  it('keeps at most five knocks, one per attempt, and only from a key of the right size', async () => {
    const { relay, state } = await started()
    for (let i = 0; i < MAX_KNOCKS + 3; i++) await knockIn(relay, `n${i}`)
    await until(() => state.knocks.length === MAX_KNOCKS)
    await flush()
    expect(state.knocks.map((k) => k.n).sort()).toEqual(['n0', 'n1', 'n2', 'n3', 'n4'])
    const fresh = await started()
    await knockIn(fresh.relay, 'same')
    await knockIn(fresh.relay, 'same')
    await until(() => fresh.state.knocks.length === 1)
    await flush()
    expect(fresh.state.knocks).toHaveLength(1)
    for (const [n, pub] of [['short', toBase64Url(new Uint8Array(31))], ['long', toBase64Url(new Uint8Array(33))], ['junk', '!!not base64!!']] as const) {
      fresh.relay.state.handlers!.onMessage({ t: 'knock2', n, c: await commitKey(new Uint8Array(32), n), name: 'x' })
      fresh.relay.state.handlers!.onMessage({ t: 'reveal', n, pub })
    }
    await flush()
    expect(fresh.state.knocks.map((k) => k.n)).toEqual(['same'])
  })

  it('does not add a knock whose safety number was still being computed when the code stopped', async () => {
    const { relay, state, host } = await started()
    await knockIn(relay, 'late')
    host.stop()
    await flush()
    expect(state.knocks).toEqual([])
  })

  it('ignores what is not a knock, and refuses a plain knock that carries no commitment (change join-code-drop-fallback)', async () => {
    const { relay, state } = await started()
    relay.state.handlers!.onMessage({ t: 'knock', n: 'old', pub: toBase64Url((await agreementKeyPair()).publicKey), name: 'Old' } as never)
    relay.state.handlers!.onMessage({ t: 'let', n: 'n1', ct: 'x' })
    relay.state.handlers!.onMessage({ t: 'deny', n: 'n1' })
    await flush()
    expect(state.knocks).toEqual([])
    expect(relay.sent).toEqual([])
  })

  it('lets a knocker in by sealing the current link to his key alone', async () => {
    let link = 'https://x.test/boards#c=old'
    const { relay, state, host } = await started({ link: () => link })
    const bob = await knockIn(relay, 'n1')
    await until(() => state.knocks.length === 1)
    link = 'https://x.test/boards#c=new'
    await host.admit(state.knocks[0]!)
    expect(state.knocks).toEqual([])
    const let1 = relay.sent.find((m) => m.t === 'let')
    expect(let1).toMatchObject({ t: 'let', n: 'n1' })
    const ct = fromBase64Url((let1 as { ct: string }).ct)!
    expect(fromUtf8((await openFrom(bob.keys, ct, utf8('n1')))!)).toBe('https://x.test/boards#c=new')
    expect(await openFrom(await agreementKeyPair(), ct, utf8('n1'))).toBeNull()
    expect(await openFrom(bob.keys, ct, utf8('other'))).toBeNull()
  })

  it('lets only the knocker who asked in, and nobody once the code is gone', async () => {
    const { relay, state, host } = await started()
    await knockIn(relay, 'a')
    await knockIn(relay, 'b')
    await until(() => state.knocks.length === 2)
    await host.admit(state.knocks.find((k) => k.n === 'b')!)
    expect(state.knocks.map((k) => k.n)).toEqual(['a'])
    const left = state.knocks[0]!
    host.stop()
    relay.sent.length = 0
    await host.admit(left)
    expect(relay.sent).toEqual([])
    await host.admit({ ...left, pub: '!!bad!!' })
    expect(relay.sent).toEqual([])
  })

  it('refuses a knocker with a deny addressed to him', async () => {
    const { relay, state, host } = await started()
    await knockIn(relay, 'a')
    await knockIn(relay, 'b')
    await until(() => state.knocks.length === 2)
    host.refuse(state.knocks.find((k) => k.n === 'a')!)
    expect(relay.sent.filter((m) => m.t === 'deny')).toEqual([{ t: 'deny', n: 'a' }])
    expect(state.knocks.map((k) => k.n)).toEqual(['b'])
  })

  it('shows a new code when started again and closes the previous side room', async () => {
    const relay = fakeRelay()
    const state = newHostState()
    let i = 0
    const host = createJoinHost({ openChannel: relay.openChannel, newCode: () => `RB-CODE0${++i}` }, state)
    await host.start(() => 'l')
    await host.start(() => 'l')
    expect(state.code).toBe('RB-CODE02')
    expect(relay.state.opened).toBe(2)
    expect(relay.state.closed).toBe(1)
  })

  it('closes a side room that opened after the code was stopped', async () => {
    const state = newHostState()
    let release: () => void = () => {}
    const channel = { send() {}, close: vi.fn() }
    const host = createJoinHost({ openChannel: () => new Promise((resolve) => { release = () => resolve(channel) }), newCode: () => 'RB-AAAAAA' }, state)
    const pending = host.start(() => 'l')
    host.stop()
    release()
    await pending
    expect(channel.close).toHaveBeenCalledTimes(1)
    expect(state.code).toBeNull()
  })

  it('refuses nobody and lets nobody in before the side room is open', async () => {
    const state = newHostState()
    const host = createJoinHost({ openChannel: () => new Promise(() => {}), newCode: () => 'RB-AAAAAA' }, state)
    void host.start(() => 'l')
    const knock = { n: 'a', name: 'A', pub: toBase64Url((await agreementKeyPair()).publicKey), number: '000 000' }
    await expect(host.admit(knock)).resolves.toBeUndefined()
    expect(() => host.refuse(knock)).not.toThrow()
  })
})

describe('join code, joiner side', () => {
  const origin = 'https://retroboard.test'
  function setup(over: { waitMs?: number } = {}) {
    const relay = fakeRelay()
    const ui: JoinerState = { state: 'idle', number: '' }
    const joiner = createJoiner({ openChannel: relay.openChannel, origin, ...over }, ui)
    return { relay, ui, joiner }
  }
  /** Starts a join, plays the relay opening and the holder's challenge, and returns the key the joiner then revealed. */
  async function knocking(s: ReturnType<typeof setup>, text = 'rb-7kq2m9', name = 'Bob') {
    const result = s.joiner.join(text, name)
    await until(() => !!s.relay.state.handlers)
    s.relay.state.handlers!.onOpen!()
    await until(() => s.relay.sent.some((m) => m.t === 'knock2'))
    const knock2 = s.relay.sent.find((m) => m.t === 'knock2') as Extract<JoinMsg, { t: 'knock2' }>
    const h = crypto.getRandomValues(new Uint8Array(16))
    s.relay.state.handlers!.onMessage({ t: 'challenge', n: knock2.n, h: toBase64Url(h) })
    await until(() => s.relay.sent.some((m) => m.t === 'reveal'))
    await until(() => !!s.ui.number)
    const knock = { ...(s.relay.sent.find((m) => m.t === 'reveal') as Extract<JoinMsg, { t: 'reveal' }>), name: knock2.name, h }
    return { result, knock }
  }
  const letFor = async (knock: { n: string; pub: string }, link: string, n = knock.n): Promise<JoinMsg> =>
    ({ t: 'let', n, ct: toBase64Url(await sealTo(fromBase64Url(knock.pub)!, utf8(link), utf8(knock.n))) })

  it('does not knock for something that is not a code', async () => {
    const { relay, ui, joiner } = setup()
    expect(await joiner.join('hello', 'Bob')).toBeNull()
    expect(ui.state).toBe('failed')
    expect(relay.state.opened).toBe(0)
  })

  it('knocks on the side room of the code with a one-time key, the name cut to 40 characters, and shows the number', async () => {
    const s = setup()
    const { knock } = await knocking(s, 'rb 7kq2m9', 'B'.repeat(60))
    expect(s.relay.state.code).toBe('RB-7KQ2M9')
    expect(s.ui.state).toBe('waiting')
    expect(knock).toMatchObject({ t: 'reveal', name: 'B'.repeat(40) })
    expect(fromBase64Url(knock.pub)).toHaveLength(32)
    expect(s.ui.number).toBe(await committedNumber(fromBase64Url(knock.pub)!, knock.h, knock.n))
    expect(s.ui.number).toMatch(/^\d{3} \d{3}$/)
  })

  it('commits to its key first, reveals it after the holder challenge, and shows the number that depends on the challenge', async () => {
    const s = setup()
    const result = s.joiner.join('rb-7kq2m9', 'Bob')
    await until(() => !!s.relay.state.handlers)
    s.relay.state.handlers!.onOpen!()
    await until(() => s.relay.sent.length === 1)
    const knock2 = s.relay.sent[0] as Extract<JoinMsg, { t: 'knock2' }>
    expect(knock2).toMatchObject({ t: 'knock2', name: 'Bob' })
    expect(s.relay.sent.some((m) => m.t === 'reveal')).toBe(false)
    const h = crypto.getRandomValues(new Uint8Array(16))
    s.relay.state.handlers!.onMessage({ t: 'challenge', n: knock2.n, h: toBase64Url(h) })
    await until(() => s.relay.sent.some((m) => m.t === 'reveal'))
    const reveal = s.relay.sent.find((m) => m.t === 'reveal') as Extract<JoinMsg, { t: 'reveal' }>
    const pub = fromBase64Url(reveal.pub)!
    expect(await commitKey(pub, knock2.n)).toBe(knock2.c)
    await until(() => !!s.ui.number)
    expect(s.ui.number).toBe(await committedNumber(pub, h, knock2.n))
    // The challenge arrived: nobody is told to update.
    vi.advanceTimersByTime(COMMIT_WAIT_MS * 2)
    await flush()
    expect(s.ui.state).toBe('waiting')
    s.relay.state.handlers!.onMessage({ t: 'let', n: knock2.n, ct: toBase64Url(await sealTo(pub, utf8(`${origin}/boards#c=abc`), utf8(knock2.n))) })
    expect(await result).toBe('/boards#c=abc')
  })

  it('ignores a challenge for another request or of the wrong size', async () => {
    const s = setup()
    s.joiner.join('rb-7kq2m9', 'Bob')
    await until(() => !!s.relay.state.handlers)
    s.relay.state.handlers!.onOpen!()
    await until(() => s.relay.sent.length === 1)
    const knock2 = s.relay.sent[0] as Extract<JoinMsg, { t: 'knock2' }>
    s.relay.state.handlers!.onMessage({ t: 'challenge', n: 'someone-else', h: toBase64Url(new Uint8Array(16)) })
    s.relay.state.handlers!.onMessage({ t: 'challenge', n: knock2.n, h: toBase64Url(new Uint8Array(8)) })
    await flush()
    expect(s.relay.sent.some((m) => m.t === 'reveal')).toBe(false)
    s.joiner.cancel()
  })

  it('opens the board link that was sealed to him, from this site, and closes the side room', async () => {
    const s = setup()
    const { result, knock } = await knocking(s)
    s.relay.state.handlers!.onMessage(await letFor(knock, `${origin}/boards#c=abc`))
    expect(await result).toBe('/boards#c=abc')
    expect(s.ui.state).toBe('idle')
    expect(s.relay.state.closed).toBe(1)
  })

  it('follows a link in the previous /board format sent by a holder on an older version', async () => {
    const s = setup()
    const { result, knock } = await knocking(s)
    s.relay.state.handlers!.onMessage(await letFor(knock, '/board#r=abc&k=def'))
    expect(await result).toBe('/board#r=abc&k=def')
  })

  it('follows a link to a poker room, the same way', async () => {
    const s = setup()
    const { result, knock } = await knocking(s)
    s.relay.state.handlers!.onMessage(await letFor(knock, `${origin}/poker/room#c=abc`))
    expect(await result).toBe('/poker/room#c=abc')
  })

  it.each(['https://evil.test/boards#c=abc', `${origin}/poker/rooms#c=abc`, `${origin}/poker#c=abc`, `${origin}/poker/room`, `${origin}/other#c=abc`, '/boards', 'javascript:alert(1)', `${origin}.evil.test/boards#c=x`])('does not follow %s', async (link) => {
    const s = setup()
    const { result, knock } = await knocking(s)
    s.relay.state.handlers!.onMessage(await letFor(knock, link))
    expect(await result).toBeNull()
    expect(s.ui.state).toBe('failed')
  })

  it('fails on a link sealed to somebody else, and on a hand-off that is not even a ciphertext', async () => {
    const a = setup()
    const first = await knocking(a)
    const other = await agreementKeyPair()
    a.relay.state.handlers?.onMessage({ t: 'let', n: first.knock.n, ct: toBase64Url(await sealTo(other.publicKey, utf8(`${origin}/boards#c=abc`), utf8(first.knock.n))) })
    expect(await first.result).toBeNull()
    expect(a.ui.state).toBe('failed')
    const b = setup()
    const second = await knocking(b)
    b.relay.state.handlers!.onMessage({ t: 'let', n: second.knock.n, ct: '!!not base64!!' })
    expect(await second.result).toBeNull()
    expect(b.ui.state).toBe('failed')
  })

  it('ignores messages that answer another knock, and what is not a hand-off or a refusal', async () => {
    const s = setup()
    const { result, knock } = await knocking(s)
    s.relay.state.handlers!.onMessage(await letFor(knock, `${origin}/boards#c=abc`, 'someone-else'))
    s.relay.state.handlers!.onMessage({ t: 'deny', n: 'someone-else' })
    s.relay.state.handlers!.onMessage({ t: 'knock2', n: knock.n, c: 'x', name: 'x' })
    await flush()
    expect(s.ui.state).toBe('waiting')
    s.relay.state.handlers!.onMessage({ t: 'deny', n: knock.n })
    expect(await result).toBeNull()
    expect(s.ui.state).toBe('denied')
  })

  it('tells the person to update the app when the holder never answers the committed knock, and keeps listening', async () => {
    const s = setup()
    const result = s.joiner.join('rb-7kq2m9', 'Bob')
    await until(() => !!s.relay.state.handlers)
    s.relay.state.handlers!.onOpen!()
    await until(() => s.relay.sent.some((m) => m.t === 'knock2'))
    expect(s.ui.state).toBe('waiting')
    vi.advanceTimersByTime(COMMIT_WAIT_MS)
    expect(s.ui.state).toBe('outdated')
    expect(s.relay.sent.every((m) => m.t === 'knock2')).toBe(true)
    // A slow holder that does answer later brings the exchange back on track.
    const knock2 = s.relay.sent[0] as Extract<JoinMsg, { t: 'knock2' }>
    s.relay.state.handlers!.onMessage({ t: 'challenge', n: knock2.n, h: toBase64Url(new Uint8Array(16)) })
    expect(s.ui.state).toBe('waiting')
    s.joiner.cancel()
    expect(await result).toBeNull()
  })

  it('times out after 90 seconds of silence', async () => {
    const s = setup()
    const { result } = await knocking(s)
    await vi.advanceTimersByTimeAsync(JOINER_WAIT_MS - 1)
    expect(s.ui.state).toBe('waiting')
    await vi.advanceTimersByTimeAsync(1)
    expect(await result).toBeNull()
    expect(s.ui.state).toBe('timeout')
    expect(s.relay.state.closed).toBe(1)
  })

  it('waits as long as it was told to', async () => {
    const s = setup({ waitMs: 5_000 })
    const { result } = await knocking(s)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await result).toBeNull()
    expect(s.ui.state).toBe('timeout')
  })

  it('fails when the side room cannot be reached or drops', async () => {
    const down = setup()
    down.relay.state.fail = true
    const result = down.joiner.join('RB-7KQ2M9', 'Bob')
    await flush()
    expect(await result).toBeNull()
    expect(down.ui.state).toBe('failed')
    const dropped = setup()
    const { result: second } = await knocking(dropped)
    dropped.relay.state.handlers!.onClose!()
    expect(await second).toBeNull()
    expect(dropped.ui.state).toBe('failed')
  })

  it('can be cancelled, which closes the side room and forgets the number', async () => {
    const s = setup()
    const { result } = await knocking(s)
    s.joiner.cancel()
    expect(await result).toBeNull()
    expect(s.ui).toEqual({ state: 'idle', number: '' })
    expect(s.relay.state.closed).toBe(1)
  })

  it('answers once: a late refusal after a timeout changes nothing', async () => {
    const s = setup({ waitMs: 5_000 })
    const { result, knock } = await knocking(s)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await result).toBeNull()
    s.relay.state.handlers!.onMessage({ t: 'deny', n: knock.n })
    expect(s.ui.state).toBe('timeout')
    expect(s.relay.state.closed).toBe(1)
  })

  it('closes a side room that opened after the join was cancelled', async () => {
    const ui: JoinerState = { state: 'idle', number: '' }
    const channel = { send: vi.fn(), close: vi.fn() }
    let release: () => void = () => {}
    let asked = false
    const joiner = createJoiner({ openChannel: () => new Promise((resolve) => { asked = true; release = () => resolve(channel) }), origin }, ui)
    const result = joiner.join('RB-7KQ2M9', 'Bob')
    await until(() => asked)
    joiner.cancel()
    release()
    expect(await result).toBeNull()
    await until(() => channel.close.mock.calls.length === 1)
    expect(channel.close).toHaveBeenCalledTimes(1)
  })

  it('starts again cleanly: a second join cancels the first', async () => {
    const s = setup()
    const first = s.joiner.join('RB-7KQ2M9', 'Bob')
    await until(() => s.relay.state.opened === 1)
    const second = s.joiner.join('RB-AAAAAA', 'Bob')
    expect(await first).toBeNull()
    await until(() => s.relay.state.code === 'RB-AAAAAA')
    expect(s.relay.state.code).toBe('RB-AAAAAA')
    s.joiner.cancel()
    expect(await second).toBeNull()
  })
})
