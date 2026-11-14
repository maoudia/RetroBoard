/**
 * What the vault engine needs from its surroundings (change user-drive-storage). The package is self-contained by rule, so
 * the target, the sealing and the local data are declared here as small interfaces the app satisfies structurally:
 * `SyncTargetPort` is a `VaultTarget`, `packages/crypto` backs a `VaultCrypto`, and the stores back a `VaultLocal`.
 */

export interface VaultObject {
  readonly path: string
  readonly size: number
  readonly etag: string
  readonly modifiedAt?: number
}

/** A dumb file store: it moves bytes the vault layer has already sealed. */
export interface VaultTarget {
  readonly capabilities: { readonly conditionalPut: 'etag' | 'none'; readonly maxObjectBytes: number }
  list(prefix: string): AsyncIterable<VaultObject>
  get(path: string): Promise<{ bytes: Uint8Array; etag: string } | null>
  put(path: string, bytes: Uint8Array, opts?: { ifMatch?: string | 'absent' }): Promise<{ etag: string }>
  delete(path: string): Promise<void>
  stat(path: string): Promise<VaultObject | null>
}

/** What an object is for: a segment, a checkpoint or a manifest cannot pass for one another. */
export type ObjectClass = 'seg' | 'chk' | 'man'

/** Sealing of plaintext JSON with the vault's keys: the engine never sees a key, nor does an adapter. */
export interface VaultCrypto {
  /** The keyed hash of a stream name, as it appears in paths (26 lowercase base32 characters). */
  streamId(name: string): Promise<string>
  seal(cls: ObjectClass, streamId: string, plaintext: string): Promise<Uint8Array>
  /** The plaintext, or null for an object that is truncated, forged, moved or under another key. */
  open(cls: ObjectClass, streamId: string, bytes: Uint8Array): Promise<string | null>
}

/**
 * How the engine sees one stream's state without knowing its shape. An item is a key with an orderable token (a larger
 * string is newer): the engine pushes the items whose token is above what the target is known to hold, and nothing else.
 */
export interface StreamCodec<S = unknown> {
  index(state: S): Record<string, string>
  pick(state: S, keys: readonly string[]): S
  /** Splits a state into parts whose JSON stays under `maxBytes`, so a segment never outgrows the target's limit. */
  split(state: S, maxBytes: number): S[]
  /** Untrusted JSON to a state, or null. */
  parse(value: unknown): S | null
}

/** The app's side: the data that is synced, and where remote changes go. */
export interface VaultLocal {
  codec(stream: string): StreamCodec | null
  /** Streams mirrored on every pass: library, settings, identity, workspace and the boards flagged to keep offline. */
  eager(): Promise<readonly string[]>
  read(stream: string): Promise<unknown>
  /** Merges a change that came from the target. */
  apply(stream: string, delta: unknown): Promise<void>
}

export interface SegmentRef {
  readonly path: string
  readonly stream: string
  readonly size: number
  readonly seq: number
  readonly at: number
  /** Set when a checkpoint covers it: it is deleted from the target 24 hours later. */
  readonly retiredAt?: number
}

export interface CheckpointRef {
  readonly path: string
  readonly stream: string
  readonly size: number
  readonly at: number
  /** Per device, the highest segment sequence of this stream the checkpoint includes. */
  readonly covers: Readonly<Record<string, number>>
}

/** A device's list of what it has written, sealed in `m/<device>.rbm`. One writer. */
export interface Manifest {
  readonly v: 1
  readonly device: string
  readonly name: string
  readonly seq: number
  readonly updatedAt: number
  readonly segments: readonly SegmentRef[]
  readonly checkpoints: readonly CheckpointRef[]
}

export interface PendingSegment {
  readonly path: string
  readonly stream: string
  readonly seq: number
  readonly size: number
  readonly at: number
  readonly tokens: Readonly<Record<string, string>>
}

export interface StreamMemory {
  /** The checkpoint this device last applied. */
  checkpoint?: string
  /** Per device, segments up to this sequence are included in what was applied (from a checkpoint). */
  covers: Record<string, number>
  applied: string[]
}

export interface WaitingFile { since: number; tries: number; nextAt: number }

/** What the engine remembers between passes. JSON; the app stores it next to the vault in the browser. */
export interface EngineMemory {
  v: 1
  info?: unknown
  infoEtag?: string
  highestInfoTime: number
  seq: number
  /** This device's manifest as last written. */
  own: { segments: SegmentRef[]; checkpoints: CheckpointRef[]; manifestSeq: number; dirty: boolean; name?: string }
  pending: PendingSegment[]
  /** Per stream: key to the highest token seen in the target, or pushed. */
  known: Record<string, Record<string, string>>
  streams: Record<string, StreamMemory>
  manifests: Record<string, { etag: string; doc: Manifest }>
  /** Board streams opened on this device: pulled on every pass from now on. */
  opened: string[]
  waiting: Record<string, WaitingFile>
}

export const emptyMemory = (): EngineMemory => ({
  v: 1, highestInfoTime: 0, seq: 0, own: { segments: [], checkpoints: [], manifestSeq: 0, dirty: false },
  pending: [], known: {}, streams: {}, manifests: {}, opened: [], waiting: {},
})

export interface MemoryPort {
  load(): Promise<EngineMemory | null>
  save(memory: EngineMemory): Promise<void>
}

export type VaultErrorCode = 'min-reader' | 'wrong-vault' | 'missing' | 'locked'

/** A failure of the vault itself, as opposed to the target (`TargetError`): the engine cannot go on and says why. */
export class VaultError extends Error {
  readonly code: VaultErrorCode
  constructor(code: VaultErrorCode) {
    super(code)
    this.name = 'VaultError'
    this.code = code
  }
}
