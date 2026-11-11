/**
 * Signed snapshots (ADR-0037): the ledger folded up to a cut of the event order, signed by the facilitator capability key
 * of the genesis, so a joiner with an empty log can start from it instead of verifying every event.
 *
 * A snapshot is a shortcut, never a replacement for the log: a joiner trusts it only after every check of `verifySnapshot`,
 * and any failure leaves it with the ordinary event log.
 */
import { type EventBody, KEY_RE, type Ledger, LEDGER_VERSION } from '@retroboard/domain'
import type { SignerPort, VerifierPort } from '../ports/signing'
import { canonicalJson, type SignedEvent, verifyEvent } from '../events/signed'
import type { Cut, LogBase, LogCheckpoint } from './event-log'

export const SNAPSHOT_VERSION = 1
/** Most events a snapshot may cover (the board file limit). */
export const SNAPSHOT_MAX_IDS = 20_000

export interface LedgerSnapshot {
  readonly v: typeof SNAPSHOT_VERSION
  /** Version of the fold rules that produced `ledger` (LEDGER_VERSION). */
  readonly fold: number
  readonly room: string
  /** Unique id of this snapshot (ULID); also the id of its envelope. */
  readonly id: string
  readonly cut: Cut
  /** The signed genesis event: the root of trust the joiner checks the signer against. */
  readonly genesis: SignedEvent
  /** Ids of every event folded into `ledger`, genesis included. */
  readonly ids: readonly string[]
  readonly ledger: Ledger
  /** Public key (base64url) of the facilitator capability. */
  readonly author: string
}

export interface SignedSnapshot extends LedgerSnapshot {
  readonly sig: string
}

/** Domain separation: a snapshot signature is bound to its room and to this message kind. */
export const snapshotMessage = (s: LedgerSnapshot): string => `rb/snapshot/v1\n${s.room}\n${canonicalJson(s)}`

export type SnapshotRefusal = 'version' | 'room' | 'genesis' | 'signer' | 'signature' | 'ids' | 'ledger'

/** Builds and signs the snapshot of a checkpoint. The signer must be the facilitator capability key of the genesis. */
export async function signSnapshot(signer: SignerPort, room: string, id: string, checkpoint: LogCheckpoint, genesis: SignedEvent): Promise<SignedSnapshot> {
  const unsigned: LedgerSnapshot = { v: SNAPSHOT_VERSION, fold: LEDGER_VERSION, room, id, cut: checkpoint.cut, genesis, ids: checkpoint.ids, ledger: checkpoint.ledger, author: signer.publicKey }
  return { ...unsigned, sig: await signer.sign(snapshotMessage(unsigned)) }
}

export type SnapshotVerdict = { readonly ok: true; readonly base: LogBase } | { readonly ok: false; readonly reason: SnapshotRefusal }

const refuse = (reason: SnapshotRefusal): SnapshotVerdict => ({ ok: false, reason })

/**
 * What a joiner checks before trusting a snapshot (everything but the envelope, which the transport opened):
 * the fold version, the room, the signed genesis (for this room, signed by the key it announces), the signer being that
 * key, the signature over the canonical bytes, and a consistent set of covered ids.
 */
export async function verifySnapshot(verifier: VerifierPort, room: string, s: SignedSnapshot): Promise<SnapshotVerdict> {
  if (s.v !== SNAPSHOT_VERSION || s.fold !== LEDGER_VERSION) return refuse('version')
  if (s.room !== room || s.ledger.roomId !== room) return refuse('room')
  const genesis = s.genesis
  const body: EventBody = genesis.body
  if (body.t !== 'genesis' || body.roomId !== room || genesis.author !== body.facilitatorKey) return refuse('genesis')
  if (!(await verifyEvent(verifier, room, genesis))) return refuse('genesis')
  if (s.author !== body.facilitatorKey || s.ledger.facilitatorKey !== body.facilitatorKey || !KEY_RE.test(s.author)) return refuse('signer')
  const { sig, ...unsigned } = s
  if (!(await verifier.verify(s.author, sig, snapshotMessage(unsigned)))) return refuse('signature')
  const ids = new Set(s.ids)
  if (ids.size !== s.ids.length || s.ids.length > SNAPSHOT_MAX_IDS || !ids.has(genesis.id) || !ids.has(s.cut.id)) return refuse('ids')
  if (s.ledger.applied > s.ids.length) return refuse('ledger')
  return { ok: true, base: { ledger: s.ledger, cut: s.cut, ids: s.ids } }
}
