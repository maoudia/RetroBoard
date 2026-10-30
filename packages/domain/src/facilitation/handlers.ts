import { agendaRunning, closePhase, extendPhase, MIN, newAgenda } from './agenda'
import { getTemplate, localizeTemplate } from '../catalogue/templates'
import { LIMITS, NOTE_TEXT_MIN } from '../shared/limits'
import { clean, done, fail, type HandlerMap, noteCount } from '../shared/outcome'
import { columnsFromTemplate, mapColumns } from './board'
import { emptyTalk } from './talk'

type FacilitationCommand = 'drafts.reveal' | 'board.init' | 'template.apply' | 'settings.update'
  | 'timer.start' | 'timer.pause' | 'timer.reset' | 'board.reset' | 'board.destroy' | 'column.reset' | 'vote.reset'
  | 'agenda.set' | 'agenda.options' | 'agenda.clear' | 'agenda.start' | 'agenda.pause' | 'agenda.next' | 'agenda.prev' | 'agenda.extend' | 'agenda.end'

/** Facilitation context: board setup, settings and the shared timer. */
export const facilitationHandlers: HandlerMap<FacilitationCommand> = {
  'board.init': (s, c, _a, ctx) => {
    if (s.settings.initialized) return fail('not-empty')
    const tpl = getTemplate(c.templateId)
    if (!tpl) return fail('not-found')
    return done({
      ...s,
      columns: columnsFromTemplate(localizeTemplate(tpl, c.locale), ctx.newId),
      settings: { ...s.settings, initialized: true, templateId: tpl.id, themeId: c.themeId, title: c.title ?? s.settings.title, ...(c.locale ? { locale: c.locale } : {}), ...(c.openFacilitation !== undefined ? { openFacilitation: c.openFacilitation } : {}) },
    }, { meta: true, wipe: true })
  },

  'template.apply': (s, c, _a, ctx) => {
    const tpl = getTemplate(c.templateId)
    if (!tpl) return fail('not-found')
    const mode = c.mode ?? (c.wipe ? 'wipe' : null)
    if (noteCount(s) > 0 && !mode) return fail('not-empty')
    if (mode === 'migrate' && noteCount(s) > 0) {
      // New columns reuse the ids of the old ones by position (drafts and links stay valid); extra old columns collapse into the last.
      const fresh = columnsFromTemplate(localizeTemplate(tpl, c.locale), ctx.newId).map((col, i) => ({ ...col, id: s.columns[i]?.id ?? col.id }))
      const map = mapColumns(s.columns.map((x) => x.id), fresh.map((x) => x.id))
      const notes = { ...s.notes }
      const groups = { ...s.groups }
      const dirty = clean()
      for (const n of Object.values(s.notes)) {
        const to = map[n.columnId] ?? fresh[fresh.length - 1]!.id
        if (to === n.columnId) continue
        notes[n.id] = { ...n, columnId: to }
        dirty.notes.push(n.id)
      }
      for (const g of Object.values(s.groups)) {
        const to = map[g.columnId] ?? fresh[fresh.length - 1]!.id
        if (to === g.columnId) continue
        groups[g.id] = { ...g, columnId: to }
        dirty.groups.push(g.id)
      }
      return done({ ...s, columns: fresh, notes, groups, settings: { ...s.settings, templateId: tpl.id } }, { ...dirty, meta: true })
    }
    return done({
      ...s,
      columns: columnsFromTemplate(localizeTemplate(tpl, c.locale), ctx.newId),
      notes: {}, groups: {},
      settings: { ...s.settings, templateId: tpl.id },
    }, { meta: true, wipe: true })
  },

  'settings.update': (s, c) => {
    if (c.noteMaxLength !== undefined && !(Number.isInteger(c.noteMaxLength) && c.noteMaxLength >= NOTE_TEXT_MIN && c.noteMaxLength <= LIMITS.noteText)) return fail('invalid')
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
      noteMaxLength: c.noteMaxLength ?? s.settings.noteMaxLength,
    }
    return done({ ...s, settings }, { meta: true })
  },

  /** Countdown for everyone: at `endsAt` each client publishes its own drafts (clients decide, drafts are local). */
  'drafts.reveal': (s, c, _a, ctx) => {
    const seconds = Math.min(30, Math.max(3, Math.trunc(c.seconds ?? 5)))
    return done({ ...s, reveal: { endsAt: ctx.now + seconds * 1000 } }, { meta: true })
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

  'timer.reset': (s, c, _a, ctx) => {
    const length = c.minutes ? c.minutes * 60_000 : s.timer.length
    // Optionally restart the clock of the running phase too (a paused phase stays paused, at zero).
    const agenda = c.agendaClock && agendaRunning(s.agenda)
      ? { ...s.agenda, startedAt: ctx.now, pausedAt: s.agenda.pausedAt === null ? null : ctx.now }
      : s.agenda
    return done({ ...s, agenda, timer: { running: false, endsAt: 0, remaining: length, length } }, { meta: true })
  },

  'board.reset': (s) => done({
    ...s, notes: {}, groups: {}, actions: {},
    timer: { running: false, endsAt: 0, remaining: s.timer.length, length: s.timer.length },
    // A reset board starts its agenda over.
    agenda: s.agenda ? { ...s.agenda, current: -1, startedAt: 0, pausedAt: null } : null,
    talk: emptyTalk(), reveal: null, roti: {},
  }, { meta: true, wipe: true }),

  /** Empties one column: its notes and clusters. Other columns, votes and actions elsewhere stay. */
  'column.reset': (s, c) => {
    if (!s.columns.some((x) => x.id === c.id)) return fail('not-found')
    const notes = Object.fromEntries(Object.entries(s.notes).filter(([, n]) => n.columnId !== c.id))
    const groups = Object.fromEntries(Object.entries(s.groups).filter(([, g]) => g.columnId !== c.id))
    return done({ ...s, notes, groups }, { meta: true, wipe: true })
  },

  /** Clears every vote (notes and clusters) and reopens voting. */
  'vote.reset': (s) => done({
    ...s,
    notes: Object.fromEntries(Object.entries(s.notes).map(([id, n]) => [id, { ...n, voters: [] }])),
    groups: Object.fromEntries(Object.entries(s.groups).map(([id, g]) => [id, { ...g, voters: [] }])),
    settings: { ...s.settings, votingClosed: false },
  }, { meta: true, wipe: true }),

  /** Closes the board for good: content wiped, clock stopped, and the ledger ignores everything after it. */
  'board.destroy': (s) => done({
    ...s, notes: {}, groups: {}, actions: {},
    timer: { running: false, endsAt: 0, remaining: s.timer.length, length: s.timer.length },
    agenda: null, talk: emptyTalk(),
    settings: { ...s.settings, locked: true, destroyed: true },
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
  /** Back to the previous phase, which resumes with the time it had left. */
  'agenda.prev': (s, _c, _a, ctx) => {
    const a = s.agenda
    if (!a || a.current <= 0) return fail('invalid')
    const index = Math.min(a.current, a.phases.length) - 1
    const target = a.phases[index]!
    // The phase left behind loses its recorded time; the one we return to continues from what it had spent.
    const phases = a.phases.map((p, i) => {
      if (i !== index && i !== a.current) return p
      const { actualMs: _drop, ...rest } = p
      return rest
    })
    return done({ ...s, agenda: { ...a, phases, current: index, startedAt: ctx.now - Math.min(target.actualMs ?? 0, target.plannedMs), pausedAt: null } }, { meta: true })
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
