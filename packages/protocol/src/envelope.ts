/**
 * Protocol v2 (change e2e-encrypted-rooms): the relay only sees envelopes.
 *
 *   Envelope (visible to the relay) = { v: 2, room, id, hlc, ct }
 *   ct = AES-GCM(contentKey, JSON(SignedEvent), aad = "2|room|id|hlc")
 *
 * Relay messages carry envelopes and connection ids, never board content.
 */
import * as v from 'valibot'
import { CURSOR_SCALE, KEY_RE, LIMITS, ROOM_ID_RE } from '@retroboard/domain'
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

/**
 * Client -> relay. With the peer-to-peer mesh, the relay mostly carries `sig` (WebRTC set-up,
 * encrypted, to one connection) and `eph` presence. `pub` is the fallback for participants
 * who cannot open any direct link, and is buffered in memory for them.
 */
export const ClientFrameSchema = v.variant('t', [
  v.strictObject({ t: v.literal('pub'), envs: v.pipe(Envelopes, v.minLength(1)) }),
  v.strictObject({ t: v.literal('eph'), env: EnvelopeSchema }),
  v.strictObject({ t: v.literal('sig'), to: ConnId, env: EnvelopeSchema }),
])
export type ClientFrame = v.InferOutput<typeof ClientFrameSchema>

/** Relay -> client. */
export const RelayFrameSchema = v.variant('t', [
  v.strictObject({ t: v.literal('welcome'), conn: ConnId, peers: v.array(ConnId) }),
  v.strictObject({ t: v.literal('peers'), peers: v.array(ConnId) }),
  v.strictObject({ t: v.literal('hist'), envs: Envelopes, done: v.boolean() }),
  v.strictObject({ t: v.literal('env'), envs: Envelopes }),
  v.strictObject({ t: v.literal('eph'), env: EnvelopeSchema }),
  v.strictObject({ t: v.literal('sig'), from: ConnId, env: EnvelopeSchema }),
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
  v.strictObject({ t: v.picklist(['role.delegate', 'role.revoke', 'role.handover', 'role.claim', 'participant.hide', 'participant.unhide']), key: Key }),
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
  /** Session signing key, so peers can show roles. A hint only: rights come from the signed log. */
  key: v.optional(Key),
  /** Facilitator public key when this browser holds the facilitator link (public: it is in the genesis). */
  fkey: v.optional(Key),
  /** No direct link (network or setting): this participant's board events go through the relay. */
  relayOnly: v.optional(v.boolean()),
})
export type Presence = v.InferOutput<typeof PresenceSchema>

const AnchorId = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{4,32}$/))
const Fraction = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(CURSOR_SCALE))

/** Plaintext inside an `eph` envelope: a pointer anchored to a column or note (never stored). */
export const CursorSchema = v.strictObject({
  t: v.literal('cursor'),
  conn: ConnId,
  anchor: v.nullable(AnchorId),
  x: Fraction,
  y: Fraction,
  drag: v.boolean(),
})
export type Cursor = v.InferOutput<typeof CursorSchema>

/** Plaintext inside an `eph` envelope: what a participant is looking at or working on. */
export const FocusSchema = v.strictObject({
  t: v.literal('focus'),
  conn: ConnId,
  column: v.nullable(AnchorId),
  note: v.nullable(AnchorId),
  typing: v.boolean(),
})
export type Focus = v.InferOutput<typeof FocusSchema>

export const LiveSchema = v.variant('t', [PresenceSchema, CursorSchema, FocusSchema])

/** WebRTC set-up, inside an encrypted `sig` envelope: the relay never sees SDP or IP addresses. */
export const SignalSchema = v.strictObject({
  t: v.literal('sig'),
  from: ConnId,
  to: ConnId,
  kind: v.picklist(['offer', 'answer']),
  sdp: v.pipe(v.string(), v.maxLength(12_000)),
})
export type Signal = v.InferOutput<typeof SignalSchema>

/** Ids per `have` message on a data channel. */
export const HAVE_CHUNK = 400
/** Envelopes per `env` message on a data channel. */
export const PEER_ENV_CHUNK = 50

/**
 * Peer -> peer, on WebRTC data channels. The reliable channel carries the sync (`have` lists,
 * then the envelopes the other side lacks, then `synced`) and new board events; the unreliable
 * one carries `eph` (cursors, focus) with a hop count for forwarding in partial meshes.
 */
export const PeerFrameSchema = v.variant('t', [
  v.strictObject({ t: v.literal('have'), ids: v.pipe(v.array(v.pipe(v.string(), v.regex(EVENT_ID_RE))), v.maxLength(HAVE_CHUNK)), done: v.boolean() }),
  v.strictObject({ t: v.literal('env'), envs: v.pipe(Envelopes, v.maxLength(PEER_ENV_CHUNK)) }),
  v.strictObject({ t: v.literal('synced') }),
  v.strictObject({ t: v.literal('eph'), env: EnvelopeSchema, hop: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3)) }),
])
export type PeerFrame = v.InferOutput<typeof PeerFrameSchema>
export type Live = v.InferOutput<typeof LiveSchema>

const parser = <S extends v.GenericSchema>(schema: S) => (input: unknown): v.InferOutput<S> | null => {
  const r = v.safeParse(schema, input)
  return r.success ? r.output : null
}
export const parseEnvelope = parser(EnvelopeSchema)
export const parseClientFrame = parser(ClientFrameSchema)
export const parseRelayFrame = parser(RelayFrameSchema)
export const parseSignedEvent = parser(SignedEventSchema)
export const parsePresence = parser(PresenceSchema)
export const parseLive = parser(LiveSchema)
export const parseSignal = parser(SignalSchema)
export const parsePeerFrame = parser(PeerFrameSchema)

/**
 * Board file (.retro): every envelope of a board, encrypted once more with the file key
 * (HKDF(contentKey, roomId, "rb/file/v1")), aad = "retro/1|<room>". Restoring needs the link
 * (and the passcode when set); the file alone reveals nothing but the room id.
 */
export const BOARD_FILE_FORMAT = 'retro/1'
export const BoardFileSchema = v.strictObject({
  format: v.literal(BOARD_FILE_FORMAT),
  room: v.pipe(v.string(), v.regex(ROOM_ID_RE)),
  ct: v.pipe(v.string(), v.regex(B64URL_RE)),
})
export type BoardFile = v.InferOutput<typeof BoardFileSchema>
export const parseBoardFile = parser(BoardFileSchema)
export const parseEnvelopes = parser(v.pipe(v.array(EnvelopeSchema), v.maxLength(20_000)))
export const boardFileAad = (room: string): string => `${BOARD_FILE_FORMAT}|${room}`
