import { createBoard } from '../../shared/domain/board'
import { reduce } from '../../shared/domain/reducer'
import { type Command, parseCommand } from '../../shared/domain/schemas'
import type { Actor, BoardState } from '../../shared/domain/types'

export function ids(prefix = 'id') {
  let i = 0
  return () => `${prefix}${String(++i).padStart(4, '0')}`
}

export const alice: Actor = { cid: 'alice-client-id-0001', name: 'Alice', showName: true }
export const bob: Actor = { cid: 'bob---client-id-0002', name: 'Bob', showName: false }

export function harness() {
  const newId = ids()
  let now = 1_000_000
  let state = createBoard({ newId })
  const run = (cmd: Command, actor: Actor = alice) => {
    // Same path as production: validate and normalise, then reduce.
    const parsed = parseCommand(cmd)
    if (!parsed) return { ok: false as const, error: 'invalid' as const }
    const out = reduce(state, parsed, actor, { now, newId })
    if (out.ok) state = out.state
    return out
  }
  return {
    get state(): BoardState { return state },
    run,
    tick: (ms: number) => { now += ms },
    get now() { return now },
    col: (i: number) => state.columns[i]!.id,
  }
}
