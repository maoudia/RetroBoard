/**
 * `info.json`, the one plaintext object of a vault and the one file two devices can change at once (change
 * user-drive-storage, design "Vault engine"). It is merged per property by `updatedTime`, as Joplin's is, so two devices that
 * edit different things both win, and a copy restored from a backup cannot take the vault back in time.
 */
import { VaultError } from './types'

export interface Timed<T> { readonly value: T; readonly updatedTime: number }

/** The shape the engine needs of `VaultInfo` (`packages/crypto`): it keeps every other field of a wrap as it found it. */
export interface InfoDoc {
  readonly version: number
  readonly minReader: number
  readonly vaultId: string
  readonly cipher: string
  readonly activeKeyId: Timed<string>
  readonly wraps: readonly { readonly kind: string; readonly updatedTime: number }[]
  readonly settings: Readonly<Record<string, Timed<string | number | boolean>>>
}

/** The newest format of `info.json` this build reads: a vault asking for a newer reader is refused, not guessed at. */
export const READER_VERSION = 1

const isTimed = (v: unknown): v is Timed<unknown> => typeof v === 'object' && v !== null && Number.isFinite((v as Timed<unknown>).updatedTime) && 'value' in v

/** Untrusted JSON to an info document, or null when it is not one (an empty or half-synced file is not one). */
export function parseInfo<I extends InfoDoc>(text: string): I | null {
  let v: Record<string, unknown> | null
  // Stryker disable next-line BlockStatement: v stays undefined and the check below refuses it
  try { v = JSON.parse(text) as Record<string, unknown> | null } catch { return null }
  if (!v) return null
  if (!Number.isInteger(v.version) || !Number.isInteger(v.minReader) || typeof v.vaultId !== 'string' || typeof v.cipher !== 'string') return null
  if (!isTimed(v.activeKeyId) || typeof v.activeKeyId.value !== 'string') return null
  if (!Array.isArray(v.wraps) || !v.wraps.every((w: { kind?: unknown; updatedTime?: unknown } | null) => typeof w?.kind === 'string' && Number.isFinite(w.updatedTime))) return null
  const settings = v.settings
  if (typeof settings !== 'object' || settings === null || !Object.values(settings).every(isTimed)) return null
  return v as unknown as I
}

/** The highest `updatedTime` anywhere in the document: what the anti-rollback memory remembers. */
export function infoTime(info: InfoDoc): number {
  return Math.max(info.activeKeyId.updatedTime, ...info.wraps.map((w) => w.updatedTime), ...Object.values(info.settings).map((s) => s.updatedTime))
}

/** JSON with sorted keys: equal documents give equal text whatever order a writer put their fields in. */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_key, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x))

/** A total order on equal times, so the merge does not depend on which copy is on the left. */
const byJson = (a: unknown, b: unknown): number => {
  const x = stable(a)
  const y = stable(b)
  return x < y ? -1 : x > y ? 1 : 0
}

function newer<T extends { readonly updatedTime: number }>(a: T, b: T): T {
  const by = a.updatedTime - b.updatedTime || byJson(a, b)
  return by >= 0 ? a : b
}

/**
 * Per property by `updatedTime`: the active key id, each kind of wrap, each setting. Commutative, associative and
 * idempotent, so every device ends with the same document whatever order the copies arrive in. Two documents of
 * different vaults do not merge.
 */
export function mergeInfo<I extends InfoDoc>(a: I, b: I): I {
  if (a.vaultId !== b.vaultId) throw new VaultError('wrong-vault')
  const wraps = new Map<string, I['wraps'][number]>()
  for (const w of [...a.wraps, ...b.wraps]) {
    const mine = wraps.get(w.kind)
    wraps.set(w.kind, mine ? newer(mine, w) : w)
  }
  const settings = new Map<string, Timed<string | number | boolean>>()
  for (const [key, s] of [...Object.entries(a.settings), ...Object.entries(b.settings)]) {
    const mine = settings.get(key)
    settings.set(key, mine ? newer(mine, s) : s)
  }
  return {
    ...a,
    version: Math.max(a.version, b.version),
    minReader: Math.max(a.minReader, b.minReader),
    activeKeyId: newer(a.activeKeyId, b.activeKeyId),
    wraps: [...wraps.keys()].sort().map((kind) => wraps.get(kind)!),
    settings: Object.fromEntries([...settings.keys()].sort().map((key) => [key, settings.get(key)!])),
  }
}

export const sameInfo = (a: InfoDoc, b: InfoDoc): boolean => byJson(a, b) === 0
