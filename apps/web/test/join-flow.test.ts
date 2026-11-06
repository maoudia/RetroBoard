import { agreementKeyPair, fromBase64Url, fromUtf8, openFrom, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JoinMsg } from '../app/utils/join-code'
import { safetyNumber } from '../app/utils/join-code'
import { type ChannelHandlers, createJoiner, createJoinHost, type HostState, type JoinerState, JOINER_WAIT_MS, MAX_KNOCKS } from '../app/utils/join-flow'

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
const newHostState = (): HostState => ({ code: null, expiresAt: 0, knocks: [], connected: false })

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }) })
afterEach(() => { vi.useRealTimers() })

async function knockMsg(n: string, name = 'Bob'): Promise<{ msg: JoinMsg; keys: Awaited<ReturnType<typeof agreementKeyPair>> }> {
  const keys = await agreementKeyPair()
  return { keys, msg: { t: 'knock', n, pub: toBase64Url(keys.publicKey), name } }
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
    const { msg } = await knockMsg('n1')
    relay.state.handlers!.onMessage(msg)
    await until(() => state.knocks.length === 1)
    await vi.advanceTimersByTimeAsync(599_999)
    expect(state.code).toBe('RB-AAAAAA')
    await vi.advanceTimersByTimeAsync(1)
    expect(state).toMatchObject({ code: null, knocks: [], connected: false })
    expect(relay.state.closed).toBe(1)
  })

  it('lists a knock with its name and the safety number of its key', async () => {
    const { relay, state } = await started()
    const { msg, keys } = await knockMsg('n1', 'Bob')
    relay.state.handlers!.onMessage(msg)
    await until(() => state.knocks.length === 1)
    expect(state.knocks).toEqual([{ n: 'n1', name: 'Bob', pub: (msg as { pub: string }).pub, number: await safetyNumber(keys.publicKey) }])
  })

  it('keeps at most five knocks, one per attempt, and only from a key of the right size', async () => {
    const { relay, state } = await started()
    for (let i = 0; i < MAX_KNOCKS + 3; i++) relay.state.handlers!.onMessage((await knockMsg(`n${i}`)).msg)
    await until(() => state.knocks.length === MAX_KNOCKS)
    await flush()
    expect(state.knocks.map((k) => k.n).sort()).toEqual(['n0', 'n1', 'n2', 'n3', 'n4'])
    const fresh = await started()
    const one = await knockMsg('same')
    fresh.relay.state.handlers!.onMessage(one.msg)
    fresh.relay.state.handlers!.onMessage(one.msg)
    await until(() => fresh.state.knocks.length === 1)
    await flush()
    expect(fresh.state.knocks).toHaveLength(1)
    fresh.relay.state.handlers!.onMessage({ t: 'knock', n: 'short', pub: toBase64Url(new Uint8Array(31)), name: 'x' })
    fresh.relay.state.handlers!.onMessage({ t: 'knock', n: 'long', pub: toBase64Url(new Uint8Array(33)), name: 'x' })
    fresh.relay.state.handlers!.onMessage({ t: 'knock', n: 'junk', pub: '!!not base64!!', name: 'x' })
    await flush()
    expect(fresh.state.knocks.map((k) => k.n)).toEqual(['same'])
  })

  it('does not add a knock whose safety number was still being computed when the code stopped', async () => {
    const { relay, state, host } = await started()
    relay.state.handlers!.onMessage((await knockMsg('late')).msg)
    host.stop()
    await flush()
    expect(state.knocks).toEqual([])
  })

  it('ignores what is not a knock', async () => {
    const { relay, state } = await started()
    relay.state.handlers!.onMessage({ t: 'let', n: 'n1', ct: 'x' })
    relay.state.handlers!.onMessage({ t: 'deny', n: 'n1' })
    await flush()
    expect(state.knocks).toEqual([])
  })

  it('lets a knocker in by sealing the current link to his key alone', async () => {
    let link = 'https://x.test/boards#c=old'
    const { relay, state, host } = await started({ link: () => link })
    const bob = await knockMsg('n1')
    relay.state.handlers!.onMessage(bob.msg)
    await until(() => state.knocks.length === 1)
    link = 'https://x.test/boards#c=new'
    await host.admit(state.knocks[0]!)
    expect(state.knocks).toEqual([])
    const [let1] = relay.sent
    expect(let1).toMatchObject({ t: 'let', n: 'n1' })
    const ct = fromBase64Url((let1 as { ct: string }).ct)!
    expect(fromUtf8((await openFrom(bob.keys, ct, utf8('n1')))!)).toBe('https://x.test/boards#c=new')
    expect(await openFrom(await agreementKeyPair(), ct, utf8('n1'))).toBeNull()
    expect(await openFrom(bob.keys, ct, utf8('other'))).toBeNull()
  })

  it('lets only the knocker who asked in, and nobody once the code is gone', async () => {
    const { relay, state, host } = await started()
    const a = await knockMsg('a')
    const b = await knockMsg('b')
    relay.state.handlers!.onMessage(a.msg)
    relay.state.handlers!.onMessage(b.msg)
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
    relay.state.handlers!.onMessage((await knockMsg('a')).msg)
    relay.state.handlers!.onMessage((await knockMsg('b')).msg)
    await until(() => state.knocks.length === 2)
    host.refuse(state.knocks.find((k) => k.n === 'a')!)
    expect(relay.sent).toEqual([{ t: 'deny', n: 'a' }])
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
  /** Starts a join, plays the relay opening, and returns the knock the joiner sent with his key. */
  async function knocking(s: ReturnType<typeof setup>, text = 'rb-7kq2m9', name = 'Bob') {
    const result = s.joiner.join(text, name)
    await until(() => !!s.relay.state.handlers)
    s.relay.state.handlers!.onOpen!()
    const knock = s.relay.sent[0] as Extract<JoinMsg, { t: 'knock' }>
    return { result, knock }
  }
  const letFor = async (knock: Extract<JoinMsg, { t: 'knock' }>, link: string, n = knock.n): Promise<JoinMsg> =>
    ({ t: 'let', n, ct: toBase64Url(await sealTo(fromBase64Url(knock.pub)!, utf8(link), utf8(knock.n))) })

  it('does not knock for something that is not a code', async () => {
    const { relay, ui, joiner } = setup()
    expect(await joiner.join('hello', 'Bob')).toBeNull()
    expect(ui.state).toBe('failed')
    expect(relay.state.opened).toBe(0)
  })

  it('knocks on the side room of the code with a one-time key, the name cut to 40 characters, and shows the safety number', async () => {
    const s = setup()
    const { knock } = await knocking(s, 'rb 7kq2m9', 'B'.repeat(60))
    expect(s.relay.state.code).toBe('RB-7KQ2M9')
    expect(s.ui.state).toBe('waiting')
    expect(knock).toMatchObject({ t: 'knock', name: 'B'.repeat(40) })
    expect(fromBase64Url(knock.pub)).toHaveLength(32)
    expect(s.ui.number).toBe(await safetyNumber(fromBase64Url(knock.pub)!))
    expect(s.ui.number).toMatch(/^\d{3} \d{3}$/)
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

  it.each(['https://evil.test/boards#c=abc', `${origin}/other#c=abc`, '/boards', 'javascript:alert(1)', `${origin}.evil.test/boards#c=x`])('does not follow %s', async (link) => {
    const s = setup()
    const { result, knock } = await knocking(s)
    s.relay.state.handlers!.onMessage(await letFor(knock, link))
    expect(await result).toBeNull()
    expect(s.ui.state).toBe('failed')
  })

  it('fails on a link sealed to somebody else, and on a hand-off that is not even a ciphertext', async () => {
    const a = setup()
    const first = await knocking(a)
    const other = await knockMsg('x')
    a.relay.state.handlers?.onMessage({ t: 'let', n: first.knock.n, ct: toBase64Url(await sealTo(other.keys.publicKey, utf8(`${origin}/boards#c=abc`), utf8(first.knock.n))) })
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
    s.relay.state.handlers!.onMessage({ t: 'knock', n: knock.n, pub: knock.pub, name: 'x' })
    await flush()
    expect(s.ui.state).toBe('waiting')
    s.relay.state.handlers!.onMessage({ t: 'deny', n: knock.n })
    expect(await result).toBeNull()
    expect(s.ui.state).toBe('denied')
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
    const s = setup({ waitMs: 1_000 })
    const { result, knock } = await knocking(s)
    await vi.advanceTimersByTimeAsync(1_000)
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
