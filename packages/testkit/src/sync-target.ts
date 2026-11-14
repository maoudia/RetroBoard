/**
 * In-memory `SyncTargetPort` with the plaintext guard (change user-drive-storage, "Encryption is mandatory").
 * It records every path and every byte array it is given, so a test can seed data with distinctive strings
 * (`CANARY-title-7f3a`) and assert that none of them reached a target, in any form.
 */
import {
  type ObjectInfo, type ObjectPath, type PutOptions, type SyncTargetPort, type TargetCapabilities,
  TargetError, type TargetErrorCode, isObjectPath, isObjectPrefix,
} from '@retroboard/application'

export interface MemoryTargetOptions {
  readonly capabilities?: Partial<TargetCapabilities>
  /** Clock for `modifiedAt` (default `Date.now`). */
  readonly now?: () => number
}

export interface MemoryTarget extends SyncTargetPort {
  /** The next operation (any) rejects with this code. Queued: two calls fail two operations. */
  failNext(code: TargetErrorCode, retryAfterMs?: number): void
  /** Stored objects by path (a copy). */
  objects(): ReadonlyMap<ObjectPath, Uint8Array>
  /** Every path any operation named, in order (puts, gets, stats, deletes, list prefixes). */
  readonly seenPaths: readonly string[]
  /** Every byte array a `put` received, in order (copies). */
  readonly seenBodies: readonly Uint8Array[]
  /** Throws when a canary occurs in any path or any body, in UTF-8, UTF-16, base64 or percent-encoded form. */
  assertNoPlaintext(canaries: readonly string[]): void
}

const MIN_CANARY = 8
const enc = new TextEncoder()
const utf16 = (s: string, littleEndian: boolean): Uint8Array => {
  const out = new Uint8Array(s.length * 2)
  const view = new DataView(out.buffer)
  for (let i = 0; i < s.length; i++) view.setUint16(i * 2, s.charCodeAt(i), littleEndian)
  return out
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[n >> 18 & 63]! + B64[n >> 12 & 63]! + B64[n >> 6 & 63]! + B64[n & 63]!
  }
  return out
}

/**
 * Base64 of a substring depends on its offset in the encoded text (0, 1 or 2 bytes into a group of three), so
 * the characters fully determined by the canary are taken at each of the three alignments.
 */
function base64Needles(bytes: Uint8Array): string[] {
  const needles: string[] = []
  for (let shift = 0; shift < 3; shift++) {
    const encoded = base64(new Uint8Array([...new Uint8Array(shift), ...bytes]))
    const first = Math.ceil((8 * shift) / 6)
    const last = Math.floor((8 * (shift + bytes.length)) / 6)
    needles.push(encoded.slice(first, last))
  }
  return needles
}

const asciiBytes = (s: string): Uint8Array => enc.encode(s)

function needlesOf(canary: string): { form: string; bytes: Uint8Array }[] {
  const text = enc.encode(canary)
  const forms: [string, Uint8Array][] = [
    ['utf-8', text],
    ['utf-16le', utf16(canary, true)],
    ['utf-16be', utf16(canary, false)],
    ['percent-encoded', asciiBytes(encodeURIComponent(canary))],
    ['percent-encoded', asciiBytes(encodeURIComponent(canary).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase()))],
  ]
  for (const n of base64Needles(text)) {
    forms.push(['base64', asciiBytes(n)], ['base64url', asciiBytes(n.replaceAll('+', '-').replaceAll('/', '_'))])
  }
  return forms.map(([form, bytes]) => ({ form, bytes })).filter((n) => n.bytes.length >= MIN_CANARY)
}

function contains(haystack: Uint8Array, needle: Uint8Array): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false
  const head = needle[0]!
  for (let at = haystack.indexOf(head); at !== -1 && at <= haystack.length - needle.length; at = haystack.indexOf(head, at + 1)) {
    let i = 1
    while (i < needle.length && haystack[at + i] === needle[i]) i++
    if (i === needle.length) return true
  }
  return false
}

const lower = (b: Uint8Array): Uint8Array => b.map((x) => (x >= 65 && x <= 90 ? x + 32 : x))

/** Names the first place a canary shows up, or null. Never echoes bytes beyond the canary the caller supplied. */
export function findPlaintext(canaries: readonly string[], paths: readonly string[], bodies: readonly Uint8Array[]): string | null {
  for (const canary of canaries) {
    if (canary.length < MIN_CANARY) throw new Error(`canary "${canary}" is shorter than ${MIN_CANARY} characters: too short to prove anything`)
    const needles = needlesOf(canary)
    for (const path of paths) {
      // Paths are lowercase on every target, so a canary is matched there without regard to case.
      const hay = lower(enc.encode(path))
      for (const n of needles) if (contains(hay, lower(n.bytes))) return `${n.form} form of "${canary}" in the path "${path}"`
    }
    for (const [i, body] of bodies.entries()) {
      for (const n of needles) if (contains(body, n.bytes)) return `${n.form} form of "${canary}" in the object body #${i} (${body.length} bytes)`
    }
  }
  return null
}

export function createMemoryTarget(options: MemoryTargetOptions = {}): MemoryTarget {
  const capabilities: TargetCapabilities = {
    conditionalPut: 'etag', atomicPut: true, listsModifiedTime: true, maxObjectBytes: 16 * 1024 * 1024, ...options.capabilities,
  }
  const now = options.now ?? Date.now
  const store = new Map<ObjectPath, { bytes: Uint8Array; etag: string; modifiedAt: number }>()
  const failures: { code: TargetErrorCode; retryAfterMs?: number }[] = []
  const seenPaths: string[] = []
  const seenBodies: Uint8Array[] = []
  let version = 0

  const enter = (path: string, prefix = false) => {
    seenPaths.push(path)
    const failure = failures.shift()
    if (failure) throw new TargetError(failure.code, failure.retryAfterMs === undefined ? {} : { retryAfterMs: failure.retryAfterMs })
    if (!(prefix ? isObjectPrefix(path) : isObjectPath(path))) throw new TargetError('unsupported')
  }
  const info = (path: string, o: { bytes: Uint8Array; etag: string; modifiedAt: number }): ObjectInfo =>
    ({ path, size: o.bytes.length, etag: o.etag, modifiedAt: o.modifiedAt })

  return {
    kind: 'idb',
    capabilities,
    async *list(prefix) {
      enter(prefix, true)
      for (const [path, o] of [...store].sort(([a], [b]) => (a < b ? -1 : 1))) if (path.startsWith(prefix)) yield info(path, o)
    },
    async get(path) {
      enter(path)
      const o = store.get(path)
      return o ? { bytes: o.bytes.slice(), etag: o.etag } : null
    },
    async put(path, bytes, opts: PutOptions = {}) {
      enter(path)
      if (bytes.length > capabilities.maxObjectBytes) throw new TargetError('too-large')
      const current = store.get(path)
      if (opts.ifMatch !== undefined && capabilities.conditionalPut === 'etag') {
        if (opts.ifMatch === 'absent' ? current : current?.etag !== opts.ifMatch) throw new TargetError('precondition-failed')
      }
      const etag = `e${++version}`
      const copy = bytes.slice()
      seenBodies.push(copy.slice())
      store.set(path, { bytes: copy, etag, modifiedAt: now() })
      return { etag }
    },
    async delete(path) {
      enter(path)
      store.delete(path)
    },
    async stat(path) {
      enter(path)
      const o = store.get(path)
      return o ? info(path, o) : null
    },
    failNext(code, retryAfterMs) { failures.push(retryAfterMs === undefined ? { code } : { code, retryAfterMs }) },
    objects: () => new Map([...store].map(([p, o]) => [p, o.bytes.slice()])),
    seenPaths,
    seenBodies,
    assertNoPlaintext(canaries) {
      const hit = findPlaintext(canaries, seenPaths, seenBodies)
      if (hit) throw new Error(`plaintext reached the target: ${hit}`)
    },
  }
}
