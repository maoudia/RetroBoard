import { LIMITS } from '../shared/limits'
import { done, fail, type HandlerMap } from '../shared/outcome'

/** Action tracking context: the action plan. */
export const actionHandlers: HandlerMap<'action.add' | 'action.toggle' | 'action.delete'> = {
  'action.add': (s, c, _a, ctx) => {
    if (Object.keys(s.actions).length >= LIMITS.maxActions) return fail('limit-reached')
    const item = { id: ctx.newId(), text: c.text, owner: c.owner, done: false, createdAt: ctx.now }
    return done({ ...s, actions: { ...s.actions, [item.id]: item } }, { actions: [item.id] })
  },

  'action.toggle': (s, c) => {
    const item = s.actions[c.id]
    if (!item) return fail('not-found')
    return done({ ...s, actions: { ...s.actions, [item.id]: { ...item, done: c.done } } }, { actions: [item.id] })
  },

  'action.delete': (s, c) => {
    if (!s.actions[c.id]) return fail('not-found')
    const actions = { ...s.actions }
    Reflect.deleteProperty(actions, c.id)
    return done({ ...s, actions }, { actions: [c.id] })
  },
}
