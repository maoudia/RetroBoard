/** Shared fixtures of the vault engine tests: a vault's keys, a fake local side, devices that share one target. */
import { createVaultSealer, deriveVaultKeys, randomKey } from '@retroboard/crypto'
import { type MemoryTarget, createMemoryTarget } from '@retroboard/testkit'
import {
  type BoardEvent, type EngineMemory, type InfoDoc, type Manifest, type MemoryPort, type StreamCodec, type SyncReport, type VaultEngine, type VaultLocal,
  boardCodec, boardStream, createVaultEngine, isBoardStream, mergeEvents, segmentPath,
} from '../src'

export const INFO: InfoDoc = {
  version: 1, minReader: 1, vaultId: 'vault-test', cipher: 'aes-256-gcm',
  activeKeyId: { value: '0011223344556677', updatedTime: 1 }, wraps: [{ kind: 'password', updatedTime: 1 }], settings: {},
}

/** A record of a key-value stream: the value and a token that orders writes (a larger string is newer). */
export interface Item { readonly value: string; readonly token: string }
export type Kv = Readonly<Record<string, Item>>

export const kvCodec: StreamCodec<Kv> = {
  index: (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.token])),
  pick: (s, keys) => Object.fromEntries(keys.filter((k) => k in s).map((k) => [k, s[k]!])),
  split: (s, max) => {
    const parts: Kv[] = []
    let part: Record<string, Item> = {}
    let size = 0
    for (const [k, v] of Object.entries(s)) {
      const bytes = JSON.stringify([k, v]).length
      if (size > 0 && size + bytes > max) { parts.push(part); part = {}; size = 0 }
      part[k] = v
      size += bytes
    }
    return Object.keys(part).length > 0 ? [...parts, part] : parts
  },
  parse: (v) => (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((i) => typeof (i as Item)?.value === 'string' && typeof (i as Item).token === 'string') ? v as Kv : null),
}

export const mergeKv = (a: Kv, b: Kv): Kv => {
  const out = new Map(Object.entries(a))
  for (const [k, v] of Object.entries(b)) if (!out.has(k) || v.token > out.get(k)!.token) out.set(k, v)
  return Object.fromEntries(out)
}

/** The local side of one device: its streams, and which of them are mirrored. */
export class FakeLocal implements VaultLocal {
  readonly data = new Map<string, unknown>()
  eagerStreams: string[] = ['library', 'settings']
  applied: { stream: string; delta: unknown }[] = []
  codec(stream: string): StreamCodec | null { return (isBoardStream(stream) ? boardCodec : kvCodec) as StreamCodec }
  async eager() { return this.eagerStreams }
  async read(stream: string) { return this.data.get(stream) ?? (isBoardStream(stream) ? [] : {}) }
  async apply(stream: string, delta: unknown) {
    this.applied.push({ stream, delta })
    this.data.set(stream, isBoardStream(stream) ? mergeEvents((await this.read(stream)) as BoardEvent[], delta as BoardEvent[]) : mergeKv((await this.read(stream)) as Kv, delta as Kv))
  }
  set(stream: string, key: string, value: string, token: string) {
    this.data.set(stream, mergeKv((this.data.get(stream) ?? {}) as Kv, { [key]: { value, token } }))
  }
  get(stream: string): Kv { return (this.data.get(stream) ?? {}) as Kv }
  addEvents(boardId: string, ...ids: string[]) {
    const stream = boardStream(boardId)
    this.data.set(stream, mergeEvents((this.data.get(stream) ?? []) as BoardEvent[], ids.map((id) => ({ id, data: `sealed-${id}` }))))
  }
  events(boardId: string): string[] { return ((this.data.get(boardStream(boardId)) ?? []) as BoardEvent[]).map((e) => e.id).sort() }
}

export const memoryPort = (): MemoryPort & { current: EngineMemory | null } => {
  const port = { current: null as EngineMemory | null, load: async () => (port.current ? structuredClone(port.current) : null), save: async (m: EngineMemory) => { port.current = structuredClone(m) } }
  return port
}

export interface Device {
  readonly id: string
  readonly local: FakeLocal
  readonly memory: ReturnType<typeof memoryPort>
  readonly engine: VaultEngine
  sync(request?: Parameters<VaultEngine['sync']>[0]): Promise<SyncReport>
}

/** Devices that share one target and one clock, each with its own browser-side memory. */
export interface Fleet {
  target: MemoryTarget
  clock: { now: number }
  /** Seals like the vault does, to put hand-made objects on the target. */
  sealer: ReturnType<typeof createVaultSealer>
  device(id: string, over?: Partial<Parameters<typeof createVaultEngine>[0]>): Device
  /** Writes a manifest of another device. */
  putManifest(path: string, doc: Partial<Manifest> & { device: string }): Promise<void>
  /** Writes a segment of a stream; returns its path and size. */
  putSegment(stream: string, device: string, seq: number, payload: unknown, over?: { rand?: string; body?: string }): Promise<{ path: string; size: number }>
}

export async function fleet(target: MemoryTarget = createMemoryTarget()): Promise<Fleet> {
  const keys = await deriveVaultKeys(randomKey(), INFO.vaultId)
  const sealer = createVaultSealer(keys, INFO.activeKeyId.value)
  const clock = { now: 1_700_000_000_000 }
  let n = 0
  return {
    target,
    clock,
    sealer,
    async putManifest(path, doc) {
      const full: Manifest = { v: 1, name: 'Other', seq: 1, updatedAt: 1, segments: [], checkpoints: [], ...doc }
      await target.put(path, await sealer.seal('man', '', JSON.stringify(full)))
    },
    async putSegment(stream, device, seq, payload, over = {}) {
      const sid = await sealer.streamId(stream)
      const path = segmentPath(sid, device, seq, over.rand ?? 'aaaaaaaa')
      const body = await sealer.seal('seg', sid, over.body ?? JSON.stringify({ v: 1, stream, device, seq, delta: payload }))
      await target.put(path, body)
      return { path, size: body.length }
    },
    device(id, over = {}) {
      const local = new FakeLocal()
      const memory = memoryPort()
      const salt = (n++).toString(16)
      let counter = 0
      const engine = createVaultEngine({
        target, crypto: sealer, local, memory, device: id, deviceName: `Device ${id}`, info: INFO, now: () => clock.now,
        random: () => `${salt}${(counter++).toString(16).padStart(7, '0')}`, ...over,
      })
      return { id, local, memory, engine, sync: (request) => engine.sync(request) }
    },
  }
}
