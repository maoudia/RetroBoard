/** Wire format of RetroBoard v1 (plaintext commands): valibot schemas for every message that crosses the network. */
import * as v from 'valibot'
import { COLUMN_ICONS, type Command, LIMITS, NOTE_COLOR_COUNT, NOTE_TEXT_MIN, TALK_BUDGET_MAX_S, TALK_BUDGET_MIN_S } from '@retroboard/domain'

const Id = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{4,32}$/))
const Text = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.noteText))
const Color = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(NOTE_COLOR_COUNT - 1))
const Icon = v.picklist(COLUMN_ICONS)
const ColumnTitle = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.columnTitle))
const ColumnSubtitle = v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.columnSubtitle))

const ActionText = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.actionText))
const ActionOwner = v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.actionOwner))
const ActionStatus = v.picklist(['todo', 'doing', 'done', 'blocked', 'dropped'])
/** Calendar date, YYYY-MM-DD, and a real one (no 2026-02-31). */
const DueDate = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/), v.check((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d)))

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
  v.object({ t: v.literal('note.freeze'), id: Id }),
  v.object({ t: v.literal('note.unfreeze'), id: Id }),
  v.object({ t: v.literal('group.rename'), id: Id, title: v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.groupTitle)) }),
  v.object({ t: v.literal('group.dissolve'), id: Id }),
  v.object({ t: v.literal('group.merge'), id: Id, ontoId: Id }),
  v.object({ t: v.literal('group.move'), id: Id, columnId: Id }),
  v.object({ t: v.literal('vote.toggle'), id: Id }),
  v.object({ t: v.literal('vote.add'), kind: v.picklist(['note', 'cluster']), id: Id }),
  v.object({ t: v.literal('vote.remove'), kind: v.picklist(['note', 'cluster']), id: Id }),
  v.object({ t: v.literal('drafts.reveal'), seconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(30))) }),
  v.object({ t: v.literal('roti.set'), score: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)) }),
  v.object({ t: v.literal('vote.close') }),
  v.object({ t: v.literal('vote.reopen') }),
  v.object({ t: v.literal('column.add'), title: ColumnTitle, subtitle: v.optional(ColumnSubtitle), icon: v.optional(Icon), color: v.optional(Color) }),
  v.object({ t: v.literal('column.update'), id: Id, title: v.optional(ColumnTitle), subtitle: v.optional(ColumnSubtitle), icon: v.optional(Icon), color: v.optional(Color) }),
  v.object({ t: v.literal('column.delete'), id: Id }),
  v.object({ t: v.literal('column.hide'), id: Id }),
  v.object({ t: v.literal('column.show'), id: v.nullable(Id) }),
  v.object({ t: v.literal('column.move'), id: Id, toIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(LIMITS.maxColumns - 1)) }),
  v.object({
    t: v.literal('board.init'),
    templateId: v.pipe(v.string(), v.maxLength(40)),
    themeId: v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,24}$/)),
    title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.boardTitle))),
    locale: v.optional(v.picklist(['fr', 'en'])),
    openFacilitation: v.optional(v.boolean()),
  }),
  v.object({ t: v.literal('template.apply'), templateId: v.pipe(v.string(), v.maxLength(40)), wipe: v.optional(v.boolean()), mode: v.optional(v.picklist(['wipe', 'migrate'])), locale: v.optional(v.picklist(['fr', 'en'])) }),
  v.object({
    t: v.literal('settings.update'),
    title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LIMITS.boardTitle))),
    voteLimit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(LIMITS.minVotes), v.maxValue(LIMITS.maxVotes))),
    maxVotesPerItem: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(LIMITS.maxVotes))),
    votable: v.optional(v.picklist(['notes', 'clusters', 'both'])),
    secretVoting: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    browserAgentsAllowed: v.optional(v.boolean()),
    openFacilitation: v.optional(v.boolean()),
    actionMode: v.optional(v.picklist(['checkbox', 'workflow'])),
    themeId: v.optional(v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,24}$/))),
    talkMode: v.optional(v.picklist(['off', 'ring', 'popup'])),
    talkBudgetSec: v.optional(v.pipe(v.number(), v.integer(), v.minValue(TALK_BUDGET_MIN_S), v.maxValue(TALK_BUDGET_MAX_S))),
    talkSelfStart: v.optional(v.boolean()),
    noteMaxLength: v.optional(v.pipe(v.number(), v.integer(), v.minValue(NOTE_TEXT_MIN), v.maxValue(LIMITS.noteText))),
  }),
  v.object({ t: v.literal('talk.assign'), speaker: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{8,64}$/)), label: v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.displayName))) }),
  v.object({ t: v.literal('talk.end') }),
  v.object({ t: v.literal('talk.self') }),
  v.object({ t: v.literal('talk.done') }),
  v.object({ t: v.literal('action.add'), text: ActionText, owner: ActionOwner, due: v.optional(DueDate), sourceNote: v.optional(Id) }),
  v.object({ t: v.literal('action.update'), id: Id, text: v.optional(ActionText), owner: v.optional(ActionOwner), due: v.optional(v.nullable(DueDate)) }),
  v.object({ t: v.literal('action.status'), id: Id, status: ActionStatus }),
  v.object({
    t: v.literal('action.import'),
    items: v.pipe(v.array(v.object({
      text: ActionText, owner: ActionOwner, status: ActionStatus, due: v.optional(DueDate),
      from: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(LIMITS.boardTitle))),
    })), v.minLength(1), v.maxLength(LIMITS.maxImport)),
  }),
  v.object({ t: v.literal('action.toggle'), id: Id, done: v.boolean() }),
  v.object({ t: v.literal('action.delete'), id: Id }),
  v.object({ t: v.literal('timer.start') }),
  v.object({ t: v.literal('timer.pause') }),
  v.object({ t: v.literal('timer.reset'), minutes: v.optional(v.picklist(LIMITS.timerMinutes)), agendaClock: v.optional(v.boolean()) }),
  v.object({ t: v.literal('board.reset') }),
  v.object({ t: v.literal('board.destroy') }),
  v.object({ t: v.literal('column.reset'), id: Id }),
  v.object({ t: v.literal('vote.reset') }),
  v.object({
    t: v.literal('agenda.set'),
    phases: v.pipe(v.array(v.object({
      kind: v.picklist(['checkin', 'review', 'write', 'group', 'vote', 'rank', 'actions', 'close']),
      minutes: v.pipe(v.number(), v.minValue(1), v.maxValue(LIMITS.maxPhaseMinutes)),
    })), v.minLength(1), v.maxLength(LIMITS.maxPhases)),
    rules: v.optional(v.boolean()),
    autoPublish: v.optional(v.boolean()),
  }),
  v.object({ t: v.literal('agenda.options'), rules: v.optional(v.boolean()), autoPublish: v.optional(v.boolean()) }),
  v.object({ t: v.literal('agenda.clear') }),
  v.object({ t: v.literal('agenda.voteOpen'), on: v.boolean() }),
  v.object({ t: v.literal('agenda.toClose') }),
  v.object({ t: v.literal('agenda.start') }),
  v.object({ t: v.literal('agenda.pause') }),
  v.object({ t: v.literal('agenda.next') }),
  v.object({ t: v.literal('agenda.prev') }),
  v.object({ t: v.literal('agenda.extend'), minutes: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(30)), borrow: v.boolean() }),
  v.object({ t: v.literal('agenda.end') }),
])
export type { Command }

// Compile-time guard: the wire schema and the domain command type must describe the same shapes.
type Parsed = v.InferOutput<typeof CommandSchema>
const _schemaMatchesDomain: (p: Parsed) => Command = (p) => p
const _domainMatchesSchema: (c: Command) => Parsed = (c) => c
void _schemaMatchesDomain
void _domainMatchesSchema

export { ROOM_ID_RE } from '@retroboard/domain'

export function parseCommand(raw: unknown): Command | null {
  const r = v.safeParse(CommandSchema, raw)
  return r.success ? r.output : null
}
