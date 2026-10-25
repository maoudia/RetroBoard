import { agendaRunning, closePhase, extendPhase, MIN, newAgenda } from './agenda'
import { getTemplate, localizeTemplate } from '../catalogue/templates'
import { done, fail, type HandlerMap, noteCount } from '../shared/outcome'
import { columnsFromTemplate } from './board'
import { emptyTalk } from './talk'

type FacilitationCommand = 'board.init' | 'template.apply' | 'settings.update'
  | 'timer.start' | 'timer.pause' | 'timer.reset' | 'board.reset'
  | 'agenda.set' | 'agenda.options' | 'agenda.clear' | 'agenda.start' | 'agenda.pause' | 'agenda.next' | 'agenda.extend' | 'agenda.end'

/** Facilitation context: board setup, settings and the shared timer. */
export const facilitationHandlers: HandlerMap<FacilitationCommand> = {
  'board.init': (s, c, _a, ctx) => {
    if (s.settings.initialized) return fail('not-empty')
    const tpl = getTemplate(c.templateId)
    if (!tpl) return fail('not-found')
    return done({
      ...s,
      columns: columnsFromTemplate(localizeTemplate(tpl, c.locale), ctx.newId),
      settings: { ...s.settings, initialized: true, templateId: tpl.id, themeId: c.themeId, title: c.title ?? s.settings.title, ...(c.locale ? { locale: c.locale } : {}) },
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
      // Per-item cap never above the per-person budget.
      maxVotesPerItem: Math.min(c.maxVotesPerItem ?? s.settings.maxVotesPerItem, c.voteLimit ?? s.settings.voteLimit),
      votable: c.votable ?? s.settings.votable,
      secretVoting: c.secretVoting ?? s.settings.secretVoting,
      locked: c.locked ?? s.settings.locked,
      browserAgentsAllowed: c.browserAgentsAllowed ?? s.settings.browserAgentsAllowed,
      openFacilitation: c.openFacilitation ?? s.settings.openFacilitation,
      actionMode: c.actionMode ?? s.settings.actionMode,
      themeId: c.themeId ?? s.settings.themeId,
      talkMode: c.talkMode ?? s.settings.talkMode,
      talkBudgetMs: c.talkBudgetSec !== undefined ? c.talkBudgetSec * 1000 : s.settings.talkBudgetMs,
      talkSelfStart: c.talkSelfStart ?? s.settings.talkSelfStart,
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
    // A reset board starts its agenda over.
    agenda: s.agenda ? { ...s.agenda, current: -1, startedAt: 0, pausedAt: null } : null,
    talk: emptyTalk(),
  }, { meta: true, wipe: true }),

  // Agenda (time boxes). Phases can be replaced only before the start or after the end.
  'agenda.set': (s, c, _a, ctx) => {
    if (agendaRunning(s.agenda)) return fail('invalid')
    return done({ ...s, agenda: newAgenda(c.phases, ctx.newId, { rules: c.rules, autoPublish: c.autoPublish }) }, { meta: true })
  },
  'agenda.options': (s, c) => {
    if (!s.agenda) return fail('not-found')
    return done({ ...s, agenda: { ...s.agenda, rules: c.rules ?? s.agenda.rules, autoPublish: c.autoPublish ?? s.agenda.autoPublish } }, { meta: true })
  },
  'agenda.clear': (s) => done({ ...s, agenda: null }, { meta: true }),
  'agenda.start': (s, _c, _a, ctx) => {
    const a = s.agenda
    if (!a || a.current >= a.phases.length) return fail('invalid')
    if (a.current < 0) return done({ ...s, agenda: { ...a, current: 0, startedAt: ctx.now, pausedAt: null } }, { meta: true })
    if (a.pausedAt === null) return done(s, {})
    // Resume: the pause does not count as elapsed time.
    return done({ ...s, agenda: { ...a, startedAt: a.startedAt + (ctx.now - a.pausedAt), pausedAt: null } }, { meta: true })
  },
  'agenda.pause': (s, _c, _a, ctx) => {
    const a = s.agenda
    if (!agendaRunning(a)) return fail('invalid')
    if (a.pausedAt !== null) return done(s, {})
    return done({ ...s, agenda: { ...a, pausedAt: ctx.now } }, { meta: true })
  },
  'agenda.next': (s, _c, _a, ctx) => {
    const a = s.agenda
    if (!a || a.current >= a.phases.length) return fail('invalid')
    return done({ ...s, agenda: { ...a, phases: closePhase(a, ctx.now), current: a.current + 1, startedAt: ctx.now, pausedAt: null } }, { meta: true })
  },
  'agenda.extend': (s, c) => {
    if (!agendaRunning(s.agenda)) return fail('invalid')
    return done({ ...s, agenda: extendPhase(s.agenda, c.minutes * MIN, c.borrow) }, { meta: true })
  },
  'agenda.end': (s, _c, _a, ctx) => {
    if (!s.agenda) return fail('not-found')
    return done({ ...s, agenda: { ...s.agenda, phases: closePhase(s.agenda, ctx.now), current: s.agenda.phases.length, pausedAt: null } }, { meta: true })
  },
}
