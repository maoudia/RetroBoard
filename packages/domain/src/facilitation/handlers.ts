import { getTemplate, localizeTemplate } from '../catalogue/templates'
import { done, fail, type HandlerMap, noteCount } from '../shared/outcome'
import { columnsFromTemplate } from './board'

type FacilitationCommand = 'board.init' | 'template.apply' | 'settings.update'
  | 'timer.start' | 'timer.pause' | 'timer.reset' | 'board.reset'

/** Facilitation context: board setup, settings and the shared timer. */
export const facilitationHandlers: HandlerMap<FacilitationCommand> = {
  'board.init': (s, c, _a, ctx) => {
    if (s.settings.initialized) return fail('not-empty')
    const tpl = getTemplate(c.templateId)
    if (!tpl) return fail('not-found')
    return done({
      ...s,
      columns: columnsFromTemplate(localizeTemplate(tpl, c.locale), ctx.newId),
      settings: { ...s.settings, initialized: true, templateId: tpl.id, themeId: c.themeId, title: c.title ?? s.settings.title },
    }, { meta: true, wipe: true })
  },

  'template.apply': (s, c, _a, ctx) => {
    const tpl = getTemplate(c.templateId)
    if (!tpl) return fail('not-found')
    if (noteCount(s) > 0 && !c.wipe) return fail('not-empty')
    return done({
      ...s,
      columns: columnsFromTemplate(localizeTemplate(tpl, c.locale), ctx.newId),
      notes: {}, groups: {},
      settings: { ...s.settings, templateId: tpl.id },
    }, { meta: true, wipe: true })
  },

  'settings.update': (s, c) => {
    const settings = {
      ...s.settings,
      title: c.title ?? s.settings.title,
      voteLimit: c.voteLimit ?? s.settings.voteLimit,
      secretVoting: c.secretVoting ?? s.settings.secretVoting,
      locked: c.locked ?? s.settings.locked,
      browserAgentsAllowed: c.browserAgentsAllowed ?? s.settings.browserAgentsAllowed,
      themeId: c.themeId ?? s.settings.themeId,
    }
    return done({ ...s, settings }, { meta: true })
  },

  'timer.start': (s, _c, _a, ctx) => {
    if (s.timer.running) return done(s, {})
    const remaining = s.timer.remaining > 0 ? s.timer.remaining : s.timer.length
    return done({ ...s, timer: { ...s.timer, running: true, remaining, endsAt: ctx.now + remaining } }, { meta: true })
  },

  'timer.pause': (s, _c, _a, ctx) => {
    if (!s.timer.running) return done(s, {})
    const remaining = Math.max(0, s.timer.endsAt - ctx.now)
    return done({ ...s, timer: { ...s.timer, running: false, remaining, endsAt: 0 } }, { meta: true })
  },

  'timer.reset': (s, c) => {
    const length = c.minutes ? c.minutes * 60_000 : s.timer.length
    return done({ ...s, timer: { running: false, endsAt: 0, remaining: length, length } }, { meta: true })
  },

  'board.reset': (s) => done({
    ...s, notes: {}, groups: {}, actions: {},
    timer: { running: false, endsAt: 0, remaining: s.timer.length, length: s.timer.length },
  }, { meta: true, wipe: true }),
}
