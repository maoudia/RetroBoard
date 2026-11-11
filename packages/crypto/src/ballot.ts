/**
 * Sealed ballot (change voting-v2-and-ranking, design "Sealed ballot"): one vote is one ciphertext
 * that only the holder of the ballot key can open. Built from the primitives already here
 * (HKDF, X25519 sealing); there is no new algorithm.
 */
import { type Bytes, fromBase64Url, fromUtf8, toBase64Url, utf8 } from './bytes'
import { agreementKeyPair, hkdf, type KeyPair, openFrom, sealTo } from './primitives'

export type BallotKind = 'note' | 'cluster'
export interface BallotChoice { readonly kind: BallotKind; readonly id: string }
/** Who a ballot is bound to: opening it under another room or voter fails. */
export interface BallotContext { readonly room: string; readonly voter: string }

const BALLOT_INFO = utf8('rb/ballot/v1')
/** Plaintext record size: one letter for the kind, the id (at most 32), space padding. Same length for every ballot. */
export const BALLOT_PLAINTEXT_BYTES = 40
const ID_RE = /^[A-Za-z0-9_-]{4,32}$/
const KIND_LETTER: Record<BallotKind, string> = { note: 'n', cluster: 'c' }
const KIND_OF: Record<string, BallotKind> = { n: 'note', c: 'cluster' }

/**
 * The ballot key pair of whoever opens a round: X25519 scalar = HKDF(signing seed, "", "rb/ballot/v1").
 * The same seed (the facilitator link, ADR-0029) always gives the same pair, so any device that holds the link can tally.
 */
export const ballotKeyPair = async (signingSeed: Uint8Array): Promise<KeyPair> => agreementKeyPair(await hkdf(signingSeed, new Uint8Array(), BALLOT_INFO))

const aadOf = (ctx: BallotContext, ballotKey: Uint8Array): Bytes => utf8(`rb/ballot/v1|${ctx.room}|${ctx.voter}|${toBase64Url(ballotKey)}`)

/** Seals one vote to the ballot key. The result is base64url, ready for `vote.seal`. */
export async function sealBallot(ballotKey: Uint8Array, ctx: BallotContext, choice: BallotChoice): Promise<string> {
  if (!ID_RE.test(choice.id)) throw new Error('invalid ballot id')
  const record = utf8(`${KIND_LETTER[choice.kind]}${choice.id}`.padEnd(BALLOT_PLAINTEXT_BYTES, ' '))
  return toBase64Url(await sealTo(ballotKey, record, aadOf(ctx, ballotKey)))
}

/** The vote inside a ballot, or null when it does not open: wrong key, another room or voter, tampering, malformed content. */
export async function openBallot(key: KeyPair, ctx: BallotContext, sealed: string): Promise<BallotChoice | null> {
  const bytes = fromBase64Url(sealed)
  if (!bytes) return null
  const plain = await openFrom(key, bytes, aadOf(ctx, key.publicKey))
  if (plain?.length !== BALLOT_PLAINTEXT_BYTES) return null
  let text: string
  try { text = fromUtf8(plain) } catch { return null }
  const kind = KIND_OF[text.charAt(0)]
  const id = text.slice(1).trimEnd()
  return kind && ID_RE.test(id) ? { kind, id } : null
}
