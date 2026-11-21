/**
 * The Scrum Poker demo (change scrum-poker, ADR-0042): the sealed card with a key per round, the fold of a poker room, and two clients
 * through a relay stand-in with the real envelopes, signatures and sealing. This is the headless twin of the two-tab demo.
 */
import { describe, expect, it, vi } from 'vitest'
import { fromBase64Url, randomBytes, toBase64Url } from '@retroboard/crypto'
import { formatInvite, parseInvite, participantRing, SEALED_RE } from '@retroboard/domain'
import { parseClientFrame } from '@retroboard/protocol'
import { openCard, roundKeyPair, sealCard } from '../app/poker/ballot'
import { DECK, PokerClient, type PokerView } from '../app/poker/client'
import { emptyPoker, type PokerEvent, foldPoker, type PokerState, VOTER_CAP } from '../app/poker/fold'
import { currentLocale } from '../app/i18n'
import { pokerEn, pokerFr, pt } from '../app/poker/strings'

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'
const b64 = (n: number) => toBase64Url(randomBytes(n))

describe('a sealed card with a key per round', () => {
  it('derives the same pair from the same secret and another pair for another round or room', async () => {
    const secret = randomBytes(16)
    const a = await roundKeyPair(secret, ROOM, 'r1')
    expect(toBase64Url((await roundKeyPair(secret, ROOM, 'r1')).publicKey)).toBe(toBase64Url(a.publicKey))
    expect(toBase64Url((await roundKeyPair(secret, ROOM, 'r2')).publicKey)).not.toBe(toBase64Url(a.publicKey))
    expect(toBase64Url((await roundKeyPair(secret, `${ROOM}x`, 'r1')).publicKey)).not.toBe(toBase64Url(a.publicKey))
  })

  it('opens with the published key of its round, and only for its voter', async () => {
    const secret = randomBytes(16)
    const r1 = await roundKeyPair(secret, ROOM, 'r1'); const r2 = await roundKeyPair(secret, ROOM, 'r2')
    const pub1 = toBase64Url(r1.publicKey); const priv1 = toBase64Url(r1.privateKey); const pub2 = toBase64Url(r2.publicKey)
    const sealed = await sealCard(pub1, ROOM, 'voter-a', 6)
    expect(sealed).toMatch(SEALED_RE)
    expect(sealed.length).toBe(134)
    expect(await openCard(priv1, pub1, ROOM, 'voter-a', sealed)).toBe(6)
    expect(await openCard(priv1, pub1, ROOM, 'voter-b', sealed)).toBeNull()
    expect(await openCard(priv1, pub1, `${ROOM}x`, 'voter-a', sealed)).toBeNull()
    // The key of round 1, published at its reveal, opens nothing of round 2, and a ballot copied into round 2 does not open.
    const next = await sealCard(pub2, ROOM, 'voter-a', 2)
    expect(await openCard(priv1, pub1, ROOM, 'voter-a', next)).toBeNull()
    expect(await openCard(toBase64Url(r2.privateKey), pub2, ROOM, 'voter-a', sealed)).toBeNull()
    expect(await openCard(toBase64Url(r2.privateKey), pub2, ROOM, 'voter-a', next)).toBe(2)
  })

  it('refuses what is not a card or a key', async () => {
    const r = await roundKeyPair(randomBytes(16), ROOM, 'r1')
    const pub = toBase64Url(r.publicKey)
    await expect(sealCard(pub, ROOM, 'v', -1)).rejects.toThrow('invalid card')
    await expect(sealCard(pub, ROOM, 'v', 100)).rejects.toThrow('invalid card')
    await expect(sealCard('!', ROOM, 'v', 1)).rejects.toThrow('invalid card')
    const sealed = await sealCard(pub, ROOM, 'v', 1)
    expect(await openCard('!', pub, ROOM, 'v', sealed)).toBeNull()
    expect(await openCard(toBase64Url(r.privateKey), pub, ROOM, 'v', '!')).toBeNull()
    expect(await openCard(toBase64Url(r.privateKey), pub, ROOM, 'v', `${sealed.slice(0, -2)}AA`)).toBeNull()
    expect(await openCard(toBase64Url(r.privateKey), toBase64Url(randomBytes(32)), ROOM, 'v', sealed)).toBeNull()
  })
})

describe('the fold of a poker room', () => {
  const key = (c: string) => c.repeat(43)
  const MOD = key('M'); const ANN = key('A'); const PUB1 = key('p'); const PUB2 = key('q'); const SEALED = 'S'.repeat(134); const SEALED2 = 'T'.repeat(134)
  const ev = (author: string, body: unknown): PokerEvent => ({ author, body })
  const genesis = ev(MOD, { t: 'genesis', roomId: ROOM, facilitatorKey: MOD, kind: 'poker' })
  const cmd = (author: string, c: Record<string, unknown>) => ev(author, { t: 'poker', cmd: c })
  const fold = (events: PokerEvent[]): PokerState => events.reduce(foldPoker, emptyPoker())
  const open = [genesis, cmd(ANN, { t: 'seat.join', name: 'Ann' }), cmd(MOD, { t: 'round.start', round: 'r1', pub: PUB1 })]

  it('takes its kind and its moderator from the first genesis, signed by the key it names', () => {
    expect(fold([genesis])).toMatchObject({ kind: 'poker', moderator: MOD })
    expect(fold([genesis, ev(ANN, { t: 'genesis', roomId: ROOM, facilitatorKey: ANN, kind: 'poker' })]).moderator).toBe(MOD)
    expect(fold([ev(ANN, { t: 'genesis', roomId: ROOM, facilitatorKey: MOD, kind: 'poker' })]).kind).toBeNull()
    expect(fold([ev(MOD, 'nonsense' as never)]).kind).toBeNull()
  })

  it('never reads the events of a board', () => {
    const board = fold([ev(MOD, { t: 'genesis', roomId: ROOM, facilitatorKey: MOD }), cmd(ANN, { t: 'seat.join', name: 'Ann' })])
    expect(board).toMatchObject({ kind: 'board', moderator: null })
    expect(board.seats.size).toBe(0)
  })

  it('ignores a poker event before a poker genesis and an unknown command', () => {
    expect(fold([cmd(ANN, { t: 'seat.join', name: 'Ann' })]).seats.size).toBe(0)
    expect(fold([genesis, cmd(ANN, { t: 'nope' })]).seats.size).toBe(0)
  })

  it('seats a voter once, renames on a second join and caps the voters', () => {
    const named = fold([genesis, cmd(ANN, { t: 'seat.join', name: ' Ann ' }), cmd(ANN, { t: 'seat.join', name: 'Anna' }), cmd(MOD, { t: 'seat.join', name: '' })])
    expect([...named.seats]).toEqual([[ANN, 'Anna']])
    const crowd = Array.from({ length: VOTER_CAP + 1 }, (_, i) => cmd(key(String.fromCharCode(97 + i)), { t: 'seat.join', name: `P${i}` }))
    const full = fold([genesis, ...crowd])
    expect(full.seats.size).toBe(VOTER_CAP)
    expect(full.seats.has(key(String.fromCharCode(97 + VOTER_CAP)))).toBe(false)
    expect(foldPoker(full, cmd(key('a'), { t: 'seat.join', name: 'Renamed' })).seats.get(key('a'))).toBe('Renamed')
  })

  it('lets only the moderator start a round, once per id, with a well-formed key', () => {
    expect(fold([genesis, cmd(ANN, { t: 'round.start', round: 'r1', pub: PUB1 })]).rounds).toHaveLength(0)
    expect(fold([genesis, cmd(MOD, { t: 'round.start', round: 'r1', pub: 'short' })]).rounds).toHaveLength(0)
    expect(fold([genesis, cmd(MOD, { t: 'round.start', round: '', pub: PUB1 })]).rounds).toHaveLength(0)
    expect(fold([genesis, cmd(MOD, { t: 'round.start', round: 'r1', pub: PUB1 }), cmd(MOD, { t: 'round.start', round: 'r1', pub: PUB2 })]).rounds).toHaveLength(1)
  })

  it('keeps the last card of a seated voter in the current round, until the reveal', () => {
    const voted = fold([...open, cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: SEALED }), cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: SEALED2 })])
    expect(voted.rounds[0]!.ballots.get(ANN)).toBe(SEALED2)
    expect(fold([...open, cmd(MOD, { t: 'vote.seal', round: 'r1', sealed: SEALED })]).rounds[0]!.ballots.size).toBe(0)
    expect(fold([...open, cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: 'short' })]).rounds[0]!.ballots.size).toBe(0)
    expect(fold([...open, cmd(ANN, { t: 'vote.seal', round: 'r0', sealed: SEALED })]).rounds[0]!.ballots.size).toBe(0)
    expect(fold([genesis, cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: SEALED })]).rounds).toHaveLength(0)
  })

  it('reveals once, by the moderator, and refuses a late change', () => {
    const base = [...open, cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: SEALED })]
    expect(fold([...base, cmd(ANN, { t: 'round.reveal', round: 'r1', key: key('k') })]).rounds[0]!.revealKey).toBeUndefined()
    expect(fold([...base, cmd(MOD, { t: 'round.reveal', round: 'r1', key: 'short' })]).rounds[0]!.revealKey).toBeUndefined()
    expect(fold([...base, cmd(MOD, { t: 'round.reveal', round: 'r9', key: key('k') })]).rounds[0]!.revealKey).toBeUndefined()
    const revealed = fold([...base, cmd(MOD, { t: 'round.reveal', round: 'r1', key: key('k') })])
    expect(revealed.rounds[0]!.revealKey).toBe(key('k'))
    expect(foldPoker(revealed, cmd(MOD, { t: 'round.reveal', round: 'r1', key: key('z') })).rounds[0]!.revealKey).toBe(key('k'))
    expect(foldPoker(revealed, cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: SEALED2 })).rounds[0]!.ballots.get(ANN)).toBe(SEALED)
    // A re-vote is a new round of its own.
    expect(foldPoker(revealed, cmd(MOD, { t: 'round.start', round: 'r2', pub: PUB2 })).rounds).toHaveLength(2)
  })

  it('reaches the same state on two replicas that fold the same events', () => {
    const events = [...open, cmd(ANN, { t: 'vote.seal', round: 'r1', sealed: SEALED }), cmd(MOD, { t: 'round.reveal', round: 'r1', key: key('k') })]
    expect(fold(events)).toEqual(fold([...events]))
  })
})

describe('the strings', () => {
  const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  it('have the same keys and placeholders in French and English, and no typographic characters in English', () => {
    expect(Object.keys(pokerEn).sort()).toEqual(Object.keys(pokerFr).sort())
    for (const k of Object.keys(pokerFr) as (keyof typeof pokerFr)[]) expect(params(pokerEn[k]), k).toEqual(params(pokerFr[k]))
    for (const v of Object.values(pokerEn)) expect(v).not.toMatch(/[‘’“”–—]/)
  })

  it('follow the current language and fill the placeholders', () => {
    currentLocale.value = 'en'
    expect(pt('poker.progress', { voted: 2, total: 3 })).toBe('2 of 3 have voted')
    currentLocale.value = 'fr'
    expect(pt('poker.progress', { voted: 2, total: 3 })).toBe('2 sur 3 ont voté')
    expect(pt('poker.progress')).toBe('{voted} sur {total} ont voté')
  })
})

/** A relay stand-in with the behaviour the demo needs: welcome, history, `pub` kept and forwarded once, and a record of every frame. */
function relay() {
  const sockets = new Set<FakeSocket>()
  const buffer: unknown[] = []
  const seen = new Set<string>()
  const frames: string[] = []
  class FakeSocket {
    readyState = 0
    onmessage: ((m: { data: string }) => void) | null = null
    onclose: (() => void) | null = null
    constructor(readonly url: string) {
      queueMicrotask(() => {
        this.readyState = 1
        sockets.add(this)
        this.deliver({ t: 'welcome', conn: 'conn00000001', peers: ['conn00000001'] })
        this.deliver({ t: 'hist', envs: buffer, done: true })
      })
    }
    deliver(frame: unknown) { queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(frame) })) }
    send(text: string) {
      frames.push(text)
      const frame = text === 'ping' ? null : parseClientFrame(JSON.parse(text))
      if (frame?.t !== 'pub') return
      const fresh = frame.envs.filter((e) => !seen.has(e.id))
      fresh.forEach((e) => { seen.add(e.id); buffer.push(e) })
      if (fresh.length) for (const s of sockets) if (s !== this) s.deliver({ t: 'env', envs: fresh })
    }
    close() { this.readyState = 3; sockets.delete(this); this.onclose?.() }
  }
  return { WS: FakeSocket as unknown as typeof WebSocket, frames }
}

describe('two clients through a relay', () => {
  it('create a room, join by the link, seal their cards and open them together at the reveal', async () => {
    const roomKey = b64(16); const facilitatorSecret = b64(16); const roomId = b64(16)
    const moderatorFragment = formatInvite({ roomId, roomKey, facilitatorSecret }, 'facilitator')
    const voterFragment = formatInvite(participantRing((parseInvite(moderatorFragment) as { ring: Parameters<typeof participantRing>[0] }).ring), 'participant')
    expect(voterFragment).not.toContain(facilitatorSecret)
    const { WS, frames } = relay()
    const views: Record<string, PokerView | null> = { ann: null, bob: null }
    const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } } }
    const make = (who: 'ann' | 'bob', fragment: string) => {
      const invite = parseInvite(fragment)
      if (invite?.kind !== 'encrypted') throw new Error('bad invite')
      return new PokerClient({ ring: invite.ring, name: who === 'ann' ? 'Ann' : 'Bob', socketBase: 'ws://relay.test', WS, store: store(), onChange: (v) => { views[who] = v } })
    }
    const ann = make('ann', moderatorFragment)
    const bob = make('bob', voterFragment)
    await ann.start(); await bob.start()
    await vi.waitFor(() => { expect(views.ann?.seats).toHaveLength(2); expect(views.bob?.seats).toHaveLength(2); expect(views.bob?.round?.n).toBe(1) })
    expect(views.ann).toMatchObject({ moderator: true, status: 'live' })
    expect(views.bob).toMatchObject({ moderator: false, status: 'live' })

    bob.vote(DECK.indexOf('13')); ann.vote(DECK.indexOf('5'))
    await vi.waitFor(() => { expect(views.ann?.round?.voted).toBe(2); expect(views.bob?.round?.voted).toBe(2) })
    expect(views.bob?.mine).toBe(DECK.indexOf('13'))
    // Nothing is readable before the reveal, and a voter cannot reveal.
    for (const v of Object.values(views)) expect(v!.seats.map((s) => s.card)).toEqual([null, null])
    bob.reveal()
    await new Promise((r) => setTimeout(r, 20))
    expect(views.ann?.round?.revealed).toBe(false)

    ann.reveal()
    await vi.waitFor(() => { expect(views.ann?.round?.revealed).toBe(true); expect(views.bob?.round?.revealed).toBe(true) })
    for (const v of Object.values(views)) expect(Object.fromEntries(v!.seats.map((s) => [s.name, s.card]))).toEqual({ Ann: '5', Bob: '13' })

    // A new round starts blank, with its own key; the cards of the first are not carried over.
    ann.nextRound()
    await vi.waitFor(() => { expect(views.bob?.round).toMatchObject({ n: 2, revealed: false, voted: 0 }) })
    expect(views.bob?.mine).toBeNull()
    expect(views.bob?.seats.map((s) => s.card)).toEqual([null, null])
    ann.close(); bob.close()

    // The relay carried envelopes of five fields and no word of the game.
    const pubs = frames.filter((f) => f !== 'ping').map((f) => JSON.parse(f) as { t: string; envs: Record<string, unknown>[] })
    expect(pubs.length).toBeGreaterThan(6)
    for (const frame of pubs) { expect(frame.t).toBe('pub'); for (const e of frame.envs) expect(Object.keys(e).sort()).toEqual(['ct', 'hlc', 'id', 'room', 'v']) }
    expect(frames.join('')).not.toMatch(/poker|round|vote|reveal|genesis/)
    expect(fromBase64Url(roomId)).toHaveLength(16)
  })

  it('refuses a 21st voter and says the room is full', async () => {
    const roomKey = b64(16); const roomId = b64(16)
    const mod = formatInvite({ roomId, roomKey, facilitatorSecret: b64(16) }, 'facilitator')
    const voter = formatInvite({ roomId, roomKey }, 'participant')
    const { WS } = relay()
    const views: PokerView[] = []
    const clients: PokerClient[] = []
    const join = async (fragment: string, name: string) => {
      const invite = parseInvite(fragment)
      if (invite?.kind !== 'encrypted') throw new Error('bad invite')
      const index = clients.length
      const c = new PokerClient({ ring: invite.ring, name, socketBase: 'ws://relay.test', WS, onChange: (v) => { views[index] = v } })
      clients.push(c)
      await c.start()
      await vi.waitFor(() => expect(views[index]?.status === 'live' || views[index]?.status === 'full').toBe(true))
    }
    await join(mod, 'M')
    for (let i = 1; i < VOTER_CAP; i++) await join(voter, `P${i}`)
    expect(views[0]!.seats).toHaveLength(VOTER_CAP)
    await join(voter, 'Late')
    expect(views[VOTER_CAP]!.status).toBe('full')
    expect(views[0]!.seats).toHaveLength(VOTER_CAP)
    clients.forEach((c) => c.close())
  }, 60_000)
})
