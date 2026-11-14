import { createCipheriv, createHash, hkdfSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  CHUNK_PLAINTEXT, HEADER_BYTES, MIN_OBJECT_BYTES, type ObjectBinding, concat, deriveVaultKeys, fromBase32, fromHex, openObject, paddedSize,
  randomBytes, randomKey, readObjectHeader, sealObject, toBase32, toHex, utf8,
} from '../src'

const KEY_ID = '0011223344556677'
const seg: ObjectBinding = { pathClass: 'seg', stream: 'abcdefghijklmnopqrstuvwxyz' }
const filled = (n: number, v = 0x5a) => new Uint8Array(n).fill(v)

describe('base32', () => {
  it('matches the RFC 4648 vectors, lowercase and unpadded', () => {
    expect(toBase32(utf8(''))).toBe('')
    expect(toBase32(utf8('f'))).toBe('my')
    expect(toBase32(utf8('fo'))).toBe('mzxq')
    expect(toBase32(utf8('foobar'))).toBe('mzxw6ytboi')
    expect(new TextDecoder().decode(fromBase32('MZXW6YTBOI')!)).toBe('foobar')
  })
  it('round-trips every length and refuses what is not base32', () => {
    for (let n = 0; n < 12; n++) { const b = randomBytes(n); expect(fromBase32(toBase32(b))).toEqual(b) }
    expect(fromBase32('mzx1')).toBeNull()
    expect(fromBase32('mzxr')).toBeNull() // leftover bits are not zero
    expect(fromBase32('')).toEqual(new Uint8Array(0))
  })
})

describe('object sizes', () => {
  it('pads to a power of two of at least 1 KiB', () => {
    expect(paddedSize(0)).toBe(1024)
    expect(paddedSize(970)).toBe(1024)
    expect(paddedSize(971)).toBe(2048)
    expect(paddedSize(5000)).toBe(8192)
    for (const n of [0, 1, 969, 970, 971, 2000, 65_000, 65_536, 70_000, 200_000, 1_000_000]) {
      const size = paddedSize(n)
      expect(size & (size - 1)).toBe(0)
      expect(size).toBeGreaterThanOrEqual(MIN_OBJECT_BYTES)
    }
  })
  it('stores exactly the padded size, for one chunk and for many', async () => {
    const key = randomKey()
    for (const n of [0, 1, 970, 971, 65_000, 200_000, 1_100_000]) {
      const sealed = await sealObject(key, KEY_ID, seg, filled(n))
      expect(sealed.length).toBe(paddedSize(n))
      expect(await openObject(key, seg, sealed)).toEqual(filled(n))
    }
  })
  it('refuses an absurd size', async () => {
    await expect(sealObject(randomKey(), KEY_ID, seg, { length: 2 ** 30 } as Uint8Array)).rejects.toThrow('too large')
  })
})

describe('sealed object', () => {
  const key = randomKey()
  const data = utf8('{"title":"CANARY-title-7f3a"}')

  it('has a plaintext header and no readable content', async () => {
    const sealed = await sealObject(key, KEY_ID, seg, data)
    const head = readObjectHeader(sealed)!
    expect(head.keyId).toBe(KEY_ID)
    expect(head.salt).toHaveLength(16)
    expect(head.chunkSize).toBe(CHUNK_PLAINTEXT)
    expect(new TextDecoder('latin1').decode(sealed)).not.toContain('CANARY')
    expect(HEADER_BYTES).toBe(34)
  })

  it('matches a fixed vector computed independently with node:crypto', async () => {
    const streamKey = fromHex('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f')
    const salt = fromHex('a0a1a2a3a4a5a6a7a8a9aaabacadaeaf')
    const sealed = await sealObject(streamKey, KEY_ID, seg, utf8('hello'), salt)

    const head = Buffer.concat([Buffer.from('RBOB'), Buffer.from([1, 1]), Buffer.from(KEY_ID, 'hex'), Buffer.from(salt), Buffer.from([0, 0, 0xff, 0xf0])])
    const objKey = Buffer.from(hkdfSync('sha256', streamKey, salt, 'rb/object/v1', 32))
    const aad = Buffer.concat([
      Buffer.from('rb/object-aad/v1'), createHash('sha256').update(head).digest(), Buffer.from([0, 0, 0, 0, 1, 3]), Buffer.from('seg'),
      Buffer.from([26]), Buffer.from(seg.stream),
    ])
    const cipher = createCipheriv('aes-256-gcm', objKey, Buffer.from(new Uint8Array(12)))
    cipher.setAAD(aad)
    const plain = Buffer.alloc(1024 - 34 - 16)
    plain.writeUInt32BE(5, 0)
    plain.write('hello', 4)
    const expected = Buffer.concat([head, cipher.update(plain), cipher.final(), cipher.getAuthTag()])
    expect(toHex(sealed)).toBe(expected.toString('hex'))
    expect(toHex(sealed).slice(0, 68)).toBe(`52424f42 0101 ${KEY_ID} ${toHex(salt)} 0000fff0`.replaceAll(' ', ''))
  })

  it('draws a fresh salt per object, so equal data seals differently', async () => {
    const a = await sealObject(key, KEY_ID, seg, data)
    const b = await sealObject(key, KEY_ID, seg, data)
    expect(a).not.toEqual(b)
    expect(await openObject(key, seg, a)).toEqual(data)
    expect(await openObject(key, seg, b)).toEqual(data)
  })

  it('refuses a wrong key, a wrong stream, a wrong path class and a flipped bit', async () => {
    const sealed = await sealObject(key, KEY_ID, seg, data)
    expect(await openObject(randomKey(), seg, sealed)).toBeNull()
    expect(await openObject(key, { ...seg, stream: 'zyxwvutsrqponmlkjihgfedcba' }, sealed)).toBeNull()
    expect(await openObject(key, { ...seg, pathClass: 'chk' }, sealed)).toBeNull()
    expect(await openObject(key, { pathClass: 'man' as const, stream: '' }, sealed)).toBeNull()
    expect(await openObject(key, { pathClass: 'x' as 'seg', stream: seg.stream }, sealed)).toBeNull()
    for (const at of [0, 4, 5, 6, 14, 31, 40, sealed.length - 1]) {
      const bad = sealed.slice()
      bad[at] = bad[at]! ^ 1
      expect(await openObject(key, seg, bad), `byte ${at}`).toBeNull()
    }
  })

  it('refuses a header it does not read or a length that is not a padded size', async () => {
    const sealed = await sealObject(key, KEY_ID, seg, data)
    expect(await openObject(key, seg, sealed.slice(0, 20))).toBeNull()
    expect(await openObject(key, seg, concat(sealed, new Uint8Array(1)))).toBeNull()
    expect(await openObject(key, seg, sealed.slice(0, 1023))).toBeNull()
    expect(readObjectHeader(sealed.slice(0, 33))).toBeNull()
    const futureVersion = sealed.slice(); futureVersion[4] = 2
    expect(readObjectHeader(futureVersion)).toBeNull()
    const otherCipher = sealed.slice(); otherCipher[5] = 9
    expect(readObjectHeader(otherCipher)).toBeNull()
    const otherChunks = sealed.slice(); otherChunks[33] = 1
    expect(readObjectHeader(otherChunks)).toBeNull()
    const notMagic = sealed.slice(); notMagic[0] = 0
    expect(readObjectHeader(notMagic)).toBeNull()
    await expect(sealObject(key, 'aabb', seg, data)).rejects.toThrow('bad key id')
    await expect(sealObject(key, KEY_ID, seg, data, new Uint8Array(3))).rejects.toThrow('bad key id')
    await expect(sealObject(key, KEY_ID, { pathClass: 'seg', stream: 'x'.repeat(256) }, data)).rejects.toThrow('stream id too long')
  })

  it('detects truncation, also at a chunk boundary, and reordered chunks', async () => {
    const big = filled(200_000, 7) // 256 KiB, four chunks
    const sealed = await sealObject(key, KEY_ID, seg, big)
    expect(sealed).toHaveLength(262_144)
    expect(await openObject(key, seg, sealed)).toEqual(big)
    // Cut after the second chunk: the length is a power of two again, the new last chunk was not sealed as final.
    expect(await openObject(key, seg, sealed.slice(0, HEADER_BYTES + 2 * 65_536))).toBeNull()
    expect(await openObject(key, seg, sealed.slice(0, 131_072))).toBeNull()
    expect(await openObject(key, seg, sealed.slice(0, 200_000))).toBeNull()
    const chunk = (i: number) => sealed.slice(HEADER_BYTES + i * 65_536, HEADER_BYTES + (i + 1) * 65_536)
    const swapped = concat(sealed.slice(0, HEADER_BYTES), chunk(1), chunk(0), chunk(2), sealed.slice(HEADER_BYTES + 3 * 65_536))
    expect(await openObject(key, seg, swapped)).toBeNull()
    const dropped = concat(sealed.slice(0, HEADER_BYTES), chunk(0), chunk(2), chunk(2), sealed.slice(HEADER_BYTES + 3 * 65_536))
    expect(await openObject(key, seg, dropped)).toBeNull()
  })
})

describe('key schedule', () => {
  const master = fromHex('ff'.repeat(32))
  it('derives separate keys for the library, the manifests and each stream', async () => {
    const keys = await deriveVaultKeys(master, 'vault-1')
    const all = await Promise.all([keys.library(), keys.manifest(), keys.stream('aaa'), keys.stream('bbb')])
    expect(new Set(all.map(toHex)).size).toBe(4)
    expect(toHex(await keys.stream('aaa'))).toBe(toHex(all[2]!))
    const other = await deriveVaultKeys(master, 'vault-2')
    expect(toHex(await other.stream('aaa'))).not.toBe(toHex(all[2]!))
    expect(keys.vaultId).toBe('vault-1')
  })
  it('names streams with a keyed hash: 26 lowercase base32 characters, stable, unlinkable across vaults', async () => {
    const keys = await deriveVaultKeys(master, 'vault-1')
    const a = await keys.streamId('board:room-123')
    expect(a).toMatch(/^[a-z2-7]{26}$/)
    expect(await keys.streamId('board:room-123')).toBe(a)
    expect(await keys.streamId('board:room-124')).not.toBe(a)
    expect(await (await deriveVaultKeys(master, 'vault-2')).streamId('board:room-123')).not.toBe(a)
    expect(await (await deriveVaultKeys(randomKey(), 'vault-1')).streamId('board:room-123')).not.toBe(a)
    expect(a).not.toContain('room')
  })
  it('refuses a master key that is not 32 bytes', async () => {
    await expect(deriveVaultKeys(new Uint8Array(16), 'v')).rejects.toThrow('32 bytes')
  })
})
