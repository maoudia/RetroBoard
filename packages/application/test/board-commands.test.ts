import type { Command, Snapshot } from '@retroboard/domain'
import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type BoardChannel, createBoardCommands } from '../src'

function setup(opts: { online?: boolean } = {}) {
  const h = harness()
  const sent: Command[] = []
  const channel: BoardChannel = {
    connect() {}, updateIdentity() {}, close() {},
    send(cmd) {
      if (opts.online === false) return false
      sent.push(cmd)
      h.run(cmd)
      return true
    },
  }
  const view = (): Snapshot => buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
  const commands = createBoardCommands({ channel: () => channel, view })
  const col = h.state.columns[0]!.id
  return { h, sent, commands, col, view }
}

describe('board use cases', () => {
  it('publishes drafts in protocol-sized batches, keeping order', () => {
    const { commands, sent, col, view } = setup()
    const items = Array.from({ length: 65 }, (_, i) => ({ columnId: col, text: `idea ${i}` }))
    expect(commands.publish(items)).toEqual({ ok: true })
    expect(sent.map((c) => (c.t === 'note.addMany' ? c.items.length : 0))).toEqual([30, 30, 5])
    const first = sent[0]!
    expect(first.t === 'note.addMany' && first.items.map((i) => i.text).slice(0, 2)).toEqual(['idea 0', 'idea 1'])
    expect(view().notes).toHaveLength(65)
  })

  it('refuses writes on a locked board without sending', () => {
    const { commands, sent, col } = setup()
    commands.updateSettings({ locked: true })
    sent.length = 0
    expect(commands.publish([{ columnId: col, text: 'x' }])).toEqual({ ok: false, error: 'locked' })
    expect(commands.toggleVote('any')).toEqual({ ok: false, error: 'locked' })
    expect(sent).toHaveLength(0)
  })

  it('stops voting at the limit but always allows removing a vote', () => {
    const { commands, col, view } = setup()
    commands.publish([1, 2, 3, 4].map((i) => ({ columnId: col, text: `n${i}` })))
    const ids = view().notes.map((n) => n.id)
    for (const id of ids.slice(0, 3)) expect(commands.toggleVote(id).ok).toBe(true)
    expect(commands.toggleVote(ids[3]!)).toEqual({ ok: false, error: 'vote-limit' })
    expect(commands.toggleVote(ids[0]!).ok).toBe(true)
    expect(view().votesLeft).toBe(1)
  })

  it('keeps at least one column and at most the column limit', () => {
    const { commands, view } = setup()
    const cols = view().columns.map((c) => c.id)
    for (const id of cols.slice(1)) expect(commands.deleteColumn(id).ok).toBe(true)
    expect(commands.deleteColumn(cols[0]!)).toEqual({ ok: false, error: 'last-column' })
    for (let i = view().columns.length; i < 8; i++) commands.addColumn({ title: `c${i}` })
    expect(commands.addColumn({ title: 'one too many' })).toEqual({ ok: false, error: 'limit-reached' })
  })

  it('reports offline when the channel cannot send', () => {
    const { commands } = setup({ online: false })
    expect(commands.addAction('Fix CI', 'Bob')).toEqual({ ok: false, error: 'offline' })
  })

  it('ignores grouping a note onto itself', () => {
    const { commands, sent } = setup()
    expect(commands.groupNotes('a', 'a')).toEqual({ ok: true })
    expect(sent).toHaveLength(0)
  })
})
