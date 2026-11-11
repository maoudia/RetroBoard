import { afterEach, describe, expect, it } from 'vitest'
import { deriveContentKey, fromBase64Url, fromUtf8, open, toBase64Url, utf8 } from '@retroboard/crypto'
import { movedRing, type KeyRing } from '@retroboard/domain'
import { envelopeAad, parseLive } from '@retroboard/protocol'
import { MOVE_SETTLE_MS } from '../app/transport/encrypted'
import { createBoardAs, type Peer, World } from './sync-harness'

let world: World
afterEach(() => world?.dispose())

const keyOf = (p: Peer) => p.transport.actorKey

/** Alice (facilitator), Bob and Carol on one board with two notes; Carol is the one to remove. */
async function team() {
  world = new World()
  const alice = await world.join('alice', { facilitator: true })
  await createBoardAs(world, alice)
  const bob = await world.join('bob')
  const carol = await world.join('carol')
  expect(await world.until(() => [bob, carol].every((p) => p.status === 'open' && p.snapshot?.peers.length === 3))).toBe(true)
  alice.note('by alice')
  bob.note('by bob')
  expect(await world.until(() => world.converged() && alice.notes.length === 2)).toBe(true)
  // Presence (with the X25519 keys) reached everybody.
  expect(await world.until(() => alice.transport.beginMove(null) === 2)).toBe(true)
  return { alice, bob, carol }
}

const freshRing = (from: KeyRing): KeyRing => movedRing(from, { roomId: 'NewRoomIdNewRoomIdNewR1', roomKey: toBase64Url(new Uint8Array(16).fill(7)) })

describe('moving the team to a fresh link', () => {
  it('sends the new link to the others and not to the removed participant, and closes the old room', async () => {
    const { alice, bob, carol } = await team()
    const oldRing = { roomId: world.roomId, roomKey: world.roomKey, facilitatorSecret: world.facilitatorSecret }
    const ring = freshRing(oldRing)

    expect(alice.transport.sendRole('participant.remove', keyOf(carol))).toBe(true)
    expect(alice.transport.beginMove(keyOf(carol))).toBe(1)
    const moved = alice.transport.moveToFreshLink(keyOf(carol), ring)
    await world.run(MOVE_SETTLE_MS + 1_500)
    const result = await moved

    expect(result?.moved).toBe(1)
    expect(result?.hash).toContain(`k=${ring.roomKey}`)
    expect(result?.hash).toContain(`f=${world.facilitatorSecret}`) // the facilitator's own link
    // Bob is sent the participant link; Carol gets nothing.
    expect(await world.until(() => bob.moved !== null)).toBe(true)
    expect(bob.moved?.ring).toEqual({ roomId: ring.roomId, roomKey: ring.roomKey, signRoomId: world.roomId })
    expect(bob.moved?.hash).not.toContain('f=')
    expect(carol.moved).toBeNull()
    // The old room is closed for everybody who still folds it, the removed participant included.
    expect(await world.until(() => [alice, bob, carol].every((p) => p.snapshot?.settings.destroyed === true))).toBe(true)
  })

  it('keeps the board whole in the new room: same events, authors and votes, sealed under the new key', async () => {
    const { alice, bob, carol } = await team()
    const ring = freshRing({ roomId: world.roomId, roomKey: world.roomKey, facilitatorSecret: world.facilitatorSecret })
    alice.transport.sendRole('participant.remove', keyOf(carol))
    alice.transport.beginMove(keyOf(carol))
    const moved = alice.transport.moveToFreshLink(keyOf(carol), ring)
    await world.run(MOVE_SETTLE_MS + 1_500)
    await moved
    expect(await world.until(() => bob.moved !== null)).toBe(true)

    // Both copies are in the new room, under the new content key; the old key opens none of them.
    const newKey = await deriveContentKey(fromBase64Url(ring.roomKey)!, ring.roomId)
    const oldKey = await deriveContentKey(fromBase64Url(world.roomKey)!, world.roomId)
    for (const p of [alice, bob]) {
      const rows = [...(p.replica.rows.get(ring.roomId)?.values() ?? [])].map((d) => JSON.parse(d) as { v: number; room: string; id: string; hlc: number; ct: string })
      expect(rows.length).toBeGreaterThan(3)
      for (const env of rows) {
        expect(env.room).toBe(ring.roomId)
        expect(await open(newKey, fromBase64Url(env.ct)!, utf8(envelopeAad(env)))).not.toBeNull()
        expect(await open(oldKey, fromBase64Url(env.ct)!, utf8(envelopeAad(env)))).toBeNull()
      }
    }
    // Carol has no copy of the new room.
    expect(carol.replica.rows.get(ring.roomId)).toBeUndefined()

    // Bob opens the new room from his own copy alone: the events verify under the signing room of the first one.
    world.dispose()
    world = new World(ring)
    const again = await world.join('bob', { replica: bob.replica })
    expect(await world.until(() => again.snapshot !== null)).toBe(true)
    expect(again.notes).toEqual(['by alice', 'by bob'])
    expect(again.snapshot?.settings.destroyed).toBe(false)
  })

  it('shows the removed participant nothing they can open: the frames are sealed to the others', async () => {
    const { alice, bob, carol } = await team()
    const ring = freshRing({ roomId: world.roomId, roomKey: world.roomKey, facilitatorSecret: world.facilitatorSecret })
    alice.transport.sendRole('participant.remove', keyOf(carol))
    alice.transport.beginMove(keyOf(carol))
    const moved = alice.transport.moveToFreshLink(keyOf(carol), ring)
    await world.run(MOVE_SETTLE_MS + 1_500)
    await moved

    // Carol holds the old room key: she can read every ephemeral envelope the relay carried.
    const oldKey = await deriveContentKey(fromBase64Url(world.roomKey)!, world.roomId)
    const frames = []
    for (const env of world.relay.ephs) {
      const pt = await open(oldKey, fromBase64Url(env.ct)!, utf8(envelopeAad(env)))
      const live = pt ? parseLive(JSON.parse(fromUtf8(pt))) : null
      if (live?.t === 'room.moved') frames.push(live)
    }
    expect(frames).toHaveLength(1) // one per remaining participant, none for her
    const sealed = fromBase64Url(frames[0]!.ct)!
    const aad = utf8(`rb/room-moved/v1|${world.roomId}`)
    expect(await carol.agreement.open(sealed, aad)).toBeNull()
    expect(await bob.agreement.open(sealed, aad)).not.toBeNull()
    // Nothing she can read in the old room names the new room, its key or its link.
    const plain = JSON.stringify(frames)
    expect(plain).not.toContain(ring.roomId)
    expect(plain).not.toContain(ring.roomKey)
  })

  it('does not send the link to somebody who connected after the roster was frozen', async () => {
    const { alice, bob, carol } = await team()
    const ring = freshRing({ roomId: world.roomId, roomKey: world.roomKey, facilitatorSecret: world.facilitatorSecret })
    expect(alice.transport.beginMove(keyOf(carol))).toBe(1)
    // The removed participant comes back under a fresh session key right after the dialog opened.
    const returning = await world.join('carol-again')
    expect(await world.until(() => returning.status === 'open')).toBe(true)
    alice.transport.sendRole('participant.remove', keyOf(carol))
    const moved = alice.transport.moveToFreshLink(keyOf(carol), ring)
    await world.run(MOVE_SETTLE_MS + 1_500)
    expect((await moved)?.moved).toBe(1)
    expect(await world.until(() => bob.moved !== null)).toBe(true)
    expect(returning.moved).toBeNull()
    expect(carol.moved).toBeNull()
  })

  it('refuses to move for a participant, for a ring of the same room, and for a ring of another board', async () => {
    const { alice, bob } = await team()
    const old = { roomId: world.roomId, roomKey: world.roomKey, facilitatorSecret: world.facilitatorSecret }
    expect(bob.transport.beginMove(null)).toBe(0)
    expect(await bob.transport.moveToFreshLink(null, freshRing(old))).toBeNull()
    expect(await alice.transport.moveToFreshLink(null, { ...freshRing(old), roomId: world.roomId })).toBeNull()
    expect(await alice.transport.moveToFreshLink(null, { roomId: 'NewRoomIdNewRoomIdNewR1', roomKey: toBase64Url(new Uint8Array(16).fill(7)) })).toBeNull()
    expect(alice.snapshot?.settings.destroyed).toBe(false)
  })

  it('ignores a hand-off signed by a participant who is not the lead', async () => {
    const { alice, bob } = await team()
    const ring = freshRing({ roomId: world.roomId, roomKey: world.roomKey })
    // Bob tries to move the team: he is not the lead, so he cannot sign a hand-off the others accept.
    expect(await bob.transport.moveToFreshLink(null, ring)).toBeNull()
    await world.run(MOVE_SETTLE_MS + 1_500)
    expect(alice.moved).toBeNull()
  })
})
