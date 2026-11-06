import { LIMITS } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { chunk, type Envelope, EnvelopeBuffer, MAX_ENVELOPES_PER_MESSAGE, parseClientFrame, parseCommand, parseEnvelope, parseLive, parseRelayFrame, parseSignedEvent } from '../src'

const env: Envelope = { v: 2, room: 'Ab3dEfGhIjKlMnOpQrStUv', id: '01JABCDEFGHJKMNPQRSTVWXYZ0', hlc: 1_700_000_000_000, ct: 'AbC-_9' }
const key = 'a'.repeat(42) + 'A'
const sig = 'A'.repeat(86)

/** A value accepted by `parse`, then the same value with a stray character on either side: both must be refused. */
function anchored(parse: (x: string) => unknown, valid: string, stray = '!') {
  expect(parse(valid), `${valid} is valid`).toBeTruthy()
  expect(parse(`${stray}${valid}`), `${stray}${valid}`).toBeFalsy()
  expect(parse(`${valid}${stray}`), `${valid}${stray}`).toBeFalsy()
}

describe('patterns are anchored at both ends', () => {
  it('event ids, in envelopes and in signed events', () => {
    anchored((id) => parseEnvelope({ ...env, id }), env.id)
    anchored((id) => parseSignedEvent({ id, at: 1, author: key, body: { t: 'participant.self', name: 'A' }, sig }), env.id)
    expect(parseEnvelope({ ...env, id: 'a'.repeat(16) })).toBeTruthy()
    expect(parseEnvelope({ ...env, id: 'a'.repeat(15) })).toBeNull()
    expect(parseEnvelope({ ...env, id: 'a'.repeat(32) })).toBeTruthy()
    expect(parseEnvelope({ ...env, id: 'a'.repeat(33) })).toBeNull()
  })

  it('ciphertext in base64url, in envelopes, signatures and board files', () => {
    anchored((ct) => parseEnvelope({ ...env, ct }), 'AbC-_9')
    anchored((s) => parseSignedEvent({ id: env.id, at: 1, author: key, body: { t: 'participant.self', name: 'A' }, sig: s }), sig)
  })

  it('connection ids, in frames to one connection', () => {
    anchored((to) => parseClientFrame({ t: 'sig', to, env }), 'Abcd1234')
    expect(parseClientFrame({ t: 'sig', to: 'Abcd123', env })).toBeNull()
    expect(parseClientFrame({ t: 'sig', to: 'Abcd123456789012', env })).toBeTruthy()
    expect(parseClientFrame({ t: 'sig', to: 'Abcd1234567890123', env })).toBeNull()
  })

  it('anchors of pointers and focus', () => {
    const cursor = (anchor: string) => parseLive({ t: 'cursor', conn: 'Abcd1234', anchor, x: 1, y: 1, drag: false })
    anchored(cursor, 'note_1-A')
    expect(cursor('abc')).toBeNull()
    expect(cursor('a'.repeat(4))).toBeTruthy()
    expect(cursor('a'.repeat(32))).toBeTruthy()
    expect(cursor('a'.repeat(33))).toBeNull()
  })

  it('ids, theme ids and speakers in commands', () => {
    anchored((id) => parseCommand({ t: 'note.delete', id }), 'note_1-A')
    anchored((themeId) => parseCommand({ t: 'board.init', templateId: 't', themeId }), 'studio-2')
    anchored((themeId) => parseCommand({ t: 'settings.update', themeId }), 'studio-2')
    anchored((speaker) => parseCommand({ t: 'talk.assign', speaker, label: null }), 'speaker_1-AB')
    expect(parseCommand({ t: 'talk.assign', speaker: 'a'.repeat(7), label: null })).toBeNull()
    expect(parseCommand({ t: 'talk.assign', speaker: 'a'.repeat(64), label: null })).toBeTruthy()
    expect(parseCommand({ t: 'talk.assign', speaker: 'a'.repeat(65), label: null })).toBeNull()
    expect(parseCommand({ t: 'board.init', templateId: 't', themeId: 'a'.repeat(24) })).toBeTruthy()
    expect(parseCommand({ t: 'board.init', templateId: 't', themeId: 'a'.repeat(25) })).toBeNull()
    expect(parseCommand({ t: 'board.init', templateId: 't', themeId: '' })).toBeNull()
    expect(parseCommand({ t: 'board.init', templateId: 't', themeId: 'Studio' })).toBeNull()
  })
})

describe('every option of a choice is accepted, and nothing else', () => {
  const each = (options: string[], make: (x: string) => unknown, parse: (x: unknown) => unknown) => {
    for (const o of options) expect(parse(make(o)), o).toBeTruthy()
    expect(parse(make('')), 'empty').toBeFalsy()
    expect(parse(make('other')), 'other').toBeFalsy()
  }

  it('action statuses', () => each(['todo', 'doing', 'done', 'blocked', 'dropped'], (status) => ({ t: 'action.status', id: 'abcd', status }), parseCommand))
  it('board languages', () => each(['fr', 'en'], (locale) => ({ t: 'board.init', templateId: 't', themeId: 'studio', locale }), parseCommand))
  it('what can be voted on', () => each(['notes', 'clusters', 'both'], (votable) => ({ t: 'settings.update', votable }), parseCommand))
  it('action modes', () => each(['checkbox', 'workflow'], (actionMode) => ({ t: 'settings.update', actionMode }), parseCommand))
  it('talk modes', () => each(['off', 'ring', 'popup'], (talkMode) => ({ t: 'settings.update', talkMode }), parseCommand))
  it('note sizes and text sizes', () => {
    each(['small', 'normal', 'large'], (noteSize) => ({ t: 'settings.update', noteSize }), parseCommand)
    each(['small', 'normal', 'large'], (noteText) => ({ t: 'settings.update', noteText }), parseCommand)
  })
  it('how a template is applied', () => {
    each(['wipe', 'migrate'], (mode) => ({ t: 'template.apply', templateId: 't', mode }), parseCommand)
    each(['fr', 'en'], (locale) => ({ t: 'template.apply', templateId: 't', locale }), parseCommand)
    expect(parseCommand({ t: 'template.apply', templateId: 't', wipe: true })).toEqual({ t: 'template.apply', templateId: 't', wipe: true })
    expect(parseCommand({ t: 'template.apply', templateId: 'x'.repeat(40) })).toBeTruthy()
    expect(parseCommand({ t: 'template.apply', templateId: 'x'.repeat(41) })).toBeNull()
    expect(parseCommand({ t: 'template.apply' })).toBeNull()
  })
  it('the error codes of the relay', () => each(['invalid', 'too-large', 'rate', 'full', 'wrong-room'], (code) => ({ t: 'err', code }), parseRelayFrame))
})

describe('bounds, exactly', () => {
  it('moves a column to any index up to the last one', () => {
    expect(parseCommand({ t: 'column.move', id: 'abcd', toIndex: 0 })).toBeTruthy()
    expect(parseCommand({ t: 'column.move', id: 'abcd', toIndex: LIMITS.maxColumns - 1 })).toBeTruthy()
    expect(parseCommand({ t: 'column.move', id: 'abcd', toIndex: LIMITS.maxColumns })).toBeNull()
    expect(parseCommand({ t: 'column.move', id: 'abcd', toIndex: -1 })).toBeNull()
  })

  it('keeps the columns of a new board, each with its own required title', () => {
    const init = (columns: unknown) => parseCommand({ t: 'board.init', templateId: 't', themeId: 'studio', columns })
    expect(init([{ title: 'Start', subtitle: 'now', icon: 'play', color: 2, votable: false }])).toEqual({ t: 'board.init', templateId: 't', themeId: 'studio', columns: [{ title: 'Start', subtitle: 'now', icon: 'play', color: 2, votable: false }] })
    expect(init([{ subtitle: 'no title' }])).toBeNull()
    expect(init([{ title: '   ' }])).toBeNull()
    expect(init([{ title: 'ok', icon: 'not-an-icon' }])).toBeNull()
    expect(init([])).toBeNull()
  })

  it('takes ciphertext up to the size of a message in base64url, and not one character more', () => {
    expect(parseEnvelope({ ...env, ct: 'a'.repeat(21_846) })).toBeTruthy()
    expect(parseEnvelope({ ...env, ct: 'a'.repeat(21_847) })).toBeNull()
  })

  it('takes a real calendar date only', () => {
    const due = (d: string) => parseCommand({ t: 'action.add', text: 'x', owner: 'a', due: d })
    expect(due('2026-11-06')).toBeTruthy()
    for (const bad of ['2026-02-31', '2026-11-6', '26-11-06', '2026-11-06 ', ' 2026-11-06', '2026-11-06x', '']) expect(due(bad), bad).toBeNull()
  })
})

describe('the relay buffer and its pages, exactly', () => {
  const e = (i: number, len: number): Envelope => ({ ...env, id: `ID${String(i).padStart(14, '0')}`, ct: 'a'.repeat(len) })
  const sizeOf = (x: Envelope) => x.ct.length + x.id.length + 64

  it('keeps envelopes up to the byte budget, to the byte, and evicts the oldest past it', () => {
    const [a, b, c] = [e(1, 100), e(2, 100), e(3, 100)] as [Envelope, Envelope, Envelope]
    const exact = new EnvelopeBuffer(10, sizeOf(a) + sizeOf(b))
    exact.add([a, b])
    expect(exact.size).toBe(2)
    exact.add([c])
    expect(exact.size).toBe(2)
    expect(exact.history().flatMap((f) => (f.t === 'hist' ? f.envs.map((x) => x.id) : []))).toEqual([b.id, c.id])
  })

  it('keeps envelopes up to the count budget and ignores one it already holds', () => {
    const buffer = new EnvelopeBuffer(2, 1_000_000)
    expect(buffer.add([e(1, 10), e(2, 10)])).toHaveLength(2)
    expect(buffer.add([e(2, 10)])).toEqual([])
    expect(buffer.size).toBe(2)
    buffer.add([e(3, 10)])
    expect(buffer.size).toBe(2)
  })

  it('answers a buffer with nothing in it with one empty, finished page', () => {
    expect(new EnvelopeBuffer().history()).toEqual([{ t: 'hist', envs: [], done: true }])
  })

  it('splits by the byte budget of a frame (a little under 256 KiB) unless told otherwise', () => {
    // Two of these are 261,256 bytes of budget: over the default of 261,120, under a default of 263,168.
    const pages = chunk([e(1, 130_500), e(2, 130_500)])
    expect(pages.map((p) => p.length)).toEqual([1, 1])
  })

  it('puts two envelopes in a page that holds exactly two, and starts another page for a third', () => {
    const size = 100 + 128
    expect(chunk([e(1, 100), e(2, 100)], size * 2).map((p) => p.length)).toEqual([2])
    expect(chunk([e(1, 100), e(2, 100), e(3, 100)], size * 2).map((p) => p.length)).toEqual([2, 1])
    expect(chunk([e(1, 100), e(2, 100)], size * 2 - 1).map((p) => p.length)).toEqual([1, 1])
  })

  it('puts at most the number of envelopes of a message in a page', () => {
    const many = Array.from({ length: MAX_ENVELOPES_PER_MESSAGE + 1 }, (_, i) => e(i, 1))
    expect(chunk(many.slice(0, MAX_ENVELOPES_PER_MESSAGE)).map((p) => p.length)).toEqual([MAX_ENVELOPES_PER_MESSAGE])
    expect(chunk(many).map((p) => p.length)).toEqual([MAX_ENVELOPES_PER_MESSAGE, 1])
  })

  it('makes no page out of nothing', () => {
    expect(chunk([])).toEqual([])
  })
})
