import { type ActionStatusName, type Command, type PhaseKindName, type ErrorCode, type ImportedAction, LIMITS, type NewNote, type Snapshot, type TimerMinutes, type VotableKind } from '@retroboard/domain'
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

export interface SettingsPatch { title?: string; voteLimit?: number; maxVotesPerItem?: number; actionMode?: 'checkbox' | 'workflow'; votable?: 'notes' | 'clusters' | 'both'; secretVoting?: boolean; locked?: boolean; browserAgentsAllowed?: boolean; openFacilitation?: boolean; themeId?: string; talkMode?: 'off' | 'ring' | 'popup'; talkBudgetSec?: number; talkSelfStart?: boolean; noteMaxLength?: number }
export interface ColumnInput { title: string; subtitle?: string; icon?: Extract<Command, { t: 'column.add' }>['icon']; color?: number }

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
    freeze: (id: string) => send({ t: 'note.freeze', id }),
    pin: (id: string) => send({ t: 'note.pin', id }),
    unpin: (id: string) => send({ t: 'note.unpin', id }),
    unfreeze: (id: string) => send({ t: 'note.unfreeze', id }),
    renameGroup: (id: string, title: string) => send({ t: 'group.rename', id, title }),
    dissolveGroup: (id: string) => whenOpen({ t: 'group.dissolve', id }),
    moveGroup: (id: string, columnId: string) => whenOpen({ t: 'group.move', id, columnId }),
    mergeGroups: (id: string, ontoId: string) => (id === ontoId ? ok() : whenOpen({ t: 'group.merge', id, ontoId })),

    /** Adds one vote, checking locally what the participant can already know (budget, cap, phase). */
    addVote(kind: VotableKind, id: string): BoardResult {
      const view = deps.view()
      if (locked()) return err('locked')
      if (view?.settings.votingClosed) return err('voting-closed')
      const item = kind === 'note' ? view?.notes.find((n) => n.id === id) : view?.groups.find((g) => g.id === id)
      if (view && !item) return err('not-found')
      if (item && !item.votable) return err('not-votable')
      if (view && view.votesLeft <= 0) return err('vote-limit')
      if (view && item && item.myVotes >= view.settings.maxVotesPerItem) return err('item-limit')
      return send({ t: 'vote.add', kind, id })
    },
    /** Takes back one of my votes (undo) while voting is open. */
    removeVote(kind: VotableKind, id: string): BoardResult {
      const view = deps.view()
      if (locked()) return err('locked')
      if (view?.settings.votingClosed) return err('voting-closed')
      return send({ t: 'vote.remove', kind, id })
    },
    /** One vote on a note, on or off (agents and the simple one-vote-per-item mode). */
    toggleVote(noteId: string): BoardResult {
      const note = deps.view()?.notes.find((n) => n.id === noteId)
      return note && note.myVotes > 0 ? this.removeVote('note', noteId) : this.addVote('note', noteId)
    },
    /** Talk time: give the floor (facilitator), take it or give it back (participant). */
    giveFloor: (speaker: string, label: string | null) => (deps.view()?.settings.talkMode === 'off' ? err('invalid') : send({ t: 'talk.assign', speaker, label })),
    endTurn: () => send({ t: 'talk.end' }),
    takeFloor(): BoardResult {
      const s = deps.view()?.settings
      if (s && (s.talkMode === 'off' || !s.talkSelfStart)) return err('forbidden')
      return send({ t: 'talk.self' })
    },
    giveBackFloor: () => send({ t: 'talk.done' }),
    revealDrafts: (seconds?: number) => send({ t: 'drafts.reveal', ...(seconds ? { seconds } : {}) }),
    setRoti: (score: number) => send({ t: 'roti.set', score }),
    closeVoting: () => send({ t: 'vote.close' }),
    reopenVoting: () => send({ t: 'vote.reopen' }),
    openVotingNow: (on = true) => send({ t: 'agenda.voteOpen', on }),
    goToClosing: () => send({ t: 'agenda.toClose' }),

    addColumn: (c: ColumnInput) => ((deps.view()?.columns.length ?? 0) >= LIMITS.maxColumns ? err('limit-reached') : send({ t: 'column.add', ...c })),
    updateColumn: (id: string, c: Partial<ColumnInput>) => send({ t: 'column.update', id, ...c }),
    deleteColumn: (id: string) => ((deps.view()?.columns.length ?? 2) <= 1 ? err('last-column') : send({ t: 'column.delete', id })),
    hideColumn: (id: string) => send({ t: 'column.hide', id }),
    showColumn: (id: string | null) => send({ t: 'column.show', id }),
    moveColumn: (id: string, toIndex: number) => send({ t: 'column.move', id, toIndex }),

    initBoard: (c: Omit<Extract<Command, { t: 'board.init' }>, 't'>) => send({ t: 'board.init', openFacilitation: true, ...c }), // "Everyone facilitates" unless the setup says otherwise
    // `wipe: true` stays for peers that predate `mode`; migrate is refused by them (not-empty), never destructive.
    applyTemplate: (templateId: string, locale?: 'fr' | 'en', mode: 'wipe' | 'migrate' = 'wipe') => send(mode === 'wipe' ? { t: 'template.apply', templateId, wipe: true, locale } : { t: 'template.apply', templateId, mode, locale }),
    updateSettings: (patch: SettingsPatch) => send({ t: 'settings.update', ...patch }),
    resetBoard: () => send({ t: 'board.reset' }),
    destroyBoard: () => send({ t: 'board.destroy' }),

    addAction: (text: string, owner: string, due?: string, sourceNote?: string) => send({ t: 'action.add', text, owner, ...(due ? { due } : {}), ...(sourceNote ? { sourceNote } : {}) }),
    updateAction: (id: string, patch: { text?: string; owner?: string; due?: string | null }) => send({ t: 'action.update', id, ...patch }),
    setActionStatus: (id: string, status: ActionStatusName) => send({ t: 'action.status', id, status }),
    importActions: (items: ImportedAction[]) => (items.length ? send({ t: 'action.import', items: items.slice(0, LIMITS.maxImport) }) : ok()),
    setActionDone: (id: string, done: boolean) => send({ t: 'action.toggle', id, done }),
    deleteAction: (id: string) => send({ t: 'action.delete', id }),

    setAgenda: (phases: { kind: PhaseKindName; minutes: number }[], opts: { rules?: boolean; autoPublish?: boolean } = {}) =>
      send({ t: 'agenda.set', phases: phases.slice(0, LIMITS.maxPhases), ...opts }),
    agendaOptions: (opts: { rules?: boolean; autoPublish?: boolean }) => send({ t: 'agenda.options', ...opts }),
    clearAgenda: () => send({ t: 'agenda.clear' }),
    startAgenda: () => send({ t: 'agenda.start' }),
    pauseAgenda: () => send({ t: 'agenda.pause' }),
    nextPhase: () => send({ t: 'agenda.next' }),
    previousPhase: () => send({ t: 'agenda.prev' }),
    extendPhase: (minutes: number, borrow: boolean) => send({ t: 'agenda.extend', minutes, borrow }),
    endAgenda: () => send({ t: 'agenda.end' }),

    startTimer: () => send({ t: 'timer.start' }),
    pauseTimer: () => send({ t: 'timer.pause' }),
    resetTimer: (minutes?: TimerMinutes, agendaClock?: boolean) => send({ t: 'timer.reset', minutes, agendaClock }),
    resetColumn: (id: string) => send({ t: 'column.reset', id }),
    resetVotes: () => send({ t: 'vote.reset' }),
  }
}

export type BoardCommands = ReturnType<typeof createBoardCommands>
