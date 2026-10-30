import type { ColumnIcon } from './icons'
import type { LIMITS } from './limits'

/**
 * Board commands as the domain understands them (already validated and normalised).
 * The wire schemas in @retroboard/protocol must produce exactly these shapes; a type test guards it.
 */
export type Locale = 'fr' | 'en'
export type TimerMinutes = (typeof LIMITS.timerMinutes)[number]
export type VotableKind = 'note' | 'cluster'
export type PhaseKindName = 'checkin' | 'review' | 'write' | 'group' | 'vote' | 'rank' | 'actions' | 'close'
export type ActionStatusName = 'todo' | 'doing' | 'done' | 'blocked' | 'dropped'
/** An action carried over from a previous retro (team profile, board file, JSON or CSV export). */
export interface ImportedAction { text: string; owner: string; status: ActionStatusName; due?: string; from?: string }
export interface NewNote { columnId: string; text: string; color?: number }

export type Command =
  | { t: 'note.add'; columnId: string; text: string; color?: number }
  | { t: 'note.addMany'; items: NewNote[] }
  | { t: 'note.edit'; id: string; text: string }
  | { t: 'note.delete'; id: string }
  | { t: 'note.move'; id: string; columnId: string }
  | { t: 'note.color'; id: string; color: number }
  | { t: 'note.group'; id: string; ontoId: string }
  | { t: 'note.ungroup'; id: string }
  | { t: 'group.rename'; id: string; title: string }
  | { t: 'group.dissolve'; id: string }
  | { t: 'group.merge'; id: string; ontoId: string }
  | { t: 'group.move'; id: string; columnId: string }
  | { t: 'vote.toggle'; id: string }
  | { t: 'vote.add'; kind: VotableKind; id: string }
  | { t: 'vote.remove'; kind: VotableKind; id: string }
  | { t: 'drafts.reveal'; seconds?: number }
  | { t: 'vote.close' }
  | { t: 'vote.reopen' }
  | { t: 'column.add'; title: string; subtitle?: string; icon?: ColumnIcon; color?: number }
  | { t: 'column.update'; id: string; title?: string; subtitle?: string; icon?: ColumnIcon; color?: number }
  | { t: 'column.delete'; id: string }
  | { t: 'column.move'; id: string; toIndex: number }
  | { t: 'board.init'; templateId: string; themeId: string; title?: string; locale?: Locale; openFacilitation?: boolean }
  /** `wipe: true` is the older spelling of mode `wipe`; `migrate` keeps notes, clusters and votes (change board-type-migration). */
  | { t: 'template.apply'; templateId: string; wipe?: boolean; mode?: 'wipe' | 'migrate'; locale?: Locale }
  | { t: 'settings.update'; title?: string; voteLimit?: number; maxVotesPerItem?: number; votable?: 'notes' | 'clusters' | 'both'; secretVoting?: boolean; locked?: boolean; browserAgentsAllowed?: boolean; openFacilitation?: boolean; actionMode?: 'checkbox' | 'workflow'; themeId?: string; talkMode?: 'off' | 'ring' | 'popup'; talkBudgetSec?: number; talkSelfStart?: boolean; noteMaxLength?: number }
  | { t: 'action.add'; text: string; owner: string; due?: string; sourceNote?: string }
  | { t: 'action.update'; id: string; text?: string; owner?: string; due?: string | null }
  | { t: 'action.status'; id: string; status: ActionStatusName }
  | { t: 'action.import'; items: ImportedAction[] }
  | { t: 'action.toggle'; id: string; done: boolean }
  | { t: 'action.delete'; id: string }
  | { t: 'timer.start' }
  | { t: 'timer.pause' }
  | { t: 'timer.reset'; minutes?: TimerMinutes; agendaClock?: boolean }
  | { t: 'board.reset' }
  | { t: 'board.destroy' }
  | { t: 'column.reset'; id: string }
  | { t: 'vote.reset' }
  | { t: 'roti.set'; score: number }
  | { t: 'talk.assign'; speaker: string; label: string | null }
  | { t: 'talk.end' }
  | { t: 'talk.self' }
  | { t: 'talk.done' }
  | { t: 'agenda.set'; phases: { kind: PhaseKindName; minutes: number }[]; rules?: boolean; autoPublish?: boolean }
  | { t: 'agenda.options'; rules?: boolean; autoPublish?: boolean }
  | { t: 'agenda.clear' }
  | { t: 'agenda.voteOpen'; on: boolean }
  | { t: 'agenda.toClose' }
  | { t: 'agenda.start' }
  | { t: 'agenda.pause' }
  | { t: 'agenda.next' }
  | { t: 'agenda.prev' }
  | { t: 'agenda.extend'; minutes: number; borrow: boolean }
  | { t: 'agenda.end' }

export type CommandType = Command['t']
