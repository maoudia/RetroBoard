import type { ColumnIcon } from './icons'
import type { LIMITS } from './limits'

/**
 * Board commands as the domain understands them (already validated and normalised).
 * The wire schemas in @retroboard/protocol must produce exactly these shapes; a type test guards it.
 */
export type Locale = 'fr' | 'en'
export type TimerMinutes = (typeof LIMITS.timerMinutes)[number]
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
  | { t: 'vote.toggle'; id: string }
  | { t: 'column.add'; title: string; subtitle?: string; icon?: ColumnIcon }
  | { t: 'column.update'; id: string; title?: string; subtitle?: string; icon?: ColumnIcon }
  | { t: 'column.delete'; id: string }
  | { t: 'column.move'; id: string; toIndex: number }
  | { t: 'board.init'; templateId: string; themeId: string; title?: string; locale?: Locale }
  | { t: 'template.apply'; templateId: string; wipe?: boolean; locale?: Locale }
  | { t: 'settings.update'; title?: string; voteLimit?: number; secretVoting?: boolean; locked?: boolean; themeId?: string }
  | { t: 'action.add'; text: string; owner: string }
  | { t: 'action.toggle'; id: string; done: boolean }
  | { t: 'action.delete'; id: string }
  | { t: 'timer.start' }
  | { t: 'timer.pause' }
  | { t: 'timer.reset'; minutes?: TimerMinutes }
  | { t: 'board.reset' }

export type CommandType = Command['t']
