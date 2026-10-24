import { describe, expect, it } from 'vitest'
import { emptyLedger, foldAll, type VerifiedEvent } from '@retroboard/domain'
import { canonicalJson, signEvent, type SignerPort, verifyEvent, type VerifierPort } from '../src'

// Fake signature scheme: sig = "<key>:" + message length + checksum. Enough to test the plumbing.
const sum = (m: string) => [...m].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const signer = (publicKey: string): SignerPort => ({ publicKey, sign: async (m) => `${publicKey}:${sum(m)}` })
const verifier: VerifierPort = { verify: async (k, s, m) => s === `${k}:${sum(m)}` }

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const ALICE = 'a'.repeat(42) + 'A'

describe('canonical JSON', () => {
  it('sorts keys and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: [true, undefined, { d: 'x', c: null }], z: undefined })).toBe('{"a":[true,null,{"c":null,"d":"x"}],"b":1}')
  })
})

describe('signed events', () => {
  it('a signed event verifies and folds; tampering, another room or another author fail', async () => {
    const g = await signEvent(signer(FAC), roomId, { id: '01A', at: 1, body: { t: 'genesis', roomId, facilitatorKey: FAC } })
    const ok = await verifyEvent(verifier, roomId, g)
    expect(ok).toEqual({ id: '01A', at: 1, author: FAC, body: g.body })
    expect(foldAll(emptyLedger(roomId), [ok as VerifiedEvent]).facilitatorKey).toBe(FAC)

    expect(await verifyEvent(verifier, 'Zz3dEfGhIjKlMnOpQrStUv', g)).toBeNull()
    expect(await verifyEvent(verifier, roomId, { ...g, at: 2 })).toBeNull()
    expect(await verifyEvent(verifier, roomId, { ...g, author: ALICE })).toBeNull()
  })

  it('a participant cannot pass a privileged event off as the facilitator', async () => {
    const forged = await signEvent(signer(ALICE), roomId, { id: '01B', at: 2, body: { t: 'cmd', cmd: { t: 'board.reset' }, name: null, showName: false } })
    expect(await verifyEvent(verifier, roomId, { ...forged, author: FAC })).toBeNull()
  })
})
