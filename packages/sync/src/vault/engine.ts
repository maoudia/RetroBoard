/**
 * The vault engine (change user-drive-storage, ADR-0039, design "Vault engine"): one pass reads `info.json`, pulls the
 * segments other devices wrote, pushes this device's own changes as one immutable segment per stream, rewrites this device's
 * manifest, and compacts. A target is a dumb file store with no push, so a pass is the only way anything moves; every
 * object is sealed before it reaches `VaultTarget`, and nothing here reads a key.
 *
 * Objects other devices wrote are never trusted: a file that is empty, of another size than its manifest says, or that does
 * not authenticate is "not ready" (a sync client may still be writing it) and is retried with a backoff, never deleted.
 */
import { INFO_PATH, checkpointPath, isInfoCopy, manifestPath, parseManifestPath, segmentPath, streamPrefix } from './names'
import { type InfoDoc, READER_VERSION, infoTime, mergeInfo, parseInfo, sameInfo } from './info'
import {
  type CheckpointRef, type EngineMemory, type Manifest, type MemoryPort, type PendingSegment, type SegmentRef, type StreamCodec,
  type VaultCrypto, VaultError, type VaultLocal, type VaultObject, type VaultTarget, emptyMemory,
} from './types'

export const COMPACT_SEGMENTS = 20
export const COMPACT_BYTES = 4 * 1024 * 1024
/** A retired segment stays this long so a reader that listed it before the checkpoint appeared can still fetch it. */
export const RETIRE_AFTER_MS = 24 * 60 * 60 * 1000
/** Segments stay small so a sync client uploads them quickly and a conflict stays small. */
export const MAX_SEGMENT_BYTES = 3 * 1024 * 1024
export const BACKOFF_BASE_MS = 5_000
export const BACKOFF_MAX_MS = 10 * 60 * 1000
export const KEPT_CHECKPOINTS = 2
/** `info.json` is read, merged and written again this many times when another device writes it in between. */
const INFO_ATTEMPTS = 3

export interface EngineOptions {
  readonly target: VaultTarget
  readonly crypto: VaultCrypto
  readonly local: VaultLocal
  readonly memory: MemoryPort
  /** This device's id as it appears in file names. */
  readonly device: string
  /** Shown in the device list, sealed in the manifest. */
  readonly deviceName: string
  /** The document the vault was created or unlocked with. */
  readonly info: InfoDoc
  readonly now: () => number
  /** Eight lowercase hex characters. */
  readonly random: () => string
}

export interface DeviceInfo { readonly device: string; readonly name: string; readonly updatedAt: number; readonly self: boolean }

export type SyncWarning = 'rollback' | 'duplicate-manifest' | 'unreadable-manifest'

export interface SyncReport {
  /** Segments written to the target. */
  pushed: number
  /** Segments and checkpoints applied here. */
  pulled: number
  /** The streams the manifests of the other devices name, boards included. */
  streams: string[]
  /** Files that are not ready, since when they were first seen. */
  waiting: { path: string; since: number }[]
  warnings: SyncWarning[]
  devices: DeviceInfo[]
  info: InfoDoc
  infoChanged: boolean
}

/** What the phases of a pass fill in as they go; the rest of the report is read off the memory once they are done. */
type PassReport = Pick<SyncReport, 'pushed' | 'pulled' | 'warnings' | 'info' | 'infoChanged'>

export interface SyncRequest {
  /** Streams to pull from now on, even though they are not mirrored (a board the person opens). */
  readonly open?: readonly string[]
  /** Streams to compact now whatever their size (a board closed after a retro). */
  readonly compact?: readonly string[]
}

export interface VaultEngine {
  sync(request?: SyncRequest): Promise<SyncReport>
  /** The first write of `info.json`, create-only: a vault is never overwritten. */
  publishInfo(info: InfoDoc): Promise<void>
  /** Folds a document (a new recovery wrap) into what the next pass writes to `info.json`. */
  updateInfo(info: InfoDoc): Promise<void>
  /** Deletes every file of a stream from the target, other devices' too. Local data is not touched. */
  deleteStream(stream: string): Promise<void>
  /** Deletes everything of the vault this engine wrote or knows of, `info.json` included, and forgets what it remembered. */
  deleteVault(): Promise<void>
}

const collect = async (it: AsyncIterable<VaultObject>): Promise<VaultObject[]> => {
  const out: VaultObject[] = []
  for await (const o of it) out.push(o)
  return out
}

const isPrecondition = (e: unknown): boolean => (e as { code?: unknown } | null)?.code === 'precondition-failed'
// Stryker disable next-line EqualityOperator: paths are unique, so `<` and `<=` give the same order
const byPath = (a: { path: string }, b: { path: string }): number => (a.path < b.path ? -1 : 1)

/** What every caller does with it is look for fields, so a value that is not an object (a number, an array, null) has none and is refused there. */
function parseJson(text: string): Record<string, unknown> | null {
  // Stryker disable next-line BlockStatement: undefined and null are both refused by every caller
  try { return JSON.parse(text) as Record<string, unknown> | null } catch { return null }
}

const isNum = (v: unknown): v is number => Number.isFinite(v)

export function parseManifest(text: string): Manifest | null {
  const v = parseJson(text)
  if (!v || v.v !== 1 || typeof v.device !== 'string' || typeof v.name !== 'string' || !isNum(v.seq) || !isNum(v.updatedAt)) return null
  if (!Array.isArray(v.segments) || !Array.isArray(v.checkpoints)) return null
  const segments: SegmentRef[] = []
  for (const s of v.segments as Record<string, unknown>[]) {
    if (typeof s?.path !== 'string' || typeof s.stream !== 'string' || !isNum(s.size) || !isNum(s.seq) || !isNum(s.at)) return null
    segments.push({ path: s.path, stream: s.stream, size: s.size, seq: s.seq, at: s.at, ...(isNum(s.retiredAt) ? { retiredAt: s.retiredAt } : {}) })
  }
  const checkpoints: CheckpointRef[] = []
  for (const c of v.checkpoints as Record<string, unknown>[]) {
    const covers = c?.covers as Record<string, unknown> | undefined
    if (typeof c?.path !== 'string' || typeof c.stream !== 'string' || !isNum(c.size) || !isNum(c.at) || typeof covers !== 'object' || covers === null) return null
    if (!Object.values(covers).every(isNum)) return null
    checkpoints.push({ path: c.path, stream: c.stream, size: c.size, at: c.at, covers: covers as Record<string, number> })
  }
  return { v: 1, device: v.device, name: v.name, seq: v.seq, updatedAt: v.updatedAt, segments, checkpoints }
}

export function createVaultEngine(options: EngineOptions): VaultEngine {
  const { target, crypto, local, device } = options
  const create = target.capabilities.conditionalPut === 'etag' ? { ifMatch: 'absent' as const } : undefined
  const segmentLimit = Math.min(MAX_SEGMENT_BYTES, Math.floor(target.capabilities.maxObjectBytes / 2))

  const load = async (): Promise<EngineMemory> => (await options.memory.load()) ?? emptyMemory()
  const sidOf = new Map<string, string>()
  async function streamId(name: string): Promise<string> {
    let id = sidOf.get(name)
    if (!id) sidOf.set(name, (id = await crypto.streamId(name)))
    return id
  }

  const backing = (mem: EngineMemory, path: string): boolean => (mem.waiting[path]?.nextAt ?? 0) > options.now()
  function failed(mem: EngineMemory, path: string): void {
    const now = options.now()
    const w = mem.waiting[path] ?? { since: now, tries: 0, nextAt: 0 }
    w.tries += 1
    w.nextAt = now + Math.min(BACKOFF_BASE_MS * 2 ** (w.tries - 1), BACKOFF_MAX_MS)
    mem.waiting[path] = w
  }

  /** What the target holds of an item is the highest token seen: an item is pushed only when the local one is above it. */
  function absorb(mem: EngineMemory, stream: string, tokens: Readonly<Record<string, string>>): void {
    const known = (mem.known[stream] ??= {})
    // Stryker disable next-line EqualityOperator: storing an equal token changes nothing
    for (const [key, token] of Object.entries(tokens)) if (known[key] === undefined || token > known[key]) known[key] = token
  }

  // ---- info.json ----

  async function infoPhase(mem: EngineMemory, report: PassReport): Promise<void> {
    const base = (mem.info ?? options.info) as InfoDoc
    for (let attempt = 1; ; attempt++) {
      const listed = await collect(target.list('info'))
      const main = listed.find((o) => o.path === INFO_PATH)
      const copies = listed.filter((o) => isInfoCopy(o.path))
      if (!main && copies.length === 0) throw new VaultError('missing')
      if (main && copies.length === 0 && mem.info && main.etag === mem.infoEtag) { report.info = base; return }
      const accepted: { path: string; info: InfoDoc }[] = []
      let remoteMain: InfoDoc | null = null
      for (const o of main ? [main, ...copies] : copies) {
        const got = await target.get(o.path)
        const doc = got ? parseInfo<InfoDoc>(new TextDecoder().decode(got.bytes)) : null
        if (!doc) continue
        if (doc.minReader > READER_VERSION) throw new VaultError('min-reader')
        if (doc.vaultId !== base.vaultId) throw new VaultError('wrong-vault')
        if (infoTime(doc) < mem.highestInfoTime) { if (!report.warnings.includes('rollback')) report.warnings.push('rollback'); continue }
        accepted.push({ path: o.path, info: doc })
        if (o === main) remoteMain = doc
      }
      const merged = accepted.reduce((m, a) => mergeInfo(m, a.info), base)
      const stale = !remoteMain || !sameInfo(mergeInfo(remoteMain, remoteMain), merged)
      let etag = main?.etag
      if (stale) {
        try {
          const body = new TextEncoder().encode(JSON.stringify(merged))
          const put = await target.put(INFO_PATH, body, target.capabilities.conditionalPut === 'etag' ? { ifMatch: main ? main.etag : 'absent' } : undefined)
          etag = put.etag
        } catch (e) {
          // Another device changed it between the read and the write: read again and merge again.
          if (isPrecondition(e) && attempt < INFO_ATTEMPTS) continue
          throw e
        }
      }
      for (const a of accepted) if (a.path !== INFO_PATH) await target.delete(a.path)
      report.infoChanged = !sameInfo(merged, base)
      mem.info = merged
      mem.infoEtag = etag
      mem.highestInfoTime = Math.max(mem.highestInfoTime, infoTime(merged))
      report.info = merged
      return
    }
  }

  // ---- pull ----

  /** Manifests of the other devices, those that changed fetched again. A device with two manifests keeps the newer. */
  async function readManifests(mem: EngineMemory, report: PassReport): Promise<void> {
    const listed = (await collect(target.list('m/'))).filter((o) => parseManifestPath(o.path))
    const live = new Set(listed.map((o) => o.path))
    for (const path of Object.keys(mem.manifests)) if (!live.has(path)) Reflect.deleteProperty(mem.manifests, path)
    for (const o of listed) {
      const p = parseManifestPath(o.path)!
      if (p.device === device && !p.copy) continue
      if (mem.manifests[o.path]?.etag === o.etag) continue
      if (backing(mem, o.path)) continue
      const got = await target.get(o.path)
      const text = got && got.bytes.length === o.size ? await crypto.open('man', '', got.bytes) : null
      // Stryker disable next-line ConditionalExpression: JSON.parse(null) is null, which parseManifest refuses as well
      const doc = text === null ? null : parseManifest(text)
      if (!doc || doc.device !== p.device) {
        if (!report.warnings.includes('unreadable-manifest')) report.warnings.push('unreadable-manifest')
        failed(mem, o.path)
        continue
      }
      Reflect.deleteProperty(mem.waiting, o.path)
      mem.manifests[o.path] = { etag: got!.etag, doc }
    }
    const newest = new Map<string, string>()
    for (const [path, { doc }] of Object.entries(mem.manifests)) {
      const mine = newest.get(doc.device)
      if (mine && !report.warnings.includes('duplicate-manifest')) report.warnings.push('duplicate-manifest')
      if (!mine || doc.seq > mem.manifests[mine]!.doc.seq) newest.set(doc.device, path)
    }
    for (const path of Object.keys(mem.manifests)) if (![...newest.values()].includes(path)) Reflect.deleteProperty(mem.manifests, path)
  }

  const remoteDocs = (mem: EngineMemory): Manifest[] => Object.values(mem.manifests).map((m) => m.doc).filter((d) => d.device !== device)

  function parseBody(text: string, name: string, codec: StreamCodec, key: 'delta' | 'state'): { value: unknown; covers: Record<string, number> } | null {
    const v = parseJson(text)
    if (!v || v.v !== 1 || v.stream !== name) return null
    const value = codec.parse(v[key])
    if (value === null) return null
    const covers = key === 'state' ? (v.covers as Record<string, number> | undefined) : {}
    return covers ? { value, covers } : null
  }

  async function fetchOpened(mem: EngineMemory, path: string, size: number, cls: 'seg' | 'chk', name: string): Promise<string | null> {
    if (backing(mem, path)) return null
    const got = await target.get(path)
    // Not there (the sync client has not delivered it, or a compaction removed it), empty or of another size than the
    // manifest says (half written), or not authentic: not ready, retried later.
    const text = got && got.bytes.length === size ? await crypto.open(cls, await streamId(name), got.bytes) : null
    if (text === null) { failed(mem, path); return null }
    return text
  }

  async function pullStream(mem: EngineMemory, report: PassReport, name: string): Promise<void> {
    const codec = local.codec(name)
    if (!codec) return
    const sm = (mem.streams[name] ??= { covers: {}, applied: [] })
    const docs = remoteDocs(mem)
    // Stryker disable next-line EqualityOperator: paths are unique, so `<` and `<=` give the same order
    const checkpoints = docs.flatMap((d) => d.checkpoints.filter((c) => c.stream === name)).sort((a, b) => b.at - a.at || (a.path < b.path ? 1 : -1))
    // The newest checkpoint that can be read; the one before it is kept on the target for exactly this.
    for (const cp of checkpoints) {
      if (cp.path === sm.checkpoint) break
      const text = await fetchOpened(mem, cp.path, cp.size, 'chk', name)
      // Stryker disable next-line ConditionalExpression: JSON.parse(null) is null, which parseBody refuses as well
      const body = text === null ? null : parseBody(text, name, codec, 'state')
      if (!body) continue
      await local.apply(name, body.value)
      absorb(mem, name, codec.index(body.value))
      for (const [d, seq] of Object.entries(cp.covers)) sm.covers[d] = Math.max(sm.covers[d] ?? 0, seq)
      sm.checkpoint = cp.path
      Reflect.deleteProperty(mem.waiting, cp.path)
      report.pulled += 1
      break
    }
    const applied = new Set(sm.applied)
    const refs = docs.flatMap((d) => d.segments.filter((s) => s.stream === name).map((s) => ({ ...s, device: d.device })))
    // Stryker disable next-line EqualityOperator: paths are unique, so `<` and `<=` give the same order
    refs.sort((a, b) => a.at - b.at || (a.path < b.path ? -1 : 1))
    for (const ref of refs) {
      if (applied.has(ref.path) || (sm.covers[ref.device] ?? 0) >= ref.seq) continue
      const text = await fetchOpened(mem, ref.path, ref.size, 'seg', name)
      // Stryker disable next-line ConditionalExpression: JSON.parse(null) is null, which parseBody refuses as well
      const body = text === null ? null : parseBody(text, name, codec, 'delta')
      if (!body) { if (text !== null) failed(mem, ref.path); continue }
      await local.apply(name, body.value)
      absorb(mem, name, codec.index(body.value))
      sm.applied.push(ref.path)
      Reflect.deleteProperty(mem.waiting, ref.path)
      report.pulled += 1
    }
    const listedPaths = new Set(refs.map((r) => r.path))
    sm.applied = sm.applied.filter((p) => listedPaths.has(p))
  }

  // ---- push ----

  async function writeManifest(mem: EngineMemory): Promise<void> {
    const doc: Manifest = {
      v: 1, device, name: options.deviceName, seq: mem.own.manifestSeq + 1, updatedAt: options.now(),
      segments: mem.own.segments, checkpoints: mem.own.checkpoints,
    }
    await target.put(manifestPath(device), await crypto.seal('man', '', JSON.stringify(doc)))
    mem.own.manifestSeq = doc.seq
    mem.own.name = options.deviceName
    mem.own.dirty = false
  }

  /** A segment whose put response was lost may be on the target: if it is, it is adopted instead of being written twice. */
  async function settlePending(mem: EngineMemory): Promise<void> {
    for (const p of mem.pending) {
      const found = await target.stat(p.path)
      if (found && found.size === p.size) adopt(mem, p)
    }
    mem.pending = []
  }

  function adopt(mem: EngineMemory, p: PendingSegment): void {
    mem.own.segments.push({ path: p.path, stream: p.stream, size: p.size, seq: p.seq, at: p.at })
    mem.own.dirty = true
    absorb(mem, p.stream, p.tokens)
  }

  async function pushStream(mem: EngineMemory, report: PassReport, name: string): Promise<void> {
    const codec = local.codec(name)
    if (!codec) return
    const state = await local.read(name)
    const index = codec.index(state)
    const known = mem.known[name] ?? {}
    const keys = Object.keys(index).filter((k) => known[k] === undefined || index[k]! > known[k]!)
    if (keys.length === 0) return
    const sid = await streamId(name)
    for (const part of codec.split(codec.pick(state, keys), segmentLimit)) {
      const seq = ++mem.seq
      const at = options.now()
      const body = await crypto.seal('seg', sid, JSON.stringify({ v: 1, stream: name, device, seq, delta: part }))
      const pending: PendingSegment = { path: segmentPath(sid, device, seq, options.random()), stream: name, seq, size: body.length, at, tokens: codec.index(part) }
      mem.pending.push(pending)
      await options.memory.save(mem)
      await target.put(pending.path, body, create)
      mem.pending = []
      adopt(mem, pending)
      report.pushed += 1
    }
  }

  async function pushPhase(mem: EngineMemory, report: PassReport, streams: readonly string[]): Promise<void> {
    await settlePending(mem)
    for (const name of streams) await pushStream(mem, report, name)
    if (mem.own.dirty || mem.own.name !== options.deviceName) await writeManifest(mem)
  }

  // ---- compaction ----

  /** Everything of a stream that is in the target is in this device's state: nothing is waiting, nothing is unapplied. */
  function fullyApplied(mem: EngineMemory, name: string, sid: string): boolean {
    const sm = mem.streams[name]
    if (Object.keys(mem.waiting).some((p) => p.startsWith(streamPrefix(sid)))) return false
    for (const d of remoteDocs(mem)) {
      for (const s of d.segments) if (s.stream === name && !sm?.applied.includes(s.path) && (sm?.covers[d.device] ?? 0) < s.seq) return false
    }
    return true
  }

  async function compactStream(mem: EngineMemory, name: string): Promise<void> {
    const codec = local.codec(name)
    const sid = await streamId(name)
    if (!codec || !fullyApplied(mem, name, sid)) return
    const covers: Record<string, number> = { ...(mem.streams[name]?.covers ?? {}) }
    for (const d of remoteDocs(mem)) for (const s of d.segments) if (s.stream === name) covers[d.device] = Math.max(covers[d.device] ?? 0, s.seq)
    for (const s of mem.own.segments) if (s.stream === name) covers[device] = Math.max(covers[device] ?? 0, s.seq)
    const body = await crypto.seal('chk', sid, JSON.stringify({ v: 1, stream: name, state: await local.read(name), covers }))
    if (body.length > target.capabilities.maxObjectBytes) return
    const path = checkpointPath(sid, options.random())
    await target.put(path, body, create)
    const now = options.now()
    mem.own.checkpoints.push({ path, stream: name, size: body.length, at: now, covers })
    mem.own.segments = mem.own.segments.map((s) => (s.stream === name && s.retiredAt === undefined ? { ...s, retiredAt: now } : s))
    // Stryker disable next-line EqualityOperator: paths are unique, so `<` and `<=` give the same order
    const mine = mem.own.checkpoints.filter((c) => c.stream === name).sort((a, b) => a.at - b.at || (a.path < b.path ? -1 : 1))
    const dropped = new Set(mine.slice(0, Math.max(0, mine.length - KEPT_CHECKPOINTS)).map((c) => c.path))
    mem.own.checkpoints = mem.own.checkpoints.filter((c) => !dropped.has(c.path))
    await writeManifest(mem)
    for (const p of dropped) await target.delete(p)
  }

  async function compactPhase(mem: EngineMemory, streams: readonly string[], forced: readonly string[]): Promise<void> {
    const now = options.now()
    const due = mem.own.segments.filter((s) => (s.retiredAt ?? Infinity) <= now - RETIRE_AFTER_MS)
    if (due.length > 0) {
      const gone = new Set(due.map((s) => s.path))
      mem.own.segments = mem.own.segments.filter((s) => !gone.has(s.path))
      await writeManifest(mem)
      for (const path of gone) await target.delete(path)
    }
    for (const name of new Set([...streams, ...forced])) {
      const live = mem.own.segments.filter((s) => s.stream === name && s.retiredAt === undefined)
      if (forced.includes(name) ? live.length > 0 : live.length > COMPACT_SEGMENTS || live.reduce((n, s) => n + s.size, 0) > COMPACT_BYTES) await compactStream(mem, name)
    }
  }

  // ---- the pass ----

  async function sync(request: SyncRequest = {}): Promise<SyncReport> {
    const mem = await load()
    const report: PassReport = { pushed: 0, pulled: 0, warnings: [], info: (mem.info ?? options.info) as InfoDoc, infoChanged: false }
    try {
      await infoPhase(mem, report)
      await readManifests(mem, report)
      for (const name of request.open ?? []) if (!mem.opened.includes(name)) mem.opened.push(name)
      const eager = await local.eager()
      const streams = [...new Set([...eager, ...mem.opened])]
      for (const name of streams) await pullStream(mem, report, name)
      await pushPhase(mem, report, eager)
      // Stryker disable next-line ArrayDeclaration: a stream with no segment of this device is never compacted, whoever names it
      await compactPhase(mem, streams, request.compact ?? [])
    } finally {
      await options.memory.save(mem)
    }
    const waiting = Object.entries(mem.waiting).map(([path, w]) => ({ path, since: w.since })).sort(byPath)
    // Stryker disable next-line EqualityOperator: device ids are unique, so `<` and `<=` give the same order
    const others = remoteDocs(mem).map((d) => ({ device: d.device, name: d.name, updatedAt: d.updatedAt, self: false })).sort((a, b) => (a.device < b.device ? -1 : 1))
    const devices = [{ device, name: options.deviceName, updatedAt: options.now(), self: true }, ...others]
    const streams = [...new Set(remoteDocs(mem).flatMap((d) => d.segments.map((s) => s.stream)))].sort()
    return { ...report, streams, waiting, devices }
  }

  return {
    sync,
    async publishInfo(info) {
      const mem = await load()
      await target.put(INFO_PATH, new TextEncoder().encode(JSON.stringify(info)), create)
      mem.info = info
      mem.highestInfoTime = Math.max(mem.highestInfoTime, infoTime(info))
      delete mem.infoEtag
      await options.memory.save(mem)
    },
    async updateInfo(info) {
      const mem = await load()
      mem.info = mergeInfo((mem.info ?? options.info) as InfoDoc, info)
      delete mem.infoEtag
      await options.memory.save(mem)
    },
    async deleteStream(name) {
      const mem = await load()
      const sid = await streamId(name)
      for (const o of await collect(target.list(streamPrefix(sid)))) await target.delete(o.path)
      mem.own.segments = mem.own.segments.filter((s) => s.stream !== name)
      mem.own.checkpoints = mem.own.checkpoints.filter((c) => c.stream !== name)
      Reflect.deleteProperty(mem.known, name)
      Reflect.deleteProperty(mem.streams, name)
      mem.opened = mem.opened.filter((n) => n !== name)
      await writeManifest(mem)
      await options.memory.save(mem)
    },
    async deleteVault() {
      for (const prefix of ['s/', 'm/']) for (const o of await collect(target.list(prefix))) await target.delete(o.path)
      for (const o of await collect(target.list('info'))) await target.delete(o.path)
      await options.memory.save(emptyMemory())
    },
  }
}
