import type { Command, Snapshot } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { type BoardChannel, createBoardCommands } from '../src'

const view = {
  settings: { locked: false, votingClosed: false, maxVotesPerItem: 2 }, columns: [{ id: 'c1' }, { id: 'c2' }],
  notes: [{ id: 'n1', votable: true, myVotes: 0 }], groups: [{ id: 'g1', votable: true, myVotes: 0 }], votesLeft: 3,
} as unknown as Snapshot

function recorder() {
  const sent: Command[] = []
  const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: (c) => (sent.push(c), true) }
  return { sent, commands: createBoardCommands({ channel: () => channel, view: () => view }) }
}

describe('every use case sends the matching protocol command', () => {
  const cases: [string, (c: ReturnType<typeof recorder>['commands']) => unknown, Command][] = [
    ['editNote', (c) => c.editNote('n1', 'text'), { t: 'note.edit', id: 'n1', text: 'text' }],
    ['deleteNote', (c) => c.deleteNote('n1'), { t: 'note.delete', id: 'n1' }],
    ['moveNote', (c) => c.moveNote('n1', 'c2'), { t: 'note.move', id: 'n1', columnId: 'c2' }],
    ['recolorNote', (c) => c.recolorNote('n1', 3), { t: 'note.color', id: 'n1', color: 3 }],
    ['groupNotes', (c) => c.groupNotes('n1', 'n2'), { t: 'note.group', id: 'n1', ontoId: 'n2' }],
    ['ungroupNote', (c) => c.ungroupNote('n1'), { t: 'note.ungroup', id: 'n1' }],
    ['renameGroup', (c) => c.renameGroup('g1', 'CI'), { t: 'group.rename', id: 'g1', title: 'CI' }],
    ['dissolveGroup', (c) => c.dissolveGroup('g1'), { t: 'group.dissolve', id: 'g1' }],
    ['toggleVote', (c) => c.toggleVote('n1'), { t: 'vote.add', kind: 'note', id: 'n1' }],
    ['addVote', (c) => c.addVote('cluster', 'g1'), { t: 'vote.add', kind: 'cluster', id: 'g1' }],
    ['removeVote', (c) => c.removeVote('note', 'n1'), { t: 'vote.remove', kind: 'note', id: 'n1' }],
    ['closeVoting', (c) => c.closeVoting(), { t: 'vote.close' }],
    ['setAgenda', (c) => c.setAgenda([{ kind: 'write', minutes: 5 }], { rules: false }), { t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }], rules: false }],
    ['agendaOptions', (c) => c.agendaOptions({ autoPublish: false }), { t: 'agenda.options', autoPublish: false }],
    ['clearAgenda', (c) => c.clearAgenda(), { t: 'agenda.clear' }],
    ['startAgenda', (c) => c.startAgenda(), { t: 'agenda.start' }],
    ['pauseAgenda', (c) => c.pauseAgenda(), { t: 'agenda.pause' }],
    ['nextPhase', (c) => c.nextPhase(), { t: 'agenda.next' }],
    ['extendPhase', (c) => c.extendPhase(3, true), { t: 'agenda.extend', minutes: 3, borrow: true }],
    ['endAgenda', (c) => c.endAgenda(), { t: 'agenda.end' }],
    ['setActionStatus', (c) => c.setActionStatus('a1', 'blocked'), { t: 'action.status', id: 'a1', status: 'blocked' }],
    ['updateAction', (c) => c.updateAction('a1', { owner: 'Ana' }), { t: 'action.update', id: 'a1', owner: 'Ana' }],
    ['importActions', (c) => c.importActions([{ text: 'x', owner: '', status: 'todo' }]), { t: 'action.import', items: [{ text: 'x', owner: '', status: 'todo' }] }],
    ['reopenVoting', (c) => c.reopenVoting(), { t: 'vote.reopen' }],
    ['addColumn', (c) => c.addColumn({ title: 'Q', icon: 'sparkles' }), { t: 'column.add', title: 'Q', icon: 'sparkles' }],
    ['updateColumn', (c) => c.updateColumn('c1', { title: 'R' }), { t: 'column.update', id: 'c1', title: 'R' }],
    ['deleteColumn', (c) => c.deleteColumn('c1'), { t: 'column.delete', id: 'c1' }],
    ['moveColumn', (c) => c.moveColumn('c1', 1), { t: 'column.move', id: 'c1', toIndex: 1 }],
    ['initBoard', (c) => c.initBoard({ templateId: 'daki', themeId: 'studio', title: 'T', locale: 'en' }), { t: 'board.init', openFacilitation: true, templateId: 'daki', themeId: 'studio', title: 'T', locale: 'en' }],
    ['applyTemplate', (c) => c.applyTemplate('daki', 'fr'), { t: 'template.apply', templateId: 'daki', wipe: true, locale: 'fr' }],
    ['updateSettings', (c) => c.updateSettings({ voteLimit: 5 }), { t: 'settings.update', voteLimit: 5 }],
    ['resetBoard', (c) => c.resetBoard(), { t: 'board.reset' }],
    ['addAction', (c) => c.addAction('Fix', 'Bob'), { t: 'action.add', text: 'Fix', owner: 'Bob' }],
    ['addAction with a source note', (c) => c.addAction('Fix', 'Bob', undefined, 'n1'), { t: 'action.add', text: 'Fix', owner: 'Bob', sourceNote: 'n1' }],
    ['setActionDone', (c) => c.setActionDone('a1', true), { t: 'action.toggle', id: 'a1', done: true }],
    ['deleteAction', (c) => c.deleteAction('a1'), { t: 'action.delete', id: 'a1' }],
    ['startTimer', (c) => c.startTimer(), { t: 'timer.start' }],
    ['pauseTimer', (c) => c.pauseTimer(), { t: 'timer.pause' }],
    ['resetTimer', (c) => c.resetTimer(10), { t: 'timer.reset', minutes: 10 }],
  ]
  it.each(cases)('%s', (_name, run, expected) => {
    const { sent, commands } = recorder()
    expect(run(commands)).toEqual({ ok: true })
    expect(sent).toEqual([expected])
  })

  it('reports offline when no channel is connected', () => {
    const commands = createBoardCommands({ channel: () => null, view: () => null })
    expect(commands.startTimer()).toEqual({ ok: false, error: 'offline' })
    expect(commands.publish([])).toEqual({ ok: true })
  })
})
