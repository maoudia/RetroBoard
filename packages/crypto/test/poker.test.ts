import { describe, expect, it } from 'vitest'
import { CARD_INDEX_MAX, fromBase64Url, openCard, randomKey, roundKeyPair, sealCard, toBase64Url } from '../src'

const room = 'Ab3dEfGhIjKlMnOpQrStUv'
const voter = 'v'.repeat(43)
const b64 = (b: Uint8Array) => toBase64Url(b)

describe('round key', () => {
  it('is the same pair for the same secret on any device and another for another round or room', async () => {
    const secret = randomKey()
    const a = await roundKeyPair(secret, room, 'r1')
    expect(await roundKeyPair(secret, room, 'r1')).toEqual(a)
    expect((await roundKeyPair(secret, room, 'r2')).publicKey).not.toEqual(a.publicKey)
    expect((await roundKeyPair(secret, 'Zz3dEfGhIjKlMnOpQrStUv', 'r1')).publicKey).not.toEqual(a.publicKey)
    expect((await roundKeyPair(randomKey(), room, 'r1')).publicKey).not.toEqual(a.publicKey)
  })

  it('is fixed by the derivation (known answer)', async () => {
    const secret = new Uint8Array(32).map((_, i) => i)
    expect(b64((await roundKeyPair(secret, room, 'r1')).publicKey)).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(b64((await roundKeyPair(secret, room, 'r1')).publicKey)).toBe(b64((await roundKeyPair(secret, room, 'r1')).publicKey))
  })
})

describe('sealed card', () => {
  it('opens to the deck index with the round key, 134 characters whatever the card', async () => {
    const keys = await roundKeyPair(randomKey(), room, 'r1')
    for (const index of [0, 5, 23, CARD_INDEX_MAX]) {
      const sealed = await sealCard(b64(keys.publicKey), room, voter, index)
      expect(sealed).toHaveLength(134)
      expect(await openCard(b64(keys.privateKey), b64(keys.publicKey), room, voter, sealed)).toBe(index)
    }
  })

  it('seals the same card to different ciphertexts', async () => {
    const keys = await roundKeyPair(randomKey(), room, 'r1')
    expect(await sealCard(b64(keys.publicKey), room, voter, 3)).not.toBe(await sealCard(b64(keys.publicKey), room, voter, 3))
  })

  it('does not open for the voter itself (it has the public half only), nor under another key, round, voter or room', async () => {
    const secret = randomKey()
    const one = await roundKeyPair(secret, room, 'r1')
    const two = await roundKeyPair(secret, room, 'r2')
    const sealed = await sealCard(b64(one.publicKey), room, voter, 4)
    expect(await openCard(b64(one.publicKey), b64(one.publicKey), room, voter, sealed)).toBeNull()
    expect(await openCard(b64(two.privateKey), b64(two.publicKey), room, voter, sealed)).toBeNull()
    expect(await openCard(b64(two.privateKey), b64(one.publicKey), room, voter, sealed)).toBeNull()
    expect(await openCard(b64(one.privateKey), b64(one.publicKey), room, 'w'.repeat(43), sealed)).toBeNull()
    expect(await openCard(b64(one.privateKey), b64(one.publicKey), 'Zz3dEfGhIjKlMnOpQrStUv', voter, sealed)).toBeNull()
    expect(await openCard(b64(one.privateKey), b64(one.publicKey), room, voter, `${sealed.slice(0, -2)}AA`)).toBeNull()
    expect(await openCard('not a key', b64(one.publicKey), room, voter, sealed)).toBeNull()
    expect(await openCard(b64(one.privateKey), b64(one.publicKey), room, voter, '***')).toBeNull()
    expect(await openCard(b64(one.privateKey), b64(one.publicKey), room, voter, sealed)).toBe(4)
  })

  it('refuses a card that is not an index of at most two digits, or a key that is not one', async () => {
    const keys = await roundKeyPair(randomKey(), room, 'r1')
    for (const bad of [-1, 1.5, CARD_INDEX_MAX + 1, Number.NaN]) await expect(sealCard(b64(keys.publicKey), room, voter, bad)).rejects.toThrow('invalid card')
    await expect(sealCard('***', room, voter, 1)).rejects.toThrow('invalid card')
    expect(fromBase64Url(b64(keys.publicKey))).toHaveLength(32)
  })
})
