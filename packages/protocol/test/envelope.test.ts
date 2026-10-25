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

  it.each(['role.delegate', 'role.revoke', 'role.handover', 'role.claim', 'participant.hide', 'participant.unhide', 'participant.remove'])('accepts the %s role event', async (t) => {
    const { parseSignedEvent } = await import('../src')
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(86), body: { t, key } })).not.toBeNull()
    expect(parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(86), body: { t, key: 'bad' } })).toBeNull()
  })

  it('accepts the rename event with a bounded name and rejects an oversized one', async () => {
    const { parseSignedEvent } = await import('../src')
    const signed = (body: unknown) => parseSignedEvent({ id: env.id, at: 1, author: key, sig: 'A'.repeat(86), body })
    expect(signed({ t: 'participant.rename', key, name: 'Sam' })).not.toBeNull()
    expect(signed({ t: 'participant.rename', key, name: '' })).not.toBeNull()
    expect(signed({ t: 'participant.rename', key, name: 'x'.repeat(500) })).toBeNull()
    expect(signed({ t: 'participant.rename', key })).toBeNull()
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

describe('live frames (cursors and focus, never stored)', () => {
  it('accepts anchored cursors and focus, rejects out-of-range or unknown shapes', async () => {
    const { parseLive } = await import('../src')
    const cursor = { t: 'cursor', conn: 'abcd1234', anchor: 'note-1', x: 0, y: 65_535, drag: false }
    expect(parseLive(cursor)).toEqual(cursor)
    expect(parseLive({ ...cursor, anchor: null })).not.toBeNull()
    expect(parseLive({ ...cursor, x: 65_536 })).toBeNull()
    expect(parseLive({ ...cursor, y: -1 })).toBeNull()
    expect(parseLive({ ...cursor, x: 0.5 })).toBeNull()
    expect(parseLive({ ...cursor, anchor: '../x' })).toBeNull()
    expect(parseLive({ ...cursor, extra: 1 })).toBeNull()
    const focus = { t: 'focus', conn: 'abcd1234', column: 'col-1', note: null, typing: true }
    expect(parseLive(focus)).toEqual(focus)
    expect(parseLive({ ...focus, typing: 'yes' })).toBeNull()
    expect(parseLive({ t: 'presence', conn: 'abcd1234', name: null, showName: false })).not.toBeNull()
    expect(parseLive({ t: 'nope', conn: 'abcd1234' })).toBeNull()
  })
})

describe('peer-to-peer frames', () => {
  const env = { v: 2, room: 'Ab3dEfGhIjKlMnOpQrStUv', id: '01J00000000000000000000001', hlc: 1, ct: 'AAAA' }
  it('relay carries signalling to one connection', async () => {
    const { parseClientFrame, parseRelayFrame } = await import('../src')
    expect(parseClientFrame({ t: 'sig', to: 'abcd1234', env })).not.toBeNull()
    expect(parseClientFrame({ t: 'sig', to: 'no', env })).toBeNull()
    expect(parseRelayFrame({ t: 'sig', from: 'abcd1234', env })).not.toBeNull()
  })

  it('signals are offers or answers with a bounded SDP', async () => {
    const { parseSignal } = await import('../src')
    const s = { t: 'sig', from: 'abcd1234', to: 'efgh5678', kind: 'offer', sdp: 'v=0' }
    expect(parseSignal(s)).toEqual(s)
    expect(parseSignal({ ...s, kind: 'candidate' })).toBeNull()
    expect(parseSignal({ ...s, sdp: 'x'.repeat(12_001) })).toBeNull()
  })

  it('data channel frames: have lists, envelopes, synced, eph with hops', async () => {
    const { HAVE_CHUNK, parsePeerFrame, PEER_ENV_CHUNK } = await import('../src')
    expect(parsePeerFrame({ t: 'have', ids: [env.id], done: true })).not.toBeNull()
    expect(parsePeerFrame({ t: 'have', ids: Array(HAVE_CHUNK + 1).fill(env.id), done: false })).toBeNull()
    expect(parsePeerFrame({ t: 'have', ids: ['../x'], done: true })).toBeNull()
    expect(parsePeerFrame({ t: 'env', envs: [env] })).not.toBeNull()
    expect(parsePeerFrame({ t: 'env', envs: Array(PEER_ENV_CHUNK + 1).fill(env) })).toBeNull()
    expect(parsePeerFrame({ t: 'synced' })).toEqual({ t: 'synced' })
    expect(parsePeerFrame({ t: 'eph', env, hop: 3 })).not.toBeNull()
    expect(parsePeerFrame({ t: 'eph', env, hop: 4 })).toBeNull()
  })

  it('presence can say the participant is relay-only', async () => {
    const { parsePresence } = await import('../src')
    expect(parsePresence({ t: 'presence', conn: 'abcd1234', name: null, showName: false, relayOnly: true })?.relayOnly).toBe(true)
  })
})
