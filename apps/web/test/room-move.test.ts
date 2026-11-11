import { describe, expect, it } from 'vitest'
import { fromBase64Url, utf8 } from '@retroboard/crypto'
import { formatInvite, type KeyRing, movedRing, participantRing } from '@retroboard/domain'
import type { Presence } from '@retroboard/protocol'
import { createSessionAgreement, createSessionSigner, ed25519Verifier, signerFor } from '../app/adapters/signing'
import { movedMessage, moveRecipients, openMoved, type Recipient, sealMoved, type SessionAgreement } from '../app/transport/room-move'

const OLD = 'OldRoomIdOldRoomIdOldR1'
const NEW = 'NewRoomIdNewRoomIdNewR1'
const ring: KeyRing = movedRing({ roomId: OLD, roomKey: 'a'.repeat(22), facilitatorSecret: 'b'.repeat(22) }, { roomId: NEW, roomKey: 'c'.repeat(22) })
const link = formatInvite(participantRing(ring))

async function person() {
  let seed: string | null = null
  const store = { get: () => seed, set: (v: string) => { seed = v } }
  const signer = await createSessionSigner(store)
  const agreement = await createSessionAgreement(store)
  return { signer, agreement }
}

/** A facilitator, a participant and an outsider with the old room key (a removed participant). */
async function cast() {
  const facilitator = await signerFor('b'.repeat(22))
  return { facilitator: facilitator!, bob: await person(), eve: await person() }
}

const to = (a: SessionAgreement, conn = 'c0000000002'): Recipient => ({ conn, xkey: a.publicKey })

describe('the hand-off of a move to a fresh link', () => {
  it('reaches its recipient with the link, signed by the lead', async () => {
    const { facilitator, bob } = await cast()
    const ct = await sealMoved(facilitator, OLD, ring, to(bob.agreement), link)
    const opened = await openMoved(bob.agreement, ed25519Verifier, OLD, OLD, (k) => k === facilitator.publicKey, ct!)
    expect(opened?.hash).toBe(link)
    expect(opened?.ring).toEqual(participantRing(ring))
  })

  it('cannot be opened by anybody else, the removed participant included (who holds the old room key)', async () => {
    const { facilitator, bob, eve } = await cast()
    const ct = await sealMoved(facilitator, OLD, ring, to(bob.agreement), link)
    expect(await eve.agreement.open(fromBase64Url(ct!)!, utf8(`rb/room-moved/v1|${OLD}`))).toBeNull()
    expect(await openMoved(eve.agreement, ed25519Verifier, OLD, OLD, (k) => k === facilitator.publicKey, ct!)).toBeNull()
  })

  it('is refused when somebody other than the lead signed it, even a participant who holds the link of the old room', async () => {
    const { facilitator, bob, eve } = await cast()
    // Eve seals a link to a room she controls, properly signed with her own key.
    const evil = formatInvite(participantRing(movedRing({ roomId: OLD, roomKey: 'a'.repeat(22) }, { roomId: 'EvilRoomEvilRoomEvilR1', roomKey: 'e'.repeat(22) })))
    const forged = await sealMoved(eve.signer, OLD, ring, to(bob.agreement), evil)
    expect(await openMoved(bob.agreement, ed25519Verifier, OLD, OLD, (k) => k === facilitator.publicKey, forged!)).toBeNull()
    // Even with her own key as the signer, a ledger that does not make her the lead refuses it; one that did would accept, which is the fold's business.
    expect(await openMoved(bob.agreement, ed25519Verifier, OLD, OLD, (k) => k === eve.signer.publicKey, forged!)).not.toBeNull()
  })

  it('is refused when the signature covers another recipient, another link or another signing room', async () => {
    const { facilitator, bob, eve } = await cast()
    const leads = (k: string) => k === facilitator.publicKey
    // Signed for Eve, replayed to Bob: the message names the recipient.
    const forEve = await sealMoved(facilitator, OLD, ring, to(eve.agreement), link)
    expect(await openMoved(eve.agreement, ed25519Verifier, OLD, OLD, leads, forEve!)).not.toBeNull()
    // The signature of another link under a payload with this one is not valid (built by hand, as an attacker with the lead's old signature would).
    const other = formatInvite(participantRing(movedRing({ roomId: OLD, roomKey: 'a'.repeat(22) }, { roomId: 'OtherRoomOtherRoomOth1', roomKey: 'd'.repeat(22) })))
    const sigOfOther = await facilitator.sign(movedMessage(OLD, bob.agreement.publicKey, other))
    expect(await verifies(bob, facilitator.publicKey, sigOfOther, link)).toBe(false)
    // A board with another signing room does not take it.
    const ct = await sealMoved(facilitator, OLD, ring, to(bob.agreement), link)
    expect(await openMoved(bob.agreement, ed25519Verifier, OLD, 'AnotherDomainAnotherD1', leads, ct!)).toBeNull()
    // A frame sealed in another room does not open in this one.
    expect(await openMoved(bob.agreement, ed25519Verifier, 'SomeOtherRoomSomeOther1', OLD, leads, ct!)).toBeNull()
  })

  it('is refused when the link is not a participant link to another room of the same board', async () => {
    const { facilitator, bob } = await cast()
    const leads = (k: string) => k === facilitator.publicKey
    const refuse = async (bad: string) => {
      const ct = await sealMoved(facilitator, OLD, ring, to(bob.agreement), bad)
      expect(await openMoved(bob.agreement, ed25519Verifier, OLD, OLD, leads, ct!), bad).toBeNull()
    }
    await refuse(formatInvite(ring, 'facilitator')) // carries the facilitator secret
    await refuse('not a link')
    await refuse(formatInvite({ roomId: NEW, roomKey: 'c'.repeat(22) })) // no signing room: another board
    await refuse(formatInvite({ roomId: OLD, roomKey: 'z'.repeat(22), signRoomId: OLD })) // the room I am in
    await refuse(formatInvite(participantRing(movedRing({ roomId: 'Else1RoomElse1RoomElse1R', roomKey: 'a'.repeat(22) }, { roomId: NEW, roomKey: 'c'.repeat(22) })))) // another signing room
  })
})

async function verifies(who: { agreement: SessionAgreement }, key: string, sig: string, linkText: string): Promise<boolean> {
  return ed25519Verifier.verify(key, sig, movedMessage(OLD, who.agreement.publicKey, linkText))
}

describe('who is sent the new link', () => {
  const presence = (entries: Record<string, { key?: string; xkey?: string }>): Map<string, Presence> =>
    new Map(Object.entries(entries).map(([conn, e]) => [conn, { t: 'presence', conn, name: null, showName: false, ...e } as Presence]))
  const K = (c: string) => c.repeat(43)
  const me = { conn: 'cMe000000001', key: K('M') }
  const none = { removed: [] as string[], hidden: [] as string[] }

  it('is the participants present when the move started, with a key to seal to', () => {
    const p = presence({ c1: { key: K('A'), xkey: K('a') }, c2: { key: K('B'), xkey: K('b') } })
    expect(moveRecipients(none, p, new Set(['c1', 'c2']), me, null)).toEqual([{ conn: 'c1', xkey: K('a') }, { conn: 'c2', xkey: K('b') }])
  })

  it('never includes the removed participant, however they got into the list', () => {
    const p = presence({ c1: { key: K('A'), xkey: K('a') }, c2: { key: K('B'), xkey: K('b') }, c3: { key: K('R'), xkey: K('r') } })
    // Being removed right now, already removed in the log, or hidden: none of them is sent the link.
    expect(moveRecipients(none, p, new Set(['c1', 'c2', 'c3']), me, K('R')).map((r) => r.conn)).toEqual(['c1', 'c2'])
    expect(moveRecipients({ removed: [K('R')], hidden: [] }, p, new Set(['c1', 'c2', 'c3']), me, null).map((r) => r.conn)).toEqual(['c1', 'c2'])
    expect(moveRecipients({ removed: [], hidden: [K('B')] }, p, new Set(['c1', 'c2', 'c3']), me, null).map((r) => r.conn)).toEqual(['c1', 'c3'])
  })

  it('leaves out whoever arrived after the roster was frozen, has no key, or is me', () => {
    const p = presence({ c1: { key: K('A'), xkey: K('a') }, late: { key: K('L'), xkey: K('l') }, nokey: { key: K('N') }, nosession: { xkey: K('x') }, cMe000000001: { key: me.key, xkey: K('m') }, twin: { key: me.key, xkey: K('t') } })
    expect(moveRecipients(none, p, new Set(['c1', 'nokey', 'nosession', 'cMe000000001', 'twin', 'gone']), me, null)).toEqual([{ conn: 'c1', xkey: K('a') }])
  })
})
