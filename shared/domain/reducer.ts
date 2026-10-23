import { columnsFromTemplate } from './board'
import { DEFAULT_COLUMN_ICON } from './icons'
import { LIMITS, NOTE_COLOR_COUNT } from './limits'
import type { Command } from './schemas'
import { getTemplate, localizeTemplate } from './templates'
import type { Actor, BoardState, Dirty, ErrorCode, NoteRecord, Outcome, ReduceContext } from './types'

type Handler<K extends Command['t']> = (
  s: BoardState, c: Extract<Command, { t: K }>, a: Actor, ctx: ReduceContext,
) => Outcome

const fail = (error: ErrorCode): Outcome => ({ ok: false, error })
const clean = (): Dirty => ({ meta: false, notes: [], groups: [], actions: [], wipe: false })
const done = (state: BoardState, dirty: Partial<Dirty>): Outcome => ({ ok: true, state, dirty: { ...clean(), ...dirty } })

const noteCount = (s: BoardState) => Object.keys(s.notes).length
function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/** `offset` keeps notes of one batch in order (createdAt is the sort key). */
function makeNote(actor: Actor, ctx: ReduceContext, columnId: string, text: string, color?: number, offset = 0): NoteRecord {
  const id = ctx.newId()
  return {
    id, columnId, text, color: color ?? hash(id) % NOTE_COLOR_COUNT,
    author: actor.showName && actor.name ? actor.name : null,
    ownerCid: actor.cid, groupId: null, voters: [], createdAt: ctx.now + offset,
  }
}

/**
 * Dissolve groups that no longer hold at least two notes.
 * Mutates the working copies passed in, and records what changed.
 */
function normalizeGroups(
  ids: Iterable<string>, notes: BoardState['notes'], groups: BoardState['groups'], dirty: Dirty,
): void {
  for (const gid of ids) {
    if (!groups[gid]) continue
    const members = Object.values(notes).filter((n) => n.groupId === gid)
    if (members.length >= 2) continue
    for (const m of members) {
      notes[m.id] = { ...m, groupId: null }
      dirty.notes.push(m.id)
    }
    Reflect.deleteProperty(groups, gid)
    dirty.groups.push(gid)
  }
}

const handlers: { [K in Command['t']]: Handler<K> } = {
  'note.add': (s, c, a, ctx) => {
    if (s.settings.locked) return fail('locked')
    if (!s.columns.some((x) => x.id === c.columnId)) return fail('not-found')
    if (noteCount(s) >= LIMITS.maxNotes) return fail('limit-reached')
    const n = makeNote(a, ctx, c.columnId, c.text, c.color)
    return done({ ...s, notes: { ...s.notes, [n.id]: n } }, { notes: [n.id] })
  },

  'note.addMany': (s, c, a, ctx) => {
    if (s.settings.locked) return fail('locked')
    if (noteCount(s) + c.items.length > LIMITS.maxNotes) return fail('limit-reached')
    if (c.items.some((i) => !s.columns.some((x) => x.id === i.columnId))) return fail('not-found')
    const notes = { ...s.notes }
    const ids: string[] = []
    for (const [index, i] of c.items.entries()) {
      const n = makeNote(a, ctx, i.columnId, i.text, i.color, index)
      notes[n.id] = n
      ids.push(n.id)
    }
    return done({ ...s, notes }, { notes: ids })
  },

  'note.edit': (s, c, a) => {
    if (s.settings.locked) return fail('locked')
    const n = s.notes[c.id]
    if (!n) return fail('not-found')
    if (n.ownerCid !== a.cid) return fail('forbidden')
    return done({ ...s, notes: { ...s.notes, [n.id]: { ...n, text: c.text } } }, { notes: [n.id] })
  },

  'note.delete': (s, c, a) => {
    if (s.settings.locked) return fail('locked')
    const n = s.notes[c.id]
    if (!n) return fail('not-found')
    if (n.ownerCid !== a.cid) return fail('forbidden')
    const notes = { ...s.notes }
    const groups = { ...s.groups }
    Reflect.deleteProperty(notes, n.id)
    const dirty = clean()
    dirty.notes.push(n.id)
    if (n.groupId) normalizeGroups([n.groupId], notes, groups, dirty)
    return done({ ...s, notes, groups }, dirty)
  },

  'note.move': (s, c) => {
    if (s.settings.locked) return fail('locked')
    const n = s.notes[c.id]
    if (!n || !s.columns.some((x) => x.id === c.columnId)) return fail('not-found')
    if (n.columnId === c.columnId) return done(s, {})
    const notes = { ...s.notes, [n.id]: { ...n, columnId: c.columnId, groupId: null } }
    const groups = { ...s.groups }
    const dirty = clean()
    dirty.notes.push(n.id)
    if (n.groupId) normalizeGroups([n.groupId], notes, groups, dirty)
    return done({ ...s, notes, groups }, dirty)
  },

  'note.color': (s, c) => {
    const n = s.notes[c.id]
    if (!n) return fail('not-found')
    return done({ ...s, notes: { ...s.notes, [n.id]: { ...n, color: c.color } } }, { notes: [n.id] })
  },

  'note.group': (s, c, _a, ctx) => {
    if (s.settings.locked) return fail('locked')
    const a = s.notes[c.id]
    const b = s.notes[c.ontoId]
    if (!a || !b || a.id === b.id) return fail('not-found')
    const notes = { ...s.notes }
    const groups = { ...s.groups }
    const dirty = clean()
    let gid = b.groupId
    if (!gid) {
      gid = ctx.newId()
      groups[gid] = { id: gid, columnId: b.columnId, title: null }
      notes[b.id] = { ...b, groupId: gid }
      dirty.notes.push(b.id)
      dirty.groups.push(gid)
    }
    const previous = a.groupId
    notes[a.id] = { ...a, columnId: b.columnId, groupId: gid }
    dirty.notes.push(a.id)
    if (previous && previous !== gid) normalizeGroups([previous], notes, groups, dirty)
    return done({ ...s, notes, groups }, dirty)
  },

  'note.ungroup': (s, c) => {
    if (s.settings.locked) return fail('locked')
    const n = s.notes[c.id]
    if (!n) return fail('not-found')
    if (!n.groupId) return done(s, {})
    const notes = { ...s.notes, [n.id]: { ...n, groupId: null } }
    const groups = { ...s.groups }
    const dirty = clean()
    dirty.notes.push(n.id)
    normalizeGroups([n.groupId], notes, groups, dirty)
    return done({ ...s, notes, groups }, dirty)
  },

  'group.rename': (s, c) => {
    const g = s.groups[c.id]
    if (!g) return fail('not-found')
    return done({ ...s, groups: { ...s.groups, [g.id]: { ...g, title: c.title || null } } }, { groups: [g.id] })
  },

  'group.dissolve': (s, c) => {
    if (s.settings.locked) return fail('locked')
    if (!s.groups[c.id]) return fail('not-found')
    const notes = { ...s.notes }
    const groups = { ...s.groups }
    const dirty = clean()
    for (const n of Object.values(notes)) {
      if (n.groupId !== c.id) continue
      notes[n.id] = { ...n, groupId: null }
      dirty.notes.push(n.id)
    }
    Reflect.deleteProperty(groups, c.id)
    dirty.groups.push(c.id)
    return done({ ...s, notes, groups }, dirty)
  },

  'vote.toggle': (s, c, a) => {
    if (s.settings.locked) return fail('locked')
    const n = s.notes[c.id]
    if (!n) return fail('not-found')
    const has = n.voters.includes(a.cid)
    if (!has) {
      const used = Object.values(s.notes).filter((x) => x.voters.includes(a.cid)).length
      if (used >= s.settings.voteLimit) return fail('vote-limit')
    }
    const voters = has ? n.voters.filter((v) => v !== a.cid) : [...n.voters, a.cid]
    return done({ ...s, notes: { ...s.notes, [n.id]: { ...n, voters } } }, { notes: [n.id] })
  },

  'column.add': (s, c, _a, ctx) => {
    if (s.columns.length >= LIMITS.maxColumns) return fail('limit-reached')
    const col = { id: ctx.newId(), title: c.title, subtitle: c.subtitle ?? '', icon: c.icon ?? DEFAULT_COLUMN_ICON }
    return done({ ...s, columns: [...s.columns, col], settings: { ...s.settings, templateId: null } }, { meta: true })
  },

  'column.update': (s, c) => {
    const i = s.columns.findIndex((x) => x.id === c.id)
    if (i < 0) return fail('not-found')
    const col = s.columns[i]!
    const next = { ...col, title: c.title ?? col.title, subtitle: c.subtitle ?? col.subtitle, icon: c.icon ?? col.icon }
    const columns = s.columns.map((x, k) => (k === i ? next : x))
    return done({ ...s, columns, settings: { ...s.settings, templateId: null } }, { meta: true })
  },

  'column.delete': (s, c) => {
    if (!s.columns.some((x) => x.id === c.id)) return fail('not-found')
    if (s.columns.length <= 1) return fail('last-column')
    const notes = { ...s.notes }
    const groups = { ...s.groups }
    const dirty = clean()
    dirty.meta = true
    for (const n of Object.values(notes)) {
      if (n.columnId !== c.id) continue
      Reflect.deleteProperty(notes, n.id)
      dirty.notes.push(n.id)
    }
    for (const g of Object.values(groups)) {
      if (g.columnId !== c.id) continue
      Reflect.deleteProperty(groups, g.id)
      dirty.groups.push(g.id)
    }
    return done({
      ...s, notes, groups,
      columns: s.columns.filter((x) => x.id !== c.id),
      settings: { ...s.settings, templateId: null },
    }, dirty)
  },

  'column.move': (s, c) => {
    const from = s.columns.findIndex((x) => x.id === c.id)
    if (from < 0) return fail('not-found')
    const to = Math.min(c.toIndex, s.columns.length - 1)
    if (from === to) return done(s, {})
    const columns = [...s.columns]
    const [col] = columns.splice(from, 1)
    columns.splice(to, 0, col!)
    return done({ ...s, columns, settings: { ...s.settings, templateId: null } }, { meta: true })
  },

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
      themeId: c.themeId ?? s.settings.themeId,
    }
    return done({ ...s, settings }, { meta: true })
  },

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

export function reduce(state: BoardState, cmd: Command, actor: Actor, ctx: ReduceContext): Outcome {
  const handler = handlers[cmd.t] as Handler<typeof cmd.t>
  return handler(state, cmd as never, actor, ctx)
}
