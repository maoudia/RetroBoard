import { actionHandlers } from './action-tracking/handlers'
import { facilitationHandlers } from './facilitation/handlers'
import { freezeHandlers, touchesFrozen } from './ideation/freeze'
import { pinHandlers } from './ideation/pin'
import { ideationHandlers } from './ideation/handlers'
import { rotiHandlers } from './facilitation/roti'
import { talkHandlers } from './facilitation/talk'
import type { Command } from './shared/commands'
import type { Handler, HandlerMap } from './shared/outcome'
import type { Actor, BoardState, Outcome, ReduceContext } from './shared/types'
import { votingHandlers } from './voting/handlers'

/** Every command type must have exactly one handler, owned by one bounded context. */
const handlers: HandlerMap<Command['t']> = {
  ...ideationHandlers,
  ...freezeHandlers,
  ...pinHandlers,
  ...votingHandlers,
  ...actionHandlers,
  ...facilitationHandlers,
  ...talkHandlers,
  ...rotiHandlers,
}

/** Pure: same state, command, actor and context always give the same outcome. */
export function reduce(state: BoardState, cmd: Command, actor: Actor, ctx: ReduceContext): Outcome {
  if (touchesFrozen(state, cmd)) return { ok: false, error: 'frozen' }
  const handler = handlers[cmd.t] as Handler<typeof cmd.t>
  return clearOrphanSources(handler(state, cmd as never, actor, ctx))
}

/** An action whose source note or group no longer exists loses the link (replicas fold the same way). */
function clearOrphanSources(out: Outcome): Outcome {
  if (!out.ok) return out
  const { notes, groups, actions } = out.state
  const orphans = Object.values(actions).filter((a) => a.sourceNote && !notes[a.sourceNote] && !groups[a.sourceNote])
  if (!orphans.length) return out
  const next = { ...actions }
  for (const a of orphans) {
    const { sourceNote: _gone, ...rest } = a
    next[a.id] = rest
  }
  return { ...out, state: { ...out.state, actions: next }, dirty: { ...out.dirty, actions: [...new Set([...out.dirty.actions, ...orphans.map((a) => a.id)])] } }
}
