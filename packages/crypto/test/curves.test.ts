import { afterEach, describe, expect, it } from 'vitest'
import {
  type CurveBackend, agreementKeyPair, curves, nobleCurves, openFrom, sealTo, selfTest, sign, signingKeyPair,
  useCurves, utf8, verify, webCryptoCurves,
} from '../src'

afterEach(() => useCurves(null))

describe('curve backends', () => {
  it('both backends pass the RFC known-answer self-test', async () => {
    expect(await selfTest(webCryptoCurves)).toBe(true)
    expect(await selfTest(await nobleCurves())).toBe(true)
  })

  it('auto-detection prefers native WebCrypto', async () => {
    expect((await curves()).name).toBe('webcrypto')
  })

  it('a broken backend fails the self-test instead of throwing', async () => {
    const broken: CurveBackend = { ...webCryptoCurves, edSign: () => Promise.reject(new Error('NotSupportedError')) }
    expect(await selfTest(broken)).toBe(false)
  })

  it('keys and messages are interoperable across backends', async () => {
    const noble = await nobleCurves()
    useCurves(noble)
    const signer = await signingKeyPair()
    const sig = await sign(signer.privateKey, utf8('genesis'))
    const bob = await agreementKeyPair()
    const sealed = await sealTo(bob.publicKey, utf8('hi'), utf8('aad'))

    useCurves(webCryptoCurves)
    expect(await verify(signer.publicKey, sig, utf8('genesis'))).toBe(true)
    expect((await signingKeyPair(signer.privateKey)).publicKey).toEqual(signer.publicKey)
    expect(await openFrom(bob, sealed, utf8('aad'))).toEqual(utf8('hi'))
  })

  it('noble verify returns false on garbage', async () => {
    useCurves(await nobleCurves())
    const kp = await signingKeyPair()
    expect(await verify(kp.publicKey, new Uint8Array(64), utf8('x'))).toBe(false)
  })
})
