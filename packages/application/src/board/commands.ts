import { type Command, type ErrorCode, LIMITS, type NewNote, type Snapshot, type TimerMinutes } from '@retroboard/domain'
import { err, ok, type Result } from '../result'
import type { BoardChannel } from '../ports'

/** Errors a board use case can return before or instead of reaching the room. */
export type BoardError = ErrorCode | 'offline'
export type BoardResult = Result<BoardError>

export interface BoardCommandDeps {
  /** Current channel, null when not connected. */
  channel(): BoardChannel | null
  /** Latest snapshot seen by this participant, null before the first one. */
  view(): Snapshot | null
}

export interface SettingsPatch { title?: string; voteLimit?: number; secretVoting?: boolean; locked?: boolean; browserAgentsAllowed?: boolean; openFacilitation?: boolean; themeId?: string }
export interface ColumnInput { title: string; subtitle?: string; icon?: Extract<Command, { t: 'column.add' }>['icon'] }

/**
 * Board use cases shared by the UI, browser agents (WebMCP) and tests.
 * They check what the participant can already know locally, then send the command;
 * the room (or every peer, later) remains the authority.
 */
export function createBoardCommands(deps: BoardCommandDeps) {
  const send = (cmd: Command): BoardResult => (deps.channel()?.send(cmd) ? ok() : err('offline'))
  const locked = () => deps.view()?.settings.locked ?? false
  const whenOpen = (cmd: Command): BoardResult => (locked() ? err('locked') : send(cmd))

  return {
    /** Publishes drafts in batches the protocol accepts; stops at the first failure. */
    publish(items: NewNote[]): BoardResult {
      if (locked()) return err('locked')
      for (let i = 0; i < items.length; i += LIMITS.maxBatch) {
        const sent = send({ t: 'note.addMany', items: items.slice(i, i + LIMITS.maxBatch) })
        if (!sent.ok) return sent
      }
      return ok()
    },
    editNote: (id: string, text: string) => whenOpen({ t: 'note.edit', id, text }),
    deleteNote: (id: string) => whenOpen({ t: 'note.delete', id }),
    moveNote: (id: string, columnId: string) => whenOpen({ t: 'note.move', id, columnId }),
    recolorNote: (id: string, color: number) => send({ t: 'note.color', id, color }),
    groupNotes: (id: string, ontoId: string) => (id === ontoId ? ok() : whenOpen({ t: 'note.group', id, ontoId })),
    ungroupNote: (id: string) => whenOpen({ t: 'note.ungroup', id }),
    renameGroup: (id: string, title: string) => send({ t: 'group.rename', id, title }),
    dissolveGroup: (id: string) => whenOpen({ t: 'group.dissolve', id }),

    toggleVote(noteId: string): BoardResult {
      const view = deps.view()
      if (locked()) return err('locked')
      const note = view?.notes.find((n) => n.id === noteId)
      if (view && note && !note.voted && view.votesLeft <= 0) return err('vote-limit')
      return send({ t: 'vote.toggle', id: noteId })
    },

    addColumn: (c: ColumnInput) => ((deps.view()?.columns.length ?? 0) >= LIMITS.maxColumns ? err('limit-reached') : send({ t: 'column.add', ...c })),
    updateColumn: (id: string, c: Partial<ColumnInput>) => send({ t: 'column.update', id, ...c }),
    deleteColumn: (id: string) => ((deps.view()?.columns.length ?? 2) <= 1 ? err('last-column') : send({ t: 'column.delete', id })),
    moveColumn: (id: string, toIndex: number) => send({ t: 'column.move', id, toIndex }),

    initBoard: (c: Omit<Extract<Command, { t: 'board.init' }>, 't'>) => send({ t: 'board.init', ...c }),
    applyTemplate: (templateId: string, locale?: 'fr' | 'en') => send({ t: 'template.apply', templateId, wipe: true, locale }),
    updateSettings: (patch: SettingsPatch) => send({ t: 'settings.update', ...patch }),
    resetBoard: () => send({ t: 'board.reset' }),

    addAction: (text: string, owner: string) => send({ t: 'action.add', text, owner }),
    setActionDone: (id: string, done: boolean) => send({ t: 'action.toggle', id, done }),
    deleteAction: (id: string) => send({ t: 'action.delete', id }),

    startTimer: () => send({ t: 'timer.start' }),
    pauseTimer: () => send({ t: 'timer.pause' }),
    resetTimer: (minutes?: TimerMinutes) => send({ t: 'timer.reset', minutes }),
  }
}

export type BoardCommands = ReturnType<typeof createBoardCommands>
