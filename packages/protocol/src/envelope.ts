/**
 * Protocol v2 (change e2e-encrypted-rooms): the relay only sees envelopes.
 *
 *   Envelope (visible to the relay) = { v: 2, room, id, hlc, ct }
 *   ct = AES-GCM(contentKey, JSON(SignedEvent), aad = "2|room|id|hlc")
 *
 * Relay messages carry envelopes and connection ids, never board content.
 */
import * as v from 'valibot'
import { KEY_RE, LIMITS, ROOM_ID_RE } from '@retroboard/domain'
import { CommandSchema } from './v1'

export const PROTOCOL_VERSION = 2
export const EVENT_ID_RE = /^[0-9A-Za-z]{16,32}$/
const B64URL_RE = /^[A-Za-z0-9_-]+$/
/** Base64url of at most maxMessageBytes of ciphertext (4/3 expansion). */
const MAX_CT_CHARS = Math.ceil((LIMITS.maxMessageBytes * 4) / 3)
/** Ring buffer and history page size on the relay. */
export const RELAY_BUFFER = 2_000
export const MAX_ENVELOPES_PER_MESSAGE = 200
/** Max WebSocket frame on protocol v2 (Cloudflare accepts 1 MiB). */
export const MAX_FRAME_BYTES = 256 * 1024
/** Memory budget of the relay ring buffer. */
export const RELAY_BUFFER_BYTES = 4 * 1024 * 1024

const Hlc = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))
const ConnId = v.pipe(v.string(), v.regex(/^[A-Za-z0-9]{8,16}$/))

export const EnvelopeSchema = v.strictObject({
  v: v.literal(PROTOCOL_VERSION),
  room: v.pipe(v.string(), v.regex(ROOM_ID_RE)),
  id: v.pipe(v.string(), v.regex(EVENT_ID_RE)),
  hlc: Hlc,
  ct: v.pipe(v.string(), v.regex(B64URL_RE), v.maxLength(MAX_CT_CHARS)),
})
export type Envelope = v.InferOutput<typeof EnvelopeSchema>

/** Additional authenticated data: binds the ciphertext to its room, id and clock. */
export const envelopeAad = (e: Pick<Envelope, 'v' | 'room' | 'id' | 'hlc'>): string => `${e.v}|${e.room}|${e.id}|${e.hlc}`

const Envelopes = v.pipe(v.array(EnvelopeSchema), v.maxLength(MAX_ENVELOPES_PER_MESSAGE))

/** Client -> relay. `pub` is buffered for late joiners; `eph` (presence) is only fanned out. */
export const ClientFrameSchema = v.variant('t', [
  v.strictObject({ t: v.literal('pub'), envs: v.pipe(Envelopes, v.minLength(1)) }),
  v.strictObject({ t: v.literal('eph'), env: EnvelopeSchema }),
])
export type ClientFrame = v.InferOutput<typeof ClientFrameSchema>

/** Relay -> client. */
export const RelayFrameSchema = v.variant('t', [
  v.strictObject({ t: v.literal('welcome'), conn: ConnId, peers: v.array(ConnId) }),
  v.strictObject({ t: v.literal('peers'), peers: v.array(ConnId) }),
  v.strictObject({ t: v.literal('hist'), envs: Envelopes, done: v.boolean() }),
  v.strictObject({ t: v.literal('env'), envs: Envelopes }),
  v.strictObject({ t: v.literal('eph'), env: EnvelopeSchema }),
  /** The relay lost its buffer (eviction): peers republish what they hold. */
  v.strictObject({ t: v.literal('need') }),
  v.strictObject({ t: v.literal('err'), code: v.picklist(['invalid', 'too-large', 'rate', 'full', 'wrong-room']) }),
])
export type RelayFrame = v.InferOutput<typeof RelayFrameSchema>

const Key = v.pipe(v.string(), v.regex(KEY_RE))
const Name = v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.displayName)))

const EventBodySchema = v.variant('t', [
  v.strictObject({ t: v.literal('genesis'), roomId: v.pipe(v.string(), v.regex(ROOM_ID_RE)), facilitatorKey: Key }),
  v.strictObject({ t: v.literal('cmd'), cmd: CommandSchema, name: Name, showName: v.boolean() }),
  v.strictObject({ t: v.literal('role.delegate'), key: Key }),
  v.strictObject({ t: v.literal('role.revoke'), key: Key }),
])

/** Plaintext inside a `pub` envelope. */
export const SignedEventSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(EVENT_ID_RE)),
  at: Hlc,
  author: Key,
  body: EventBodySchema,
  sig: v.pipe(v.string(), v.regex(B64URL_RE), v.length(86)),
})

/** Plaintext inside an `eph` envelope: who is behind a connection id. */
export const PresenceSchema = v.strictObject({
  t: v.literal('presence'),
  conn: ConnId,
  name: Name,
  showName: v.boolean(),
})
export type Presence = v.InferOutput<typeof PresenceSchema>

const parser = <S extends v.GenericSchema>(schema: S) => (input: unknown): v.InferOutput<S> | null => {
  const r = v.safeParse(schema, input)
  return r.success ? r.output : null
}
export const parseEnvelope = parser(EnvelopeSchema)
export const parseClientFrame = parser(ClientFrameSchema)
export const parseRelayFrame = parser(RelayFrameSchema)
export const parseSignedEvent = parser(SignedEventSchema)
export const parsePresence = parser(PresenceSchema)
