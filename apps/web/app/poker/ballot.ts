/**
 * Sealed cards with a key per round (ADR-0042, finding 2). The moderator's device derives an X25519 pair for each round from its own
 * secret; a voter seals the card to the public half; the reveal publishes the private half, which opens the ballots of that round
 * and no other. Primitives only: HKDF, X25519 sealing, AES-GCM, all from `@retroboard/crypto`. Demo code: it moves to
 * `packages/crypto` with task 1.2.
 */
import { agreementKeyPair, fromBase64Url, fromUtf8, hkdf, openFrom, sealTo, toBase64Url, utf8 } from '@retroboard/crypto'

/** A card record is the same length for every card: `c<deck index>` and space padding. */
const RECORD_BYTES = 40
const INDEX_MAX = 99

/** `X25519(HKDF(secret, salt = room id, info = "rb/poker/round/v1|<round>"))`: the same secret gives the same pair on any device. */
export async function roundKeyPair(secret: Uint8Array, room: string, round: string) {
  return agreementKeyPair(await hkdf(secret, utf8(room), utf8(`rb/poker/round/v1|${round}`)))
}

/** Binds a ballot to its room, its voter and its round key: a copy under another voter or into the next round does not open. */
const aadOf = (room: string, voter: string, roundPublic: string) => utf8(`rb/poker/v1|${room}|${voter}|${roundPublic}`)

/** Seals the card at `index` of the deck to the round key; base64url, 134 characters. */
export async function sealCard(roundPublic: string, room: string, voter: string, index: number): Promise<string> {
  const key = fromBase64Url(roundPublic)
  if (!key || !Number.isInteger(index) || index < 0 || index > INDEX_MAX) throw new Error('invalid card')
  return toBase64Url(await sealTo(key, utf8(`c${index}`.padEnd(RECORD_BYTES, ' ')), aadOf(room, voter, roundPublic)))
}

/** The deck index inside a ballot, or null when the key is not the round's, or the ballot is another voter's or another round's. */
export async function openCard(roundPrivate: string, roundPublic: string, room: string, voter: string, sealed: string): Promise<number | null> {
  const secret = fromBase64Url(roundPrivate)
  const bytes = fromBase64Url(sealed)
  if (!secret || secret.length !== 32 || !bytes) return null
  const pair = await agreementKeyPair(secret)
  if (toBase64Url(pair.publicKey) !== roundPublic) return null
  const plain = await openFrom(pair, bytes, aadOf(room, voter, roundPublic))
  if (plain?.length !== RECORD_BYTES) return null
  const text = fromUtf8(plain)
  const index = /^c(\d{1,2}) *$/.exec(text)?.[1]
  return index === undefined ? null : Number(index)
}
