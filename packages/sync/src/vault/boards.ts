/**
 * The stream codec of a board: its event envelopes, a union by event id (change user-drive-storage, design "Vault engine").
 * An envelope is already sealed with the board's own key, so a segment seals it a second time and neither the target nor
 * the engine reads it. Events never change, so the token of an item is a constant: an id the target holds is never sent again.
 */
import type { StreamCodec } from './types'

export interface BoardEvent { readonly id: string; readonly data: string }

export const BOARD_STREAM_PREFIX = 'board:'
export const boardStream = (boardId: string): string => `${BOARD_STREAM_PREFIX}${boardId}`
export const isBoardStream = (name: string): boolean => name.startsWith(BOARD_STREAM_PREFIX)
export const boardOfStream = (name: string): string => name.slice(BOARD_STREAM_PREFIX.length)

/** The room for the segment wrapper around the events: keys, quotes and the like. */
const OVERHEAD = 512

export const boardCodec: StreamCodec<BoardEvent[]> = {
  index: (events) => Object.fromEntries(events.map((e) => [e.id, '1'])),
  pick: (events, keys) => {
    const wanted = new Set(keys)
    return events.filter((e) => wanted.has(e.id))
  },
  split(events, maxBytes) {
    const parts: BoardEvent[][] = []
    let part: BoardEvent[] = []
    let size = OVERHEAD
    for (const e of events) {
      // A string is escaped by at most six bytes per character in JSON; the id and the punctuation come on top.
      const bytes = e.data.length + e.id.length + 32
      if (part.length > 0 && size + bytes > maxBytes) { parts.push(part); part = []; size = OVERHEAD }
      part.push(e)
      size += bytes
    }
    if (part.length > 0) parts.push(part)
    return parts
  },
  parse(value) {
    if (!Array.isArray(value)) return null
    const out: BoardEvent[] = []
    for (const e of value) {
      const v = e as Partial<BoardEvent> | null
      if (typeof v?.id !== 'string' || typeof v.data !== 'string' || !v.id) return null
      out.push({ id: v.id, data: v.data })
    }
    return out
  },
}

/** Union by id; the first copy of an id is kept (the same id is the same sealed envelope). */
export function mergeEvents(a: readonly BoardEvent[], b: readonly BoardEvent[]): BoardEvent[] {
  const seen = new Set(a.map((e) => e.id))
  return [...a, ...b.filter((e) => !seen.has(e.id) && seen.add(e.id))]
}
