/**
 * The Scrum Poker room (change scrum-poker, ADR-0042): the strings, and clients through a relay stand-in with the real envelopes,
 * signatures, sealing and the shared kind-aware ledger. The rules themselves (the fold, the sealed card, the statistics) are tested in
 * `packages/domain`, `packages/crypto` and `packages/application`; this is the headless twin of the two-tab room.
 */
import { describe, expect, it, vi } from 'vitest'
import { deriveContentKey, deriveFacilitatorSeed, fromBase64Url, randomBytes, seal, sign, signingKeyPair, toBase64Url, utf8 } from '@retroboard/crypto'
import { formatInvite, parseInvite, participantRing, VOTER_CAP } from '@retroboard/domain'
import { presetCards, signEvent } from '@retroboard/application'
import { envelopeAad, parseClientFrame, PROTOCOL_VERSION } from '@retroboard/protocol'
import { ulid } from '../app/transport/ulid'
import { PokerClient, type PokerView } from '../app/poker/client'
import { currentLocale } from '../app/i18n'
import { cardLabel, pokerEn, pokerFr, pt } from '../app/poker/strings'

const b64 = (n: number) => toBase64Url(randomBytes(n))
const FIB = presetCards('fibonacci')

describe('the strings', () => {
  const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  it('have the same keys and placeholders in French and English, and no typographic characters in English', () => {
    expect(Object.keys(pokerEn).sort()).toEqual(Object.keys(pokerFr).sort())
    for (const k of Object.keys(pokerFr) as (keyof typeof pokerFr)[]) expect(params(pokerEn[k]), k).toEqual(params(pokerFr[k]))
    for (const v of Object.values(pokerEn)) expect(v).not.toMatch(/[‘’“”–—]/)
  })

  it('say nothing of a demo or a flag: the pages are the product, in beta', () => {
    for (const text of [...Object.values(pokerFr), ...Object.values(pokerEn)]) expect(text).not.toMatch(/d[eé]mo|drapeau|flag/i)
  })

  it('follow the current language and fill the placeholders', () => {
    currentLocale.value = 'en'
    expect(pt('poker.progress', { voted: 2, total: 3 })).toBe('2 of 3 have voted')
    currentLocale.value = 'fr'
    expect(pt('poker.progress', { voted: 2, total: 3 })).toBe('2 sur 3 ont voté')
    expect(pt('poker.progress')).toBe('{voted} sur {total} ont voté')
  })

  it('name the coffee card and the question mark for a screen reader, and any other card by its label', () => {
    currentLocale.value = 'en'
    expect([cardLabel('\u2615'), cardLabel('?'), cardLabel('13')]).toEqual(['Coffee break', 'No idea', 'Card 13'])
    currentLocale.value = 'fr'
    expect(cardLabel('\u2615')).toBe('Pause café')
  })
})

/** A relay stand-in with the behaviour the demo needs: welcome, history, `pub` kept and forwarded once, and a record of every frame. */
function relay(initial: unknown[] = []) {
  const sockets = new Set<FakeSocket>()
  const buffer: unknown[] = [...initial]
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
  return { WS: FakeSocket as unknown as typeof WebSocket, frames, sockets }
}

describe('two clients through a relay', () => {
  it('create a room, join by the link, seal their cards and open them together at the reveal, with the statistics', async () => {
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
      return new PokerClient({ ring: invite.ring, name: who === 'ann' ? 'Ann' : 'Bob', deck: who === 'ann' ? presetCards('fibonacci') : undefined, socketBase: 'ws://relay.test', WS, store: store(), onChange: (v) => { views[who] = v } })
    }
    const ann = make('ann', moderatorFragment)
    const bob = make('bob', voterFragment)
    await ann.start(); await bob.start()
    await vi.waitFor(() => { expect(views.ann?.seats).toHaveLength(2); expect(views.bob?.seats).toHaveLength(2); expect(views.bob?.round?.n).toBe(1) })
    expect(views.ann).toMatchObject({ moderator: true, status: 'live' })
    expect(views.bob).toMatchObject({ moderator: false, status: 'live' })

    bob.vote(FIB.indexOf('13')); ann.vote(FIB.indexOf('5'))
    await vi.waitFor(() => { expect(views.ann?.round?.voted).toBe(2); expect(views.bob?.round?.voted).toBe(2) })
    expect(views.bob?.mine).toBe(FIB.indexOf('13'))
    // Nothing is readable before the reveal, and a voter cannot reveal.
    for (const v of Object.values(views)) expect(v!.seats.map((s) => s.card)).toEqual([null, null])
    bob.reveal()
    await new Promise((r) => setTimeout(r, 20))
    expect(views.ann?.round?.revealed).toBe(false)

    ann.reveal()
    await vi.waitFor(() => { expect(views.ann?.round?.revealed).toBe(true); expect(views.bob?.round?.revealed).toBe(true) })
    for (const v of Object.values(views)) {
      expect(Object.fromEntries(v!.seats.map((s) => [s.name, s.card]))).toEqual({ Ann: '5', Bob: '13' })
      expect(v!.stats).toMatchObject({ average: 9, median: 9, suggestion: '8', unanimous: false, consensus: 0.5 })
    }
    expect(views.bob?.stats).not.toBeNull()

    // A re-vote is a round of its own that says so, with its own key; the cards of the first are not carried over.
    ann.nextRound(true)
    await vi.waitFor(() => { expect(views.bob?.round).toMatchObject({ n: 2, revealed: false, revote: true, voted: 0 }) })
    expect(views.bob?.mine).toBeNull()
    expect(views.bob?.stats).toBeNull()
    expect(views.bob?.seats.map((s) => s.card)).toEqual([null, null])
    // A participant cannot start a round; the moderator can, and it is not a re-vote.
    bob.nextRound()
    ann.nextRound()
    await vi.waitFor(() => { expect(views.bob?.round).toMatchObject({ n: 3, revote: false }) })
    ann.close(); bob.close()

    // The relay carried envelopes of five fields and no word of the game.
    const pubs = frames.filter((f) => f !== 'ping').map((f) => JSON.parse(f) as { t: string; envs: Record<string, unknown>[] })
    expect(pubs.length).toBeGreaterThan(6)
    for (const frame of pubs) { expect(frame.t).toBe('pub'); for (const e of frame.envs) expect(Object.keys(e).sort()).toEqual(['ct', 'hlc', 'id', 'room', 'v']) }
    expect(frames.join('')).not.toMatch(/poker|round|vote|reveal|genesis/)
    expect(fromBase64Url(roomId)).toHaveLength(16)
  })

  it('sends the card kept in the tab again when a reload meets a relay that forgot the room (nobody else was in it)', async () => {
    const roomKey = b64(16); const roomId = b64(16)
    const invite = parseInvite(formatInvite({ roomId, roomKey, facilitatorSecret: b64(16) }, 'facilitator'))
    if (invite?.kind !== 'encrypted') throw new Error('bad invite')
    const slots = new Map<string, string>()
    const store = { getItem: (k: string) => slots.get(k) ?? null, setItem: (k: string, v: string) => { slots.set(k, v) } }
    const open = async (WS: typeof WebSocket) => {
      let view: PokerView | null = null
      const c = new PokerClient({ ring: invite.ring, name: 'Ann', deck: FIB, socketBase: 'ws://relay.test', WS, store, onChange: (v) => { view = v } })
      await c.start()
      await vi.waitFor(() => expect((view as PokerView | null)?.status).toBe('live'))
      return { c, view: () => view! }
    }
    const first = await open(relay().WS)
    first.c.vote(FIB.indexOf('8'))
    await vi.waitFor(() => expect(first.view().round?.voted).toBe(1))
    first.c.close()

    // The relay keeps nothing once the room is empty: the reload finds no history, writes the room again, and the card is still hers.
    const second = await open(relay().WS)
    await vi.waitFor(() => expect(second.view().round?.voted).toBe(1))
    expect(second.view().mine).toBe(FIB.indexOf('8'))
    second.c.reveal()
    await vi.waitFor(() => expect(second.view().seats.map((s) => s.card)).toEqual(['8']))
    second.c.close()
  })

  it('seats a 21st person as a watcher who cannot vote, and keeps the cards of the voters', async () => {
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
      await vi.waitFor(() => expect(views[index]?.status).toBe('live'))
    }
    await join(mod, 'M')
    for (let i = 1; i < VOTER_CAP; i++) await join(voter, `P${i}`)
    await join(voter, 'Late')
    const late = views[VOTER_CAP]!
    await vi.waitFor(() => expect(views[0]!.seats).toHaveLength(VOTER_CAP + 1))
    expect(views[0]!.seats.filter((s) => s.voter)).toHaveLength(VOTER_CAP)
    expect(late.voter).toBe(false)
    clients[VOTER_CAP]!.vote(1)
    clients[1]!.vote(1)
    await vi.waitFor(() => expect(views[0]!.round?.voted).toBe(1))
    expect(views[0]!.round?.voters).toBe(VOTER_CAP)
    clients.forEach((c) => c.close())
  }, 60_000)

  it('says the room is full when the relay refuses the connection', async () => {
    const { WS, sockets } = relay()
    let view: PokerView | null = null
    const c = new PokerClient({ ring: { roomId: b64(16), roomKey: b64(16) }, name: 'Late', socketBase: 'ws://relay.test', WS, onChange: (v) => { view = v } })
    await c.start()
    await vi.waitFor(() => expect(sockets.size).toBe(1))
    ;[...sockets][0]!.deliver({ t: 'err', code: 'full' })
    await vi.waitFor(() => expect((view as PokerView | null)?.status).toBe('full'))
    c.close()
  })

  it('tells a board link from a poker room: the genesis of a board has no kind', async () => {
    const roomKey = b64(16); const roomId = b64(16)
    const invite = parseInvite(formatInvite({ roomId, roomKey, facilitatorSecret: b64(16) }, 'facilitator'))
    if (invite?.kind !== 'encrypted') throw new Error('bad invite')
    const { ring } = invite
    // The genesis a board writes, by the same transport: the room page must not treat it as a poker room, nor write into it.
    const contentKey = await deriveContentKey(fromBase64Url(ring.roomKey)!, ring.roomId)
    const pair = await signingKeyPair(await deriveFacilitatorSeed(fromBase64Url(ring.facilitatorSecret!)!))
    const me = toBase64Url(pair.publicKey)
    const signer = { publicKey: me, sign: async (m: string) => toBase64Url(await sign(pair.privateKey, utf8(m))) }
    const event = await signEvent(signer, ring.roomId, { id: ulid(), at: Date.now(), body: { t: 'genesis', roomId: ring.roomId, facilitatorKey: me } })
    const head = { v: PROTOCOL_VERSION, room: ring.roomId, id: event.id, hlc: event.at } as const
    const env = { ...head, ct: toBase64Url(await seal(contentKey, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
    const { WS, frames } = relay([env])
    let view: PokerView | null = null
    const c = new PokerClient({ ring: participantRing(ring), name: 'Ann', socketBase: 'ws://relay.test', WS, onChange: (v) => { view = v } })
    await c.start()
    await vi.waitFor(() => expect((view as PokerView | null)?.status).toBe('board'))
    expect((view as PokerView | null)?.round).toBeNull()
    expect(frames.filter((f) => f !== 'ping')).toEqual([])
    c.close()
  })
})
