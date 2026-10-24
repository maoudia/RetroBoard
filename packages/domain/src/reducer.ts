import { actionHandlers } from './action-tracking/handlers'
import { facilitationHandlers } from './facilitation/handlers'
import { ideationHandlers } from './ideation/handlers'
import type { Command } from './shared/commands'
import type { Handler, HandlerMap } from './shared/outcome'
import type { Actor, BoardState, Outcome, ReduceContext } from './shared/types'
import { votingHandlers } from './voting/handlers'

/** Every command type must have exactly one handler, owned by one bounded context. */
const handlers: HandlerMap<Command['t']> = {
  ...ideationHandlers,
  ...votingHandlers,
  ...actionHandlers,
  ...facilitationHandlers,
}

/** Pure: same state, command, actor and context always give the same outcome. */
export function reduce(state: BoardState, cmd: Command, actor: Actor, ctx: ReduceContext): Outcome {
  const handler = handlers[cmd.t] as Handler<typeof cmd.t>
  return handler(state, cmd as never, actor, ctx)
}
