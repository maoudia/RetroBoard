import { DEFAULT_COLUMN_ICON } from '../shared/icons'
import { DEFAULT_NOTE_MAX_LENGTH, LIMITS, NOTE_COLOR_COUNT } from '../shared/limits'
import { clean, done, fail, type HandlerMap, noteCount } from '../shared/outcome'
import { makeNote, normalizeGroups } from './notes'

type IdeationCommand = 'note.add' | 'note.addMany' | 'note.edit' | 'note.delete' | 'note.move' | 'note.color'
  | 'note.group' | 'note.ungroup' | 'group.rename' | 'group.recolor' | 'group.dissolve' | 'group.merge' | 'group.move'
  | 'column.add' | 'column.hide' | 'column.show' | 'column.update' | 'column.delete' | 'column.move'

/** A peer that ignores the board's note length limit is refused by everyone. */
const tooLong = (s: { settings: { noteMaxLength?: number } }, text: string) => text.length > (s.settings.noteMaxLength ?? DEFAULT_NOTE_MAX_LENGTH)
const validColor = (n: number) => Number.isInteger(n) && n >= 0 && n < NOTE_COLOR_COUNT

/** Ideation context: notes, groups (clusters) and columns. */
export const ideationHandlers: HandlerMap<IdeationCommand> = {
  'note.add': (s, c, a, ctx) => {
    if (s.settings.locked) return fail('locked')
    if (!s.columns.some((x) => x.id === c.columnId)) return fail('not-found')
    if (tooLong(s, c.text)) return fail('invalid')
    if (noteCount(s) >= LIMITS.maxNotes) return fail('limit-reached')
    const n = makeNote(a, ctx, c.columnId, c.text, c.color ?? s.columns.find((x) => x.id === c.columnId)?.color)
    return done({ ...s, notes: { ...s.notes, [n.id]: n } }, { notes: [n.id] })
  },

  'note.addMany': (s, c, a, ctx) => {
    if (s.settings.locked) return fail('locked')
    if (noteCount(s) + c.items.length > LIMITS.maxNotes) return fail('limit-reached')
    if (c.items.some((i) => !s.columns.some((x) => x.id === i.columnId))) return fail('not-found')
    if (c.items.some((i) => tooLong(s, i.text))) return fail('invalid')
    const notes = { ...s.notes }
    const ids: string[] = []
    for (const [index, i] of c.items.entries()) {
      const n = makeNote(a, ctx, i.columnId, i.text, i.color ?? s.columns.find((x) => x.id === i.columnId)?.color, index)
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
    if (tooLong(s, c.text)) return fail('invalid')
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
      groups[gid] = { id: gid, columnId: b.columnId, title: null, voters: [] }
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

  /** Merges cluster `id` into `ontoId` (same column): notes and votes move, the target keeps its title. */
  'group.merge': (s, c) => {
    if (s.settings.locked) return fail('locked')
    const from = s.groups[c.id]
    const onto = s.groups[c.ontoId]
    if (!from || !onto) return fail('not-found')
    if (from.id === onto.id) return done(s, {})
    if (from.columnId !== onto.columnId) return fail('same-column-required')
    const notes = { ...s.notes }
    const moved: string[] = []
    for (const n of Object.values(notes)) {
      if (n.groupId !== from.id) continue
      notes[n.id] = { ...n, groupId: onto.id }
      moved.push(n.id)
    }
    const groups = { ...s.groups, [onto.id]: { ...onto, voters: [...onto.voters, ...from.voters] } }
    Reflect.deleteProperty(groups, from.id)
    return done({ ...s, notes, groups }, { notes: moved, groups: [onto.id, from.id] })
  },

  /** Moves a whole cluster (its notes, title, votes) to another column. Locked board and unknown ids are refused. */
  'group.move': (s, c) => {
    if (s.settings.locked) return fail('locked')
    const g = s.groups[c.id]
    if (!g || !s.columns.some((x) => x.id === c.columnId)) return fail('not-found')
    if (g.columnId === c.columnId) return done(s, {})
    const notes = { ...s.notes }
    const moved: string[] = []
    for (const n of Object.values(notes)) {
      if (n.groupId !== g.id) continue
      notes[n.id] = { ...n, columnId: c.columnId }
      moved.push(n.id)
    }
    return done({ ...s, notes, groups: { ...s.groups, [g.id]: { ...g, columnId: c.columnId } } }, { notes: moved, groups: [g.id] })
  },

  'group.rename': (s, c) => {
    const g = s.groups[c.id]
    if (!g) return fail('not-found')
    return done({ ...s, groups: { ...s.groups, [g.id]: { ...g, title: c.title || null } } }, { groups: [g.id] })
  },

  // One command recolours every note of the cluster (change composer-and-colour-v3); a frozen note keeps its colour.
  'group.recolor': (s, c) => {
    const g = s.groups[c.id]
    if (!g || !validColor(c.color)) return fail('not-found')
    const notes = { ...s.notes }
    const ids: string[] = []
    for (const n of Object.values(s.notes)) {
      if (n.groupId !== g.id || n.frozen) continue
      notes[n.id] = { ...n, color: c.color }
      ids.push(n.id)
    }
    return done({ ...s, notes }, { notes: ids })
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

  'column.add': (s, c, _a, ctx) => {
    if (s.columns.length >= LIMITS.maxColumns) return fail('limit-reached')
    if (c.color !== undefined && !validColor(c.color)) return fail('invalid')
    const col = { id: ctx.newId(), title: c.title, subtitle: c.subtitle ?? '', icon: c.icon ?? DEFAULT_COLUMN_ICON, ...(c.color === undefined ? {} : { color: c.color }), ...(c.votable === false ? { votable: false } : {}) }
    return done({ ...s, columns: [...s.columns, col], settings: { ...s.settings, templateId: null } }, { meta: true })
  },

  /** A hidden column keeps its notes, votes and actions; it only leaves the board (change column-visibility). */
  'column.hide': (s, c) => {
    const col = s.columns.find((x) => x.id === c.id)
    if (!col) return fail('not-found')
    if (col.hidden) return done(s, {})
    // The board always keeps one column on screen.
    if (s.columns.filter((x) => !x.hidden).length <= 1) return fail('last-column')
    return done({ ...s, columns: s.columns.map((x) => (x.id === c.id ? { ...x, hidden: true } : x)) }, { meta: true })
  },

  /** `id: null` shows every hidden column ("Show all"). */
  'column.show': (s, c) => {
    if (c.id !== null && !s.columns.some((x) => x.id === c.id)) return fail('not-found')
    const shown = (x: (typeof s.columns)[number]) => { const { hidden: _h, ...rest } = x; return rest }
    if (!s.columns.some((x) => x.hidden && (c.id === null || x.id === c.id))) return done(s, {})
    return done({ ...s, columns: s.columns.map((x) => (x.hidden && (c.id === null || x.id === c.id) ? shown(x) : x)) }, { meta: true })
  },

  'column.update': (s, c) => {
    const i = s.columns.findIndex((x) => x.id === c.id)
    if (i < 0) return fail('not-found')
    if (c.color !== undefined && !validColor(c.color)) return fail('invalid')
    const col = s.columns[i]!
    const { votable: was, ...rest } = col
    const votable = c.votable ?? was
    const next = { ...rest, title: c.title ?? col.title, subtitle: c.subtitle ?? col.subtitle, icon: c.icon ?? col.icon, ...(c.color === undefined ? {} : { color: c.color }), ...(votable === false ? { votable: false } : {}) }
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
}
