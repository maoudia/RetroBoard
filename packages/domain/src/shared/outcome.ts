import type { Command } from './commands'
import type { Actor, BoardState, Dirty, ErrorCode, Outcome, ReduceContext } from './types'

export type Handler<K extends Command['t']> = (
  s: BoardState, c: Extract<Command, { t: K }>, a: Actor, ctx: ReduceContext,
) => Outcome

/** Handlers of one bounded context, keyed by command type. */
export type HandlerMap<K extends Command['t']> = { [P in K]: Handler<P> }

export const fail = (error: ErrorCode): Outcome => ({ ok: false, error })
export const clean = (): Dirty => ({ meta: false, notes: [], groups: [], actions: [], wipe: false })
export const done = (state: BoardState, dirty: Partial<Dirty>): Outcome => ({ ok: true, state, dirty: { ...clean(), ...dirty } })
export const noteCount = (s: BoardState): number => Object.keys(s.notes).length
