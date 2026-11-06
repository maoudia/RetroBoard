import { hkdfSync, pbkdf2Sync } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  agreementKeyPair, concat, type CurveBackend, curves, deriveContentKey, deriveFacilitatorSeed, deriveFileKey, equalBytes, fromBase64Url, fromHex, fromUtf8,
  hkdf, nobleCurves, open, openFrom, seal, selfTest, sealTo, sign, signingKeyPair, toBase64Url, useCurves, utf8, verify, webCryptoCurves, x25519,
} from '../src'
import { subtle } from '../src/webcrypto'

afterEach(() => { vi.unstubAllGlobals(); useCurves(null) })

const bytes = (...n: number[]) => Uint8Array.from(n)
const key = new Uint8Array(32).fill(7)
const aad = utf8('aad')

describe('bytes, exactly', () => {
  it('refuses bytes that are not UTF-8 instead of replacing them', () => {
    expect(() => fromUtf8(bytes(0xff))).toThrow()
    expect(fromUtf8(utf8('héllo ✓'))).toBe('héllo ✓')
  })

  it('writes base64url without padding and reads it back, whatever the length', () => {
    expect(toBase64Url(bytes(1))).toBe('AQ')
    expect(toBase64Url(bytes(1, 2))).toBe('AQI')
    expect(toBase64Url(bytes(1, 2, 3))).toBe('AQID')
    expect(toBase64Url(bytes(0xfb, 0xff))).toBe('-_8')
    for (const text of ['AQ', 'AQI', 'AQID', '-_8']) expect(toBase64Url(fromBase64Url(text)!)).toBe(text)
    expect(fromBase64Url('AQ')).toEqual(bytes(1))
    expect(fromBase64Url('AQI')).toEqual(bytes(1, 2))
    expect(fromBase64Url('-_8')).toEqual(bytes(0xfb, 0xff))
    expect(fromBase64Url('')).toEqual(new Uint8Array())
    expect(fromBase64Url('A')).toBeNull()
    expect(fromBase64Url('AQ==')).toBeNull()
    expect(fromBase64Url('AQ+/')).toBeNull()
  })

  it('reads hex of any case, nothing odd, nothing else, and nothing as nothing', () => {
    expect(fromHex('00ff10')).toEqual(bytes(0, 255, 16))
    expect(fromHex('ABcd')).toEqual(bytes(0xab, 0xcd))
    expect(fromHex('')).toEqual(new Uint8Array())
    for (const bad of ['abc', 'a', 'zz', '0x00', 'ab cd']) expect(() => fromHex(bad), bad).toThrow('invalid hex')
  })

  it('compares secrets byte by byte, whatever the position of the difference', () => {
    expect(equalBytes(bytes(1, 2, 3), bytes(1, 2, 3))).toBe(true)
    expect(equalBytes(bytes(), bytes())).toBe(true)
    for (const other of [bytes(0, 2, 3), bytes(1, 0, 3), bytes(1, 2, 0), bytes(1, 2), bytes(1, 2, 3, 4)]) expect(equalBytes(bytes(1, 2, 3), other)).toBe(false)
  })
})

describe('WebCrypto is required, with a clear message', () => {
  it('says so when the browser has none', () => {
    vi.stubGlobal('crypto', undefined)
    expect(() => subtle()).toThrow('WebCrypto is not available (secure context required)')
    vi.stubGlobal('crypto', {})
    expect(() => subtle()).toThrow('WebCrypto is not available (secure context required)')
  })
})

describe('keys of the wrong size are named', () => {
  it('for signing, key agreement and sealing', async () => {
    await expect(signingKeyPair(new Uint8Array(31))).rejects.toThrow('Ed25519 private key must be 32 bytes')
    await expect(sign(new Uint8Array(33), bytes(1))).rejects.toThrow('Ed25519 private key must be 32 bytes')
    await expect(agreementKeyPair(new Uint8Array(1))).rejects.toThrow('X25519 private key must be 32 bytes')
    await expect(x25519(new Uint8Array(31), key)).rejects.toThrow('X25519 private key must be 32 bytes')
    await expect(x25519(key, new Uint8Array(31))).rejects.toThrow('X25519 public key must be 32 bytes')
    await expect(seal(new Uint8Array(31), bytes(1), aad)).rejects.toThrow('AES key must be 32 bytes')
  })
})

describe('AES-GCM, at the edges', () => {
  it('opens the smallest message there is (nonce and tag around nothing) and refuses anything shorter', async () => {
    const empty = await seal(key, new Uint8Array(), aad)
    expect(empty).toHaveLength(28)
    expect(await open(key, empty, aad)).toEqual(new Uint8Array())
    expect(await open(key, empty.slice(0, 27), aad)).toBeNull()
    expect(await open(key, new Uint8Array(), aad)).toBeNull()
  })
})

describe('signatures never trust their inputs', () => {
  const backend = (over: Partial<CurveBackend> = {}): CurveBackend => ({ ...webCryptoCurves, edVerify: async () => true, ...over })

  it('refuse a public key or a signature of the wrong size without asking the backend', async () => {
    const calls: number[] = []
    useCurves(backend({ edVerify: async () => { calls.push(1); return true } }))
    const pub = new Uint8Array(32)
    const sig = new Uint8Array(64)
    expect(await verify(pub, sig, bytes(1))).toBe(true)
    for (const [p, s] of [[new Uint8Array(31), sig], [new Uint8Array(33), sig], [pub, new Uint8Array(63)], [pub, new Uint8Array(65)], [new Uint8Array(31), new Uint8Array(63)]] as const) {
      expect(await verify(p, s, bytes(1))).toBe(false)
    }
    expect(calls).toHaveLength(1)
  })

  it('say false, not an error, when the backend cannot even read the key', async () => {
    useCurves(backend({ edVerify: async () => { throw new Error('bad point') } }))
    expect(await verify(new Uint8Array(32), new Uint8Array(64), bytes(1))).toBe(false)
  })

  it('refuse a zero shared secret, but not one that merely has a zero in it', async () => {
    const zero = new Uint8Array(32)
    useCurves(backend({ xShared: async () => zero }))
    await expect(x25519(key, key)).rejects.toThrow('X25519 produced a zero shared secret')
    const almost = new Uint8Array(32)
    almost[31] = 1
    useCurves(backend({ xShared: async () => almost }))
    expect(await x25519(key, key)).toEqual(almost)
  })
})

describe('sealing to a public key, as specified', () => {
  const info = utf8('rb/x25519-seal/v1')

  it('opens what an independent implementation sealed, and its own output is opened by one', async () => {
    const me = await agreementKeyPair()
    const eph = await agreementKeyPair()
    const shared = await x25519(eph.privateKey, me.publicKey)
    const sealKey = await hkdf(shared, concat(eph.publicKey, me.publicKey), info)
    const by_hand = concat(eph.publicKey, await seal(sealKey, utf8('secret'), aad))
    expect(fromUtf8((await openFrom(me, by_hand, aad))!)).toBe('secret')

    const theirs = await sealTo(me.publicKey, utf8('back'), aad)
    const ephPub = theirs.slice(0, 32)
    const k = await hkdf(await x25519(me.privateKey, ephPub), concat(ephPub, me.publicKey), info)
    expect(fromUtf8((await open(k, theirs.slice(32), aad))!)).toBe('back')
  })

  it('opens an empty message and gives null for anything too short', async () => {
    const me = await agreementKeyPair()
    expect(await openFrom(me, await sealTo(me.publicKey, new Uint8Array(), aad), aad)).toEqual(new Uint8Array())
    expect(await openFrom(me, new Uint8Array(31), aad)).toBeNull()
    expect(await openFrom(me, new Uint8Array(32), aad)).toBeNull()
  })
})

describe('the key schedule, as specified', () => {
  const roomKey = bytes(...Array.from({ length: 16 }, (_, i) => i))
  const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
  const ref = (ikm: Uint8Array, salt: Uint8Array, info: Uint8Array) => new Uint8Array(hkdfSync('sha256', ikm, salt, info, 32))

  it('derives the content key with HKDF(roomKey, roomId, "rb/content/v1"), and stretches a passcode into it with PBKDF2', async () => {
    expect(await deriveContentKey(roomKey, roomId)).toEqual(ref(roomKey, utf8(roomId), utf8('rb/content/v1')))
    const stretch = new Uint8Array(pbkdf2Sync(utf8('café'.normalize('NFKC')), utf8(roomId), 1_000, 32, 'sha256'))
    expect(await deriveContentKey(roomKey, roomId, 'café', 1_000)).toEqual(ref(roomKey, utf8(roomId), concat(utf8('rb/content/v1'), stretch)))
    expect(await deriveContentKey(roomKey, roomId, 'café', 1_000)).toEqual(await deriveContentKey(roomKey, roomId, 'café', 1_000))
  })

  it('derives the facilitator seed with HKDF(secret, "", "rb/facilitator/v1")', async () => {
    expect(await deriveFacilitatorSeed(roomKey)).toEqual(ref(roomKey, new Uint8Array(), utf8('rb/facilitator/v1')))
  })

  it('derives the board file key from the content key and the room with "rb/file/v1"', async () => {
    const content = await deriveContentKey(roomKey, roomId)
    expect(await deriveFileKey(content, roomId)).toEqual(ref(content, utf8(roomId), utf8('rb/file/v1')))
  })
})

describe('curve backends, as specified', () => {
  it('are called what they are', async () => {
    expect(webCryptoCurves.name).toBe('webcrypto')
    expect((await nobleCurves()).name).toBe('noble')
  })

  it('pass the self-test only when everything matches, and fail it for each single fault', async () => {
    const noble = await nobleCurves()
    expect(await selfTest(noble)).toBe(true)
    expect(await selfTest({ ...noble, edVerify: async () => false })).toBe(false)
    expect(await selfTest({ ...noble, edSign: async (seed, msg) => { const s = await noble.edSign(seed, msg); s[0] = s[0]! ^ 1; return s }, edVerify: async () => true })).toBe(false)
    expect(await selfTest({ ...noble, xShared: async (a, b) => { const s = await noble.xShared(a, b); s[0] = s[0]! ^ 1; return s } })).toBe(false)
    expect(await selfTest({ ...noble, edSign: async () => { throw new Error('boom') } })).toBe(false)
  })

  it('can be forced and reset, so tests and old browsers pick the backend', async () => {
    const noble = await nobleCurves()
    useCurves(noble)
    expect(await curves()).toBe(noble)
    useCurves(null)
    expect((await curves()).name).toBe('webcrypto')
  })

  it('refuse a key with no public part and keep imported public keys non-extractable', async () => {
    const real = globalThis.crypto.subtle
    const importKey = vi.fn((...args: Parameters<SubtleCrypto['importKey']>) => real.importKey(...args))
    vi.stubGlobal('crypto', { subtle: { importKey, verify: real.verify.bind(real), deriveBits: real.deriveBits.bind(real), exportKey: async () => ({}) }, getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    await expect(webCryptoCurves.edPublicKey(new Uint8Array(32))).rejects.toThrow('missing public key')
    vi.stubGlobal('crypto', { subtle: { importKey, verify: real.verify.bind(real), deriveBits: real.deriveBits.bind(real), exportKey: real.exportKey.bind(real) }, getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    const me = await signingKeyPair()
    importKey.mockClear()
    await webCryptoCurves.edVerify(me.publicKey, new Uint8Array(64), new Uint8Array())
    expect(importKey.mock.calls.map((c) => [c[0], c[3]])).toEqual([['raw', false]])
    importKey.mockClear()
    await webCryptoCurves.xShared(new Uint8Array(32).fill(3), (await agreementKeyPair()).publicKey)
    expect(importKey.mock.calls.filter((c) => c[0] === 'raw').map((c) => c[3])).toEqual([false])
  })
})

describe('keys are never extractable once imported for AES, HKDF or PBKDF2', () => {
  it('imports them as non-extractable', async () => {
    const real = globalThis.crypto.subtle
    const importKey = vi.fn((...args: Parameters<SubtleCrypto['importKey']>) => real.importKey(...args))
    vi.stubGlobal('crypto', { subtle: { importKey, encrypt: real.encrypt.bind(real), decrypt: real.decrypt.bind(real), deriveBits: real.deriveBits.bind(real) }, getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    await seal(key, bytes(1), aad)
    expect(importKey.mock.calls.map((c) => [c[2], c[3]])).toEqual([['AES-GCM', false]])
  })
})
