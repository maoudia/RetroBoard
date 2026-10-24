import * as v from 'valibot'
import { COLUMN_ICONS } from './icons'
import { LIMITS, NOTE_COLOR_COUNT } from './limits'

const Id = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{4,32}$/))
const Text = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.noteText))
const Color = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(NOTE_COLOR_COUNT - 1))
const Icon = v.picklist(COLUMN_ICONS)
const ColumnTitle = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.columnTitle))
const ColumnSubtitle = v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.columnSubtitle))

const NewNote = v.object({ columnId: Id, text: Text, color: v.optional(Color) })

export const CommandSchema = v.variant('t', [
  v.object({ t: v.literal('note.add'), columnId: Id, text: Text, color: v.optional(Color) }),
  v.object({
    t: v.literal('note.addMany'),
    items: v.pipe(v.array(NewNote), v.minLength(1), v.maxLength(LIMITS.maxBatch)),
  }),
  v.object({ t: v.literal('note.edit'), id: Id, text: Text }),
  v.object({ t: v.literal('note.delete'), id: Id }),
  v.object({ t: v.literal('note.move'), id: Id, columnId: Id }),
  v.object({ t: v.literal('note.color'), id: Id, color: Color }),
  v.object({ t: v.literal('note.group'), id: Id, ontoId: Id }),
  v.object({ t: v.literal('note.ungroup'), id: Id }),
  v.object({ t: v.literal('group.rename'), id: Id, title: v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.groupTitle)) }),
  v.object({ t: v.literal('group.dissolve'), id: Id }),
  v.object({ t: v.literal('vote.toggle'), id: Id }),
  v.object({ t: v.literal('column.add'), title: ColumnTitle, subtitle: v.optional(ColumnSubtitle), icon: v.optional(Icon) }),
  v.object({ t: v.literal('column.update'), id: Id, title: v.optional(ColumnTitle), subtitle: v.optional(ColumnSubtitle), icon: v.optional(Icon) }),
  v.object({ t: v.literal('column.delete'), id: Id }),
  v.object({ t: v.literal('column.move'), id: Id, toIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(LIMITS.maxColumns - 1)) }),
  v.object({
    t: v.literal('board.init'),
    templateId: v.pipe(v.string(), v.maxLength(40)),
    themeId: v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,24}$/)),
    title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.boardTitle))),
    locale: v.optional(v.picklist(['fr', 'en'])),
  }),
  v.object({ t: v.literal('template.apply'), templateId: v.pipe(v.string(), v.maxLength(40)), wipe: v.optional(v.boolean()), locale: v.optional(v.picklist(['fr', 'en'])) }),
  v.object({
    t: v.literal('settings.update'),
    title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.boardTitle))),
    voteLimit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(LIMITS.minVotes), v.maxValue(LIMITS.maxVotes))),
    secretVoting: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    themeId: v.optional(v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,24}$/))),
  }),
  v.object({
    t: v.literal('action.add'),
    text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.actionText)),
    owner: v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.actionOwner)),
  }),
  v.object({ t: v.literal('action.toggle'), id: Id, done: v.boolean() }),
  v.object({ t: v.literal('action.delete'), id: Id }),
  v.object({ t: v.literal('timer.start') }),
  v.object({ t: v.literal('timer.pause') }),
  v.object({ t: v.literal('timer.reset'), minutes: v.optional(v.picklist(LIMITS.timerMinutes)) }),
  v.object({ t: v.literal('board.reset') }),
])
export type Command = v.InferOutput<typeof CommandSchema>

export const HelloSchema = v.object({
  t: v.literal('hello'),
  cid: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{16,64}$/)),
  name: v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.displayName)),
  showName: v.boolean(),
})
export type Hello = v.InferOutput<typeof HelloSchema>

export const ROOM_ID_RE = /^[A-Za-z0-9_-]{22,64}$/

export type ClientMessage = Hello | Command

export function parseCommand(raw: unknown): Command | null {
  const r = v.safeParse(CommandSchema, raw)
  return r.success ? r.output : null
}
export function parseHello(raw: unknown): Hello | null {
  const r = v.safeParse(HelloSchema, raw)
  return r.success ? r.output : null
}
