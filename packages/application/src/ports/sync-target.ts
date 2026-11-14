/**
 * Where a vault's files go (change user-drive-storage, ADR-0039). A target is a dumb file store: it moves bytes that
 * the vault layer has already sealed, so an adapter never holds a key and never sees plaintext.
 */

/** Lowercase ASCII `[a-z0-9._-]` segments joined by "/", at most 90 chars and 3 levels: safe on every file store. */
export type ObjectPath = string

export interface ObjectInfo {
  readonly path: ObjectPath
  readonly size: number
  readonly etag: string
  readonly modifiedAt?: number
}

export interface TargetCapabilities {
  /** `put` honours `ifMatch` (an etag or 'absent'). */
  readonly conditionalPut: 'etag' | 'none'
  /** A reader never sees half a file. */
  readonly atomicPut: boolean
  readonly listsModifiedTime: boolean
  /** The engine splits segments below it. */
  readonly maxObjectBytes: number
}

export type TargetErrorCode =
  | 'precondition-failed'
  | 'not-found'
  | 'auth-expired'
  /** Folder access to grant again. */
  | 'permission-needed'
  | 'forbidden'
  | 'throttled'
  | 'target-full'
  | 'unreachable'
  | 'too-large'
  | 'unsupported'

/** The one error every adapter maps a provider failure to; the engine decides (retry, pause, ask the user). */
export class TargetError extends Error {
  readonly code: TargetErrorCode
  readonly retryAfterMs?: number
  constructor(code: TargetErrorCode, opts: { retryAfterMs?: number; cause?: unknown } = {}) {
    // The message carries the code only: it can reach a log, and a path or a body must never end up in one.
    super(code, opts.cause === undefined ? undefined : { cause: opts.cause })
    this.name = 'TargetError'
    this.code = code
    if (opts.retryAfterMs !== undefined) this.retryAfterMs = opts.retryAfterMs
  }
}

export type TargetKind = 'idb' | 'folder' | 'onedrive' | 'github' | 'gdrive' | 'dropbox' | 'webdav' | 's3' | 'http'

/** What an adapter needs of an `AbortSignal` (the application layer has no DOM types). */
export interface CancelSignal { readonly aborted: boolean }

export interface PutOptions {
  /** An etag the object must currently have, or 'absent' for a create-only write. */
  readonly ifMatch?: string | 'absent'
}

export interface SyncTargetPort {
  readonly kind: TargetKind
  readonly capabilities: TargetCapabilities
  list(prefix: ObjectPath, signal?: CancelSignal): AsyncIterable<ObjectInfo>
  get(path: ObjectPath, signal?: CancelSignal): Promise<{ bytes: Uint8Array; etag: string } | null>
  put(path: ObjectPath, bytes: Uint8Array, opts?: PutOptions): Promise<{ etag: string }>
  delete(path: ObjectPath): Promise<void>
  stat(path: ObjectPath): Promise<ObjectInfo | null>
}

export const MAX_PATH_LENGTH = 90
export const MAX_PATH_LEVELS = 3

const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/

/** True for a path every target can store without case, Unicode or reserved-name surprises. */
export function isObjectPath(path: string): boolean {
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return false
  const parts = path.split('/')
  if (parts.length > MAX_PATH_LEVELS) return false
  return parts.every((p) => SEGMENT.test(p) && !p.endsWith('.'))
}

/** A prefix is a path, or a path with a trailing slash, or empty (everything). */
export function isObjectPrefix(prefix: string): boolean {
  return prefix === '' || isObjectPath(prefix.endsWith('/') ? prefix.slice(0, -1) : prefix)
}
