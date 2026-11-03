/**
 * Column turns (change ux-irritants-wave-3): the facilitator opens one column for writing, the others are masked.
 * A soft focus: it only says which column is open; drafts already written still publish. Facilitators only (PRIVILEGED_COMMANDS). Pure.
 */
import { done, fail, type HandlerMap } from '../shared/outcome'

export const turnHandlers: HandlerMap<'turn.set'> = {
  'turn.set': (s, c) => {
    if (c.columnId !== null && !s.columns.some((x) => x.id === c.columnId && !x.hidden)) return fail('not-found')
    if ((s.turn ?? null) === c.columnId) return done(s, {})
    return done({ ...s, turn: c.columnId }, { meta: true })
  },
}
