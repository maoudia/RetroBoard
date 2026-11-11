import { describe, expect, it } from 'vitest'
import { ballotKeyPair, BALLOT_PLAINTEXT_BYTES, fromBase64Url, openBallot, randomKey, sealBallot, sealTo, toBase64Url, utf8 } from '../src'

const ctx = { room: 'Ab3dEfGhIjKlMnOpQrStUv', voter: 'v'.repeat(43) }
const note = { kind: 'note', id: 'abcdefghij1' } as const

describe('ballot key', () => {
  it('is the same pair for the same seed on any device, and another pair for another seed', async () => {
    const seed = randomKey()
    const a = await ballotKeyPair(seed)
    expect(await ballotKeyPair(seed)).toEqual(a)
    expect((await ballotKeyPair(randomKey())).publicKey).not.toEqual(a.publicKey)
    expect(a.privateKey).not.toEqual(seed)
  })

  it('is fixed by the derivation, so a link made today still opens the ballots of tomorrow (known answer)', async () => {
    const seed = new Uint8Array(32).map((_, i) => i)
    expect(toBase64Url((await ballotKeyPair(seed)).publicKey)).toBe('K5KLoDlmbB6KQV3VYgbHM-iuLG2IzP8VCDDHphlkNgI')
  })
})

describe('sealed ballot', () => {
  it('opens to the vote with the ballot key', async () => {
    const keys = await ballotKeyPair(randomKey())
    expect(await openBallot(keys, ctx, await sealBallot(keys.publicKey, ctx, note))).toEqual(note)
    const cluster = { kind: 'cluster', id: 'Zz_-9' } as const
    expect(await openBallot(keys, ctx, await sealBallot(keys.publicKey, ctx, cluster))).toEqual(cluster)
    const longest = { kind: 'note', id: 'a'.repeat(32) } as const
    expect(await openBallot(keys, ctx, await sealBallot(keys.publicKey, ctx, longest))).toEqual(longest)
  })

  it('does not open for anyone else: another key, another voter, another room', async () => {
    const keys = await ballotKeyPair(randomKey())
    const sealed = await sealBallot(keys.publicKey, ctx, note)
    expect(await openBallot(await ballotKeyPair(randomKey()), ctx, sealed)).toBeNull()
    expect(await openBallot(keys, { ...ctx, voter: 'w'.repeat(43) }, sealed)).toBeNull()
    expect(await openBallot(keys, { ...ctx, room: 'Zz3dEfGhIjKlMnOpQrStUv' }, sealed)).toBeNull()
  })

  it('looks the same whatever the vote: same length for a note and a cluster, new bytes for the same vote each time', async () => {
    const keys = await ballotKeyPair(randomKey())
    const a = await sealBallot(keys.publicKey, ctx, note)
    const b = await sealBallot(keys.publicKey, ctx, note)
    const c = await sealBallot(keys.publicKey, ctx, { kind: 'cluster', id: 'Zz_-9' })
    expect(a).not.toBe(b)
    expect(a).toHaveLength(c.length)
    expect(fromBase64Url(a)).toHaveLength(32 + 12 + BALLOT_PLAINTEXT_BYTES + 16)
  })

  it('rejects a tampered, truncated or malformed ballot', async () => {
    const keys = await ballotKeyPair(randomKey())
    const bytes = fromBase64Url(await sealBallot(keys.publicKey, ctx, note))!
    for (const i of [0, 31, 32, 44, bytes.length - 1]) {
      const bad = bytes.slice()
      bad[i] = bad[i]! ^ 1
      expect(await openBallot(keys, ctx, toBase64Url(bad))).toBeNull()
    }
    expect(await openBallot(keys, ctx, toBase64Url(bytes.slice(0, -1)))).toBeNull()
    expect(await openBallot(keys, ctx, '')).toBeNull()
    expect(await openBallot(keys, ctx, 'not base64 !')).toBeNull()
  })

  it('refuses to seal an id the board never produces', async () => {
    const keys = await ballotKeyPair(randomKey())
    await expect(sealBallot(keys.publicKey, ctx, { kind: 'note', id: 'x y' })).rejects.toThrow('invalid ballot id')
    await expect(sealBallot(keys.publicKey, ctx, { kind: 'note', id: 'a'.repeat(33) })).rejects.toThrow('invalid ballot id')
  })

  it('ignores a ballot that opens but does not hold a vote', async () => {
    const keys = await ballotKeyPair(randomKey())
    const aad = utf8(`rb/ballot/v1|${ctx.room}|${ctx.voter}|${toBase64Url(keys.publicKey)}`)
    const forge = async (plain: Uint8Array) => toBase64Url(await sealTo(keys.publicKey, plain, aad))
    const record = (text: string) => utf8(text.padEnd(BALLOT_PLAINTEXT_BYTES, ' '))
    expect(await openBallot(keys, ctx, await forge(record('nabcdefghij1')))).toEqual(note)
    expect(await openBallot(keys, ctx, await forge(record('xabcdefghij1')))).toBeNull()
    expect(await openBallot(keys, ctx, await forge(record('n')))).toBeNull()
    expect(await openBallot(keys, ctx, await forge(record('nab cd')))).toBeNull()
    expect(await openBallot(keys, ctx, await forge(utf8('nabcdefghij1')))).toBeNull()
    expect(await openBallot(keys, ctx, await forge(new Uint8Array(BALLOT_PLAINTEXT_BYTES).fill(0xff)))).toBeNull()
  })
})
