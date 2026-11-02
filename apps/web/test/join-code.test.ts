import { agreementKeyPair, fromBase64Url, openFrom, sealTo, toBase64Url, utf8, fromUtf8 } from '@retroboard/crypto'
import { describe, expect, it } from 'vitest'
import { joinRoomId, JOIN_ALPHABET, newJoinCode, normalizeJoinCode, openJoinMsg, safetyNumber, sealJoinMsg } from '../app/utils/join-code'

describe('join code', () => {
  it('makes codes without look-alike characters and reads them back loosely', () => {
    for (let i = 0; i < 50; i++) {
      const c = newJoinCode()
      expect(c).toMatch(/^RB-[2-9A-HJ-NP-Z]{6}$/)
      expect(normalizeJoinCode(c.toLowerCase().replace('-', ' '))).toBe(c)
    }
    expect(JOIN_ALPHABET).not.toMatch(/[01OI]/)
    expect(normalizeJoinCode('jasmine pebble fox')).toBeNull()
    expect(normalizeJoinCode('RB-12345')).toBeNull()
  })

  it('derives a valid, stable side room from the code only', async () => {
    const a = await joinRoomId('RB-7KQ2M9')
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(await joinRoomId('RB-7KQ2M9')).toBe(a)
    expect(await joinRoomId('RB-7KQ2M8')).not.toBe(a)
  })

  it('opens messages only with the right code and room', async () => {
    const room = await joinRoomId('RB-7KQ2M9')
    const env = await sealJoinMsg('RB-7KQ2M9', room, { t: 'knock', n: 'n1', pub: 'abc', name: 'Bob' })
    expect(await openJoinMsg('RB-7KQ2M9', env)).toEqual({ t: 'knock', n: 'n1', pub: 'abc', name: 'Bob' })
    expect(await openJoinMsg('RB-7KQ2M8', env)).toBeNull()
    expect(await openJoinMsg('RB-7KQ2M9', { ...env, room: await joinRoomId('RB-AAAAAA') })).toBeNull()
  })

  it('hands the link to the joiner alone, and a swapped key changes the safety number', async () => {
    const joiner = await agreementKeyPair()
    const link = '/board#r=abc&k=secretkey'
    const sealed = await sealTo(joiner.publicKey, utf8(link), utf8('n1'))
    expect(fromUtf8((await openFrom(joiner, sealed, utf8('n1')))!)).toBe(link)
    const relay = await agreementKeyPair()
    expect(await openFrom(relay, sealed, utf8('n1'))).toBeNull()
    expect(await safetyNumber(joiner.publicKey)).toMatch(/^\d{3} \d{3}$/)
    expect(await safetyNumber(relay.publicKey)).not.toBe(await safetyNumber(joiner.publicKey))
    expect(fromBase64Url(toBase64Url(joiner.publicKey))).toEqual(joiner.publicKey)
  })
})
