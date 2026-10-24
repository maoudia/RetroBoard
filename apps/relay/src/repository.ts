import type { BoardState, Dirty } from '@retroboard/domain'

/** Port: where a board lives. The Durable Object does not care how. */
export interface BoardRepository {
  load(): Promise<BoardState | null>
  persist(state: BoardState, dirty: Dirty): Promise<void>
  erase(): Promise<void>
}

const CHUNK = 128 // Durable Object storage batch limit

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK))
  return out
}

type Meta = Pick<BoardState, 'settings' | 'columns' | 'timer'>

/** Adapter over Durable Object (SQLite-backed) storage. One key per entity. */
export class DurableStorageRepository implements BoardRepository {
  constructor(private readonly storage: DurableObjectStorage) {}

  async load(): Promise<BoardState | null> {
    const all = await this.storage.list()
    const meta = all.get('meta') as Meta | undefined
    if (!meta) return null
    const state: BoardState = { ...meta, notes: {}, groups: {}, actions: {} }
    for (const [key, value] of all) {
      const id = key.slice(2)
      if (key.startsWith('n:')) state.notes[id] = value as BoardState['notes'][string]
      else if (key.startsWith('g:')) state.groups[id] = value as BoardState['groups'][string]
      else if (key.startsWith('a:')) state.actions[id] = value as BoardState['actions'][string]
    }
    return state
  }

  async persist(state: BoardState, dirty: Dirty): Promise<void> {
    if (dirty.wipe) {
      await this.storage.deleteAll()
      await this.write(this.everything(state), [])
      return
    }
    const puts: [string, unknown][] = []
    const deletes: string[] = []
    if (dirty.meta) puts.push(['meta', this.meta(state)])
    const add = (prefix: string, ids: string[], source: Record<string, unknown>) => {
      for (const id of new Set(ids)) {
        if (id in source) puts.push([prefix + id, source[id]])
        else deletes.push(prefix + id)
      }
    }
    add('n:', dirty.notes, state.notes)
    add('g:', dirty.groups, state.groups)
    add('a:', dirty.actions, state.actions)
    await this.write(puts, deletes)
  }

  async erase(): Promise<void> {
    await this.storage.deleteAll()
  }

  private meta(s: BoardState): Meta {
    return { settings: s.settings, columns: s.columns, timer: s.timer }
  }

  private everything(s: BoardState): [string, unknown][] {
    return [
      ['meta', this.meta(s)],
      ...Object.entries(s.notes).map(([id, v]): [string, unknown] => [`n:${id}`, v]),
      ...Object.entries(s.groups).map(([id, v]): [string, unknown] => [`g:${id}`, v]),
      ...Object.entries(s.actions).map(([id, v]): [string, unknown] => [`a:${id}`, v]),
    ]
  }

  private async write(puts: [string, unknown][], deletes: string[]): Promise<void> {
    for (const c of chunks(puts)) await this.storage.put(Object.fromEntries(c))
    for (const c of chunks(deletes)) await this.storage.delete(c)
  }
}
