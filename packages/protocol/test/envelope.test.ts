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
    // The avatar hue chosen in the profile travels with the presence, display only, bounded.
    expect(parsePresence({ t: 'presence', conn: 'abcd1234', name: 'Ana', showName: true, hue: 175 })).not.toBeNull()
    expect(parsePresence({ t: 'presence', conn: 'abcd1234', name: 'Ana', showName: true, hue: 360 })).toBeNull()
    expect(parsePresence({ t: 'presence', conn: 'abcd1234', name: 'Ana', showName: true, hue: 1.5 })).toBeNull()
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
    expect(signed({ t: 'participant.self', name: 'Alex' })).not.toBeNull()
    expect(signed({ t: 'participant.self', name: 'x'.repeat(500) })).toBeNull()
    expect(signed({ t: 'participant.self', name: 'Alex', key })).toBeNull()
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

  it('snapshot frames: a request and bounded chunks (ADR-0037)', async () => {
    const { MAX_SNAPSHOT_CHUNKS, parsePeerFrame, SNAP_CHUNK_CHARS } = await import('../src')
    expect(parsePeerFrame({ t: 'snapreq' })).toEqual({ t: 'snapreq' })
    expect(parsePeerFrame({ t: 'snapreq', extra: 1 })).toBeNull()
    const chunk = { t: 'snap', sid: env.id, hlc: 5, i: 0, n: 2, part: 'AbC-_9' }
    expect(parsePeerFrame(chunk)).toEqual(chunk)
    for (const bad of [
      { ...chunk, part: 'a'.repeat(SNAP_CHUNK_CHARS + 1) }, { ...chunk, part: 'no base64!' }, { ...chunk, i: -1 }, { ...chunk, n: 0 },
      { ...chunk, n: MAX_SNAPSHOT_CHUNKS + 1 }, { ...chunk, i: MAX_SNAPSHOT_CHUNKS }, { ...chunk, sid: '../x' },
    ]) expect(parsePeerFrame(bad)).toBeNull()
  })

  it('a snapshot envelope may carry a ciphertext far larger than an event envelope', async () => {
    const { MAX_SNAPSHOT_CT_CHARS, parseSnapshotEnvelope } = await import('../src')
    const big = { ...env, ct: 'a'.repeat(1_000_000) }
    expect(parseEnvelope(big)).toBeNull()
    expect(parseSnapshotEnvelope(big)).toEqual(big)
    expect(parseSnapshotEnvelope({ ...env, ct: 'a'.repeat(MAX_SNAPSHOT_CT_CHARS + 1) })).toBeNull()
    expect(parseSnapshotEnvelope({ ...big, extra: 'x' })).toBeNull()
  })

  it('the size limits of a snapshot are exact', async () => {
    const { MAX_SNAPSHOT_CHUNKS, MAX_SNAPSHOT_CT_CHARS, parsePeerFrame, parseSnapshotEnvelope, SNAP_CHUNK_CHARS } = await import('../src')
    expect(MAX_SNAPSHOT_CT_CHARS).toBe(5_592_406)
    expect(MAX_SNAPSHOT_CHUNKS).toBe(350)
    expect(SNAP_CHUNK_CHARS).toBe(16_000)
    expect(parseSnapshotEnvelope({ ...env, ct: 'a'.repeat(MAX_SNAPSHOT_CT_CHARS) })).not.toBeNull()
    const chunk = { t: 'snap', sid: env.id, hlc: 5, i: 0, n: MAX_SNAPSHOT_CHUNKS, part: 'AbC' }
    expect(parsePeerFrame(chunk)).not.toBeNull()
    expect(parsePeerFrame({ ...chunk, i: MAX_SNAPSHOT_CHUNKS - 1 })).not.toBeNull()
    expect(parsePeerFrame({ ...chunk, part: 'a'.repeat(SNAP_CHUNK_CHARS) })).not.toBeNull()
  })

  it('a snapshot ledger needs its board, with notes, columns and settings', async () => {
    const { parseSnapshot } = await import('../src')
    const sig = 'A'.repeat(86)
    const genesis = { id: env.id, at: 1, author: key, body: { t: 'genesis', roomId: env.room, facilitatorKey: key }, sig }
    const board = { notes: {}, columns: [], settings: {} }
    const ledger = { roomId: env.room, facilitatorKey: key, lead: key, facilitators: [key], hidden: [], removed: [], names: {}, selfNames: {}, board, applied: 1, recent: {} }
    const snap = { v: 1, fold: 1, room: env.room, id: '01JABCDEFGHJKMNPQRSTVWXYZ1', cut: { at: 1, id: env.id }, genesis, ids: [env.id], ledger, author: key, sig }
    expect(parseSnapshot(snap)).not.toBeNull()
    for (const bad of [{}, { columns: [], settings: {} }, { notes: {}, settings: {} }, { notes: {}, columns: [] }]) expect(parseSnapshot({ ...snap, ledger: { ...ledger, board: bad } })).toBeNull()
  })

  it('a snapshot is strict: fields, sizes and the shape of the ledger', async () => {
    const { parseSnapshot, SNAPSHOT_MAX_EVENTS } = await import('../src')
    const sig = 'A'.repeat(86)
    const genesis = { id: env.id, at: 1, author: key, body: { t: 'genesis', roomId: env.room, facilitatorKey: key }, sig }
    const ledger = { roomId: env.room, facilitatorKey: key, lead: key, facilitators: [key], hidden: [], removed: [], names: {}, selfNames: {}, board: { notes: {}, columns: [], settings: {} }, applied: 1, recent: {} }
    const snap = { v: 1, fold: 1, room: env.room, id: '01JABCDEFGHJKMNPQRSTVWXYZ1', cut: { at: 1, id: env.id }, genesis, ids: [env.id], ledger, author: key, sig }
    expect(parseSnapshot(snap)).not.toBeNull()
    for (const bad of [
      { ...snap, extra: 1 }, { ...snap, v: 2 }, { ...snap, ids: [] }, { ...snap, ids: Array(SNAPSHOT_MAX_EVENTS + 1).fill(env.id) },
      { ...snap, sig: 'short' }, { ...snap, author: 'short' }, { ...snap, ledger: { ...ledger, board: 'x' } }, { ...snap, ledger: { ...ledger, facilitators: ['x'] } },
      { ...snap, genesis: { ...genesis, extra: 1 } },
    ]) expect(parseSnapshot(bad)).toBeNull()
  })

  it('presence can say the participant is relay-only', async () => {
    const { parsePresence } = await import('../src')
    expect(parsePresence({ t: 'presence', conn: 'abcd1234', name: null, showName: false, relayOnly: true })?.relayOnly).toBe(true)
  })
})
