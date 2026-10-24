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

describe('board file and v2 payload details', () => {
  const room = 'Ab3dEfGhIjKlMnOpQrStUv'
  it('parses a board file and binds its AAD to the room', async () => {
    const { BOARD_FILE_FORMAT, boardFileAad, parseBoardFile, parseEnvelopes } = await import('../src')
    expect(BOARD_FILE_FORMAT).toBe('retro/1')
    expect(boardFileAad(room)).toBe(`retro/1|${room}`)
    expect(parseBoardFile({ format: 'retro/1', room, ct: 'AbC-_9' })).toEqual({ format: 'retro/1', room, ct: 'AbC-_9' })
    expect(parseBoardFile({ format: 'retro/2', room, ct: 'AbC' })).toBeNull()
    expect(parseBoardFile({ format: 'retro/1', room: 'x', ct: 'AbC' })).toBeNull()
    expect(parseBoardFile({ format: 'retro/1', room, ct: 'not b64!' })).toBeNull()
    expect(parseBoardFile({ format: 'retro/1', room, ct: 'AbC', extra: 1 })).toBeNull()
    expect(parseEnvelopes([env])).toEqual([env])
    expect(parseEnvelopes([{ ...env, v: 1 }])).toBeNull()
    expect(parseEnvelopes({})).toBeNull()
  })

  it('presence may carry session and facilitator keys, validated', async () => {
    const { parsePresence } = await import('../src')
    const base = { t: 'presence', conn: 'abcd1234', name: null, showName: false }
    expect(parsePresence({ ...base, key, fkey: key })).toEqual({ ...base, key, fkey: key })
    expect(parsePresence({ ...base, key: 'short' })).toBeNull()
    expect(parsePresence({ ...base, fkey: 'short' })).toBeNull()
    expect(parsePresence({ ...base, name: 'x'.repeat(200) })).toBeNull()
    expect(parsePresence({ ...base, conn: 'no' })).toBeNull()
  })

  it.each(['role.delegate', 'role.revoke', 'role.handover', 'participant.hide', 'participant.unhide'])('accepts the %s role event', async (t) => {
    const { parseSignedEvent } = await import('../src')
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(86), body: { t, key } })).not.toBeNull()
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(86), body: { t, key: 'bad' } })).toBeNull()
  })

  it('rejects unknown role events, a wrong signature length and bad relay frames', async () => {
    const { parseRelayFrame, parseSignedEvent, MAX_FRAME_BYTES, RELAY_BUFFER, RELAY_BUFFER_BYTES, MAX_ENVELOPES_PER_MESSAGE } = await import('../src')
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(86), body: { t: 'role.owner', key } })).toBeNull()
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(87), body: { t: 'role.revoke', key } })).toBeNull()
    expect(parseRelayFrame({ t: 'need' })).toEqual({ t: 'need' })
    expect(parseRelayFrame({ t: 'peers', peers: ['abcd1234'] })).not.toBeNull()
    expect(parseRelayFrame({ t: 'env', envs: Array.from({ length: MAX_ENVELOPES_PER_MESSAGE + 1 }, () => env) })).toBeNull()
    expect(parseRelayFrame({ t: 'eph', env })).not.toBeNull()
    expect([MAX_FRAME_BYTES, RELAY_BUFFER, RELAY_BUFFER_BYTES]).toEqual([256 * 1024, 2_000, 4 * 1024 * 1024])
  })
})
