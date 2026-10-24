import { describe, expect, it } from 'vitest'
import { envelopeAad, parseClientFrame, parseEnvelope, parsePresence, parseRelayFrame, parseSignedEvent } from '../src'

const env = { v: 2 as const, room: 'Ab3dEfGhIjKlMnOpQrStUv', id: '01JABCDEFGHJKMNPQRSTVWXYZ0', hlc: 1_700_000_000_000, ct: 'AbC-_9' }
const key = 'a'.repeat(42) + 'A'

describe('envelope v2', () => {
  it('parses a valid envelope and builds its AAD', () => {
    expect(parseEnvelope(env)).toEqual(env)
    expect(envelopeAad(env)).toBe(`2|${env.room}|${env.id}|${env.hlc}`)
  })

  it.each([
    { ...env, v: 1 }, { ...env, room: 'x' }, { ...env, id: 'short' }, { ...env, hlc: -1 }, { ...env, hlc: 1.5 },
    { ...env, ct: 'not base64!' }, { ...env, ct: 'a'.repeat(30_000) }, { ...env, extra: 'plaintext leak' },
  ])('rejects %j', (bad) => {
    expect(parseEnvelope(bad)).toBeNull()
  })

  it('parses client and relay frames', () => {
    expect(parseClientFrame({ t: 'pub', envs: [env] })).not.toBeNull()
    expect(parseClientFrame({ t: 'pub', envs: [] })).toBeNull()
    expect(parseClientFrame({ t: 'eph', env })).not.toBeNull()
    expect(parseClientFrame({ t: 'note.add', columnId: 'x', text: 'plain' })).toBeNull()
    expect(parseRelayFrame({ t: 'welcome', conn: 'abcd1234', peers: ['abcd1234'] })).not.toBeNull()
    expect(parseRelayFrame({ t: 'hist', envs: [env], done: true })).not.toBeNull()
    expect(parseRelayFrame({ t: 'err', code: 'rate' })).not.toBeNull()
    expect(parseRelayFrame({ t: 'err', code: 'other' })).toBeNull()
  })

  it('parses the encrypted payloads', () => {
    const sig = 'A'.repeat(86)
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig, body: { t: 'cmd', cmd: { t: 'vote.toggle', id: 'abcd' }, name: null, showName: false } })).not.toBeNull()
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig, body: { t: 'genesis', roomId: env.room, facilitatorKey: key } })).not.toBeNull()
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'short', body: { t: 'role.delegate', key } })).toBeNull()
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig, body: { t: 'cmd', cmd: { t: 'nope' }, name: null, showName: false } })).toBeNull()
    expect(parsePresence({ t: 'presence', conn: 'abcd1234', name: 'Ana', showName: true })).not.toBeNull()
  })
})
