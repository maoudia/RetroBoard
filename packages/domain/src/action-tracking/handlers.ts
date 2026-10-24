import type { ActionStatusName, ImportedAction } from '../shared/commands'
import { LIMITS } from '../shared/limits'
import { done, fail, type HandlerMap } from '../shared/outcome'
import type { ActionItem, BoardState, Outcome, ReduceContext } from '../shared/types'

/** Statuses that close an action: not carried over to the next retro. */
export const CLOSED_STATUSES: readonly ActionStatusName[] = ['done', 'dropped']
export const isOpenAction = (a: Pick<ActionItem, 'status'>): boolean => !CLOSED_STATUSES.includes(a.status)

function newAction(ctx: ReduceContext, text: string, owner: string, status: ActionStatusName, due: string | null, carriedFrom: string | null, offset = 0): ActionItem {
  const at = ctx.now + offset
  return { id: ctx.newId(), text, owner, status, done: status === 'done', history: [{ status, at }], due, carriedFrom, createdAt: at }
}

function setStatus(s: BoardState, id: string, status: ActionStatusName, now: number): Outcome {
  const item = s.actions[id]
  if (!item) return fail('not-found')
  if (item.status === status) return done(s, {})
  const next: ActionItem = { ...item, status, done: status === 'done', history: [...item.history, { status, at: now }] }
  return done({ ...s, actions: { ...s.actions, [id]: next } }, { actions: [id] })
}

const room = (s: BoardState, n: number) => Object.keys(s.actions).length + n <= LIMITS.maxActions

/** Action tracking context: the action plan, its statuses and carry-over between retros. */
export const actionHandlers: HandlerMap<'action.add' | 'action.update' | 'action.status' | 'action.import' | 'action.toggle' | 'action.delete'> = {
  'action.add': (s, c, _a, ctx) => {
    if (!room(s, 1)) return fail('limit-reached')
    const item = newAction(ctx, c.text, c.owner, 'todo', c.due ?? null, null)
    return done({ ...s, actions: { ...s.actions, [item.id]: item } }, { actions: [item.id] })
  },

  'action.update': (s, c) => {
    const item = s.actions[c.id]
    if (!item) return fail('not-found')
    const next = { ...item, text: c.text ?? item.text, owner: c.owner ?? item.owner, due: c.due === undefined ? item.due : c.due }
    return done({ ...s, actions: { ...s.actions, [c.id]: next } }, { actions: [c.id] })
  },

  'action.status': (s, c, _a, ctx) => setStatus(s, c.id, c.status, ctx.now),

  // Kept for the checkbox mode and protocol v1 clients.
  'action.toggle': (s, c, _a, ctx) => setStatus(s, c.id, c.done ? 'done' : 'todo', ctx.now),

  /** Carry-over: previous actions keep their owner and status, marked with where they come from. */
  'action.import': (s, c, _a, ctx) => {
    if (!room(s, c.items.length)) return fail('limit-reached')
    const actions = { ...s.actions }
    const ids: string[] = []
    c.items.forEach((i: ImportedAction, k) => {
      const item = newAction(ctx, i.text, i.owner, i.status, i.due ?? null, i.from ?? '', k)
      actions[item.id] = item
      ids.push(item.id)
    })
    return done({ ...s, actions }, { actions: ids })
  },

  'action.delete': (s, c) => {
    if (!s.actions[c.id]) return fail('not-found')
    const actions = { ...s.actions }
    Reflect.deleteProperty(actions, c.id)
    return done({ ...s, actions }, { actions: [c.id] })
  },
}
