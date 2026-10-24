import { describe, expect, it } from 'vitest'
import {
  agreementKeyPair, equalBytes, fromBase64Url, fromHex, fromUtf8, hkdf, open, openFrom, pbkdf2, randomKey,
  seal, sealTo, sign, signingKeyPair, toBase64Url, toHex, utf8, verify, x25519,
} from '../src'

describe('bytes', () => {
  it('round-trips base64url without padding and rejects malformed input', () => {
    for (const n of [0, 1, 2, 3, 31, 32, 33]) {
      const b = randomKey().slice(0, n)
      const s = toBase64Url(b)
      expect(s).toMatch(/^[A-Za-z0-9_-]*$/)
      expect(fromBase64Url(s)).toEqual(b)
    }
    expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe('-_8')
    expect(fromBase64Url('a+b/')).toBeNull()
    expect(fromBase64Url('abcde')).toBeNull()
  })
  it('hex, utf8 and constant-time equality', () => {
    expect(toHex(fromHex('00ff10'))).toBe('00ff10')
    expect(() => fromHex('0g')).toThrow()
    expect(fromUtf8(utf8('Rétro'))).toBe('Rétro')
    expect(equalBytes(fromHex('0102'), fromHex('0102'))).toBe(true)
    expect(equalBytes(fromHex('0102'), fromHex('0103'))).toBe(false)
    expect(equalBytes(fromHex('01'), fromHex('0102'))).toBe(false)
  })
})

describe('KDFs (known-answer vectors)', () => {
  it('HKDF-SHA-256 matches RFC 5869 test case 1', async () => {
    const okm = await hkdf(fromHex('0b'.repeat(22)), fromHex('000102030405060708090a0b0c'), fromHex('f0f1f2f3f4f5f6f7f8f9'), 42)
    expect(toHex(okm)).toBe('3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865')
  })
  it('PBKDF2-HMAC-SHA-256 matches the RFC 7914 section 11 vector', async () => {
    const dk = await pbkdf2(utf8('passwd'), utf8('salt'), 1, 64)
    expect(toHex(dk)).toBe('55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783')
  })
})

describe('AES-GCM seal/open', () => {
  const key = randomKey()
  const aad = utf8('1|room|evt|hlc')
  it('round-trips and uses a fresh nonce every time', async () => {
    const a = await seal(key, utf8('Deploys are slow'), aad)
    const b = await seal(key, utf8('Deploys are slow'), aad)
    expect(toHex(a)).not.toBe(toHex(b))
    expect(fromUtf8((await open(key, a, aad))!)).toBe('Deploys are slow')
  })
  it('rejects tampered ciphertext, wrong AAD, wrong key and truncation', async () => {
    const sealed = await seal(key, utf8('secret'), aad)
    const tampered = sealed.slice(); tampered[tampered.length - 1]! ^= 1
    expect(await open(key, tampered, aad)).toBeNull()
    const nonce = sealed.slice(); nonce[0]! ^= 1
    expect(await open(key, nonce, aad)).toBeNull()
    expect(await open(key, sealed, utf8('1|room|other|hlc'))).toBeNull()
    expect(await open(randomKey(), sealed, aad)).toBeNull()
    expect(await open(key, sealed.slice(0, 20), aad)).toBeNull()
  })
  it('refuses keys of the wrong size', async () => {
    await expect(seal(key.slice(0, 16), utf8('x'), aad)).rejects.toThrow(/32 bytes/)
  })
})

describe('Ed25519', () => {
  // RFC 8032 section 7.1, TEST 1 (empty message).
  const seed = fromHex('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60')
  const pub = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
  const sig = 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'

  it('matches RFC 8032 test 1', async () => {
    const kp = await signingKeyPair(seed)
    expect(toHex(kp.publicKey)).toBe(pub)
    expect(toHex(await sign(seed, new Uint8Array()))).toBe(sig)
    expect(await verify(fromHex(pub), fromHex(sig), new Uint8Array())).toBe(true)
  })
  it('rejects another message, another key and malformed inputs', async () => {
    const kp = await signingKeyPair()
    const msg = utf8('genesis')
    const s = await sign(kp.privateKey, msg)
    expect(await verify(kp.publicKey, s, msg)).toBe(true)
    expect(await verify(kp.publicKey, s, utf8('genesiS'))).toBe(false)
    expect(await verify(fromHex(pub), s, msg)).toBe(false)
    expect(await verify(kp.publicKey.slice(1), s, msg)).toBe(false)
    expect(await verify(kp.publicKey, s.slice(1), msg)).toBe(false)
    await expect(sign(seed.slice(1), msg)).rejects.toThrow(/32 bytes/)
  })
})

describe('X25519', () => {
  // RFC 7748 section 6.1.
  const alice = fromHex('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a')
  const bobPub = fromHex('de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f')

  it('matches RFC 7748 6.1', async () => {
    expect(toHex((await agreementKeyPair(alice)).publicKey)).toBe('8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a')
    expect(toHex(await x25519(alice, bobPub))).toBe('4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742')
  })
  it('rejects a low-order public key and wrong sizes', async () => {
    await expect(x25519(alice, new Uint8Array(32))).rejects.toThrow()
    await expect(x25519(alice, bobPub.slice(1))).rejects.toThrow(/32 bytes/)
  })
  it('sealTo/openFrom round-trips only for the recipient and the right AAD', async () => {
    const bob = await agreementKeyPair()
    const eve = await agreementKeyPair()
    const aad = utf8('rb/delegation')
    const sealed = await sealTo(bob.publicKey, utf8('facilitator secret'), aad)
    expect(fromUtf8((await openFrom(bob, sealed, aad))!)).toBe('facilitator secret')
    expect(await openFrom(eve, sealed, aad)).toBeNull()
    expect(await openFrom(bob, sealed, utf8('other'))).toBeNull()
    expect(await openFrom(bob, sealed.slice(0, 10), aad)).toBeNull()
    const zeroEph = sealed.slice(); zeroEph.fill(0, 0, 32)
    expect(await openFrom(bob, zeroEph, aad)).toBeNull()
  })
})
