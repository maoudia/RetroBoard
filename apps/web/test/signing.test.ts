import { describe, expect, it } from 'vitest'
import { signEvent, verifyEvent } from '@retroboard/application'
import { emptyLedger, foldAll } from '@retroboard/domain'
import { randomKey, toBase64Url } from '@retroboard/crypto'
import { createSessionSigner, ed25519Verifier, type SeedStore, signerFor } from '../app/adapters/signing'

const memory = (): SeedStore & { value: string | null } => {
  const s = { value: null as string | null, get: () => s.value, set: (v: string) => { s.value = v } }
  return s
}
const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'

describe('session signer', () => {
  it('keeps one key per session and creates a new one for another session', async () => {
    const store = memory()
    const a = await createSessionSigner(store)
    expect((await createSessionSigner(store)).publicKey).toBe(a.publicKey)
    expect((await createSessionSigner(memory())).publicKey).not.toBe(a.publicKey)
    store.value = 'garbage'
    expect((await createSessionSigner(store)).publicKey).not.toBe(a.publicKey)
  })

  it('facilitator genesis signed with the link secret verifies and roots the ledger', async () => {
    const fac = (await signerFor(toBase64Url(randomKey())))!
    const g = await signEvent(fac, roomId, { id: '01A', at: 1, body: { t: 'genesis', roomId, facilitatorKey: fac.publicKey } })
    const v = await verifyEvent(ed25519Verifier, roomId, g)
    expect(foldAll(emptyLedger(roomId), [v!]).facilitatorKey).toBe(fac.publicKey)

    const alice = await createSessionSigner(memory())
    const forged = await signEvent(alice, roomId, { id: '01B', at: 2, body: { t: 'cmd', cmd: { t: 'board.reset' }, name: null, showName: false } })
    expect(await verifyEvent(ed25519Verifier, roomId, { ...forged, author: fac.publicKey })).toBeNull()
    expect(await ed25519Verifier.verify('bad', 'bad', 'x')).toBe(false)
    expect(await signerFor('short')).toBeNull()
  })
})
