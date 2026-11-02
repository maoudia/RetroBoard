import type { Command, Snapshot } from '@retroboard/domain'
import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type AgentTool, type BoardChannel, createBoardAgentTools, createBoardCommands, type DraftsPort, UNTRUSTED_NOTICE } from '../src'

function setup(opts: { loaded?: boolean } = {}) {
  const h = harness()
  const channel: BoardChannel = { connect() {}, updateIdentity() {}, close() {}, send: (c: Command) => (h.run(c), true) }
  const view = (): Snapshot | null => (opts.loaded === false ? null : buildSnapshot(h.state, { cid: alice.cid }, [], h.now))
  const commands = createBoardCommands({ channel: () => channel, view: () => buildSnapshot(h.state, { cid: alice.cid }, [], h.now) })
  let seq = 0
  const store: { id: string; columnId: string; text: string }[] = []
  const drafts: DraftsPort = {
    list: () => [...store],
    add: (columnId, text) => { if (text === 'FULL') return null; const id = `d${++seq}`; store.push({ id, columnId, text }); return id },
    publish: (ids) => {
      const list = store.filter((d) => !ids || ids.includes(d.id))
      const r = commands.publish(list.map(({ columnId, text }) => ({ columnId, text })))
      if (r.ok) for (const d of list) store.splice(store.indexOf(d), 1)
      return r
    },
  }
  const tools = createBoardAgentTools({ view, commands, drafts, exportMarkdown: () => '# md', now: () => h.now })
  const tool = (name: string) => tools.find((t) => t.name === name) as AgentTool<Record<string, unknown>>
  const add = (text: string, col = 0) => { const out = h.run({ t: 'note.add', columnId: h.col(col), text }); return out.ok ? out.dirty.notes[0]! : '' }
  return { h, tools, tool, add, store }
}

describe('board agent tools: contract', () => {
  it('lists the nine tools in a stable order with the right read-only flags and confirmations', () => {
    const { tools } = setup()
    expect(tools.map((t) => [t.name, t.readOnly, typeof t.confirm])).toEqual([
      ['retro_get_board', true, 'undefined'],
      ['retro_list_ideas', true, 'undefined'],
      ['retro_list_actions', true, 'undefined'],
      ['retro_list_drafts', true, 'undefined'],
      ['retro_write_draft', false, 'undefined'],
      ['retro_publish_drafts', false, 'function'],
      ['retro_vote', false, 'function'],
      ['retro_propose_action', false, 'function'],
      ['retro_export_markdown', true, 'undefined'],
    ])
    for (const t of tools) {
      expect(t.title.length).toBeGreaterThan(3)
      expect(t.description.length).toBeGreaterThan(20)
      expect(t.inputSchema).toMatchObject({ type: 'object', additionalProperties: false })
    }
  })

  it('declares the required inputs of the writing tools', () => {
    const { tool } = setup()
    const req = (n: string) => (tool(n).inputSchema as { required?: string[] }).required
    expect(req('retro_write_draft')).toEqual(['columnId', 'text'])
    expect(req('retro_vote')).toEqual(['ideaId'])
    expect(req('retro_propose_action')).toEqual(['text'])
    expect(req('retro_publish_drafts')).toBeUndefined()
  })

  it('every tool that reads the board says so when it is not loaded; drafts do not need it', async () => {
    const { tool } = setup({ loaded: false })
    for (const n of ['retro_get_board', 'retro_list_ideas', 'retro_list_actions', 'retro_export_markdown']) {
      expect(await tool(n).run({})).toEqual({ ok: false, error: 'The board is not loaded yet.' })
    }
    expect(await tool('retro_write_draft').run({ columnId: 'x', text: 'y' })).toEqual({ ok: false, error: 'The board is not loaded yet.' })
    expect(await tool('retro_list_drafts').run({})).toEqual({ ok: true, data: { notice: UNTRUSTED_NOTICE, drafts: [] } })
    expect(tool('retro_vote').confirm!({ ideaId: 'x' })).toBeNull()
    expect(await tool('retro_vote').run({ ideaId: 'x' })).toEqual({ ok: false, error: 'Unknown idea. Use retro_list_ideas.' })
  })
})

describe('retro_get_board', () => {
  it('summarises the board: settings, columns with idea counts, participants, actions and timer', async () => {
    const { h, tool, add } = setup()
    add('one')
    add('two')
    add('three', 1)
    h.run({ t: 'action.add', text: 'ship', owner: '' })
    const out = await tool('retro_get_board').run({})
    expect(out.ok).toBe(true)
    const d = (out.ok ? out.data : {}) as Record<string, unknown> & { columns: { id: string; title: string; subtitle: string; ideas: number }[] }
    expect(d).toMatchObject({
      notice: UNTRUSTED_NOTICE, title: h.state.settings.title, themeId: h.state.settings.themeId, locked: false,
      voteLimit: h.state.settings.voteLimit, votesLeft: h.state.settings.voteLimit, countsHidden: false, votingClosed: false, actions: 1,
    })
    expect(d.columns.map((c) => c.ideas)).toEqual(h.state.columns.map((_c, i) => (i === 0 ? 2 : i === 1 ? 1 : 0)))
    expect(d.columns[0]).toMatchObject({ id: h.col(0), title: h.state.columns[0]!.title, subtitle: h.state.columns[0]!.subtitle })
    expect(typeof d.participants).toBe('number')
  })

  it('counts are hidden only while secret voting is on and voting is open', async () => {
    const { h, tool } = setup()
    const hidden = async () => ((await tool('retro_get_board').run({})) as { data: { countsHidden: boolean } }).data.countsHidden
    h.run({ t: 'settings.update', secretVoting: true })
    expect(await hidden()).toBe(true)
    h.run({ t: 'vote.close' })
    expect(await hidden()).toBe(false)
  })

  it('reports the lock and the timer: paused time as stored, running time against the clock, never negative', async () => {
    const { h, tool } = setup()
    h.run({ t: 'settings.update', locked: true })
    const idle = (await tool('retro_get_board').run({})) as { data: { locked: boolean; timer: { running: boolean; remainingSeconds: number } } }
    expect(idle.data.locked).toBe(true)
    expect(idle.data.timer.running).toBe(false)
    expect(idle.data.timer.remainingSeconds).toBe(Math.ceil(h.state.timer.remaining / 1000))
    h.run({ t: 'timer.start' })
    const running = (await tool('retro_get_board').run({})) as { data: { timer: { running: boolean; remainingSeconds: number } } }
    expect(running.data.timer.running).toBe(true)
    expect(running.data.timer.remainingSeconds).toBe(Math.ceil((h.state.timer.endsAt - h.now) / 1000))
    h.tick(10 * 60 * 60 * 1000)
    const over = (await tool('retro_get_board').run({})) as { data: { timer: { remainingSeconds: number } } }
    expect(over.data.timer.remainingSeconds).toBe(0)
  })
})

describe('retro_list_ideas, actions, drafts, export', () => {
  it('lists ideas with their column and author, optionally for one column, and clusters with their ideas', async () => {
    const { h, tool, add } = setup()
    const a = add('alpha')
    const b = add('beta')
    add('gamma', 1)
    const all = (await tool('retro_list_ideas').run({})) as { data: { notice: string; ideas: Record<string, unknown>[] } }
    expect(all.data.notice).toBe(UNTRUSTED_NOTICE)
    expect(all.data.ideas).toHaveLength(3)
    expect(all.data.ideas[0]).toMatchObject({ kind: 'idea', column: h.state.columns[0]!.title, columnId: h.col(0), author: 'Alice', votes: 0, votedByMe: false })
    const one = (await tool('retro_list_ideas').run({ columnId: h.col(1) })) as { data: { ideas: { text: string }[] } }
    expect(one.data.ideas.map((i) => i.text)).toEqual(['gamma'])
    const blank = (await tool('retro_list_ideas').run({ columnId: '   ' })) as { data: { ideas: unknown[] } }
    expect(blank.data.ideas).toHaveLength(3)
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'group.rename', id: h.state.notes[a]!.groupId!, title: 'Theme' })
    const grouped = (await tool('retro_list_ideas').run({ columnId: h.col(0) })) as { data: { ideas: { kind: string; text: string; ideas: { text: string; author: string | null; votes: number | null; votedByMe: boolean }[] }[] } }
    expect(grouped.data.ideas).toHaveLength(1)
    expect(grouped.data.ideas[0]).toMatchObject({ kind: 'cluster', text: 'Theme' })
    expect(grouped.data.ideas[0]!.ideas.map((i) => i.text).sort()).toEqual(['alpha', 'beta'])
    expect(grouped.data.ideas[0]!.ideas[0]).toMatchObject({ author: 'Alice', votedByMe: false })
  })

  it('lists actions with a null owner when unassigned', async () => {
    const { h, tool } = setup()
    h.run({ t: 'action.add', text: 'ship it', owner: '' })
    h.run({ t: 'action.add', text: 'write docs', owner: 'Bob' })
    const out = (await tool('retro_list_actions').run({})) as { data: { notice: string; actions: { id: string; text: string; owner: string | null; done: boolean }[] } }
    expect(out.data.notice).toBe(UNTRUSTED_NOTICE)
    expect(out.data.actions.map((a) => [a.text, a.owner, a.done])).toEqual([['ship it', null, false], ['write docs', 'Bob', false]])
    expect(out.data.actions[0]!.id).toBeTruthy()
  })

  it('exports markdown with the untrusted notice', async () => {
    const { tool } = setup()
    expect(await tool('retro_export_markdown').run({})).toEqual({ ok: true, data: { notice: UNTRUSTED_NOTICE, markdown: '# md' } })
  })
})

describe('retro_write_draft', () => {
  it('trims, saves the draft and returns its id; the shared board is untouched', async () => {
    const { h, tool, store } = setup()
    const out = await tool('retro_write_draft').run({ columnId: ` ${h.col(0)} `, text: '  a draft  ' })
    expect(out).toEqual({ ok: true, data: { draftId: 'd1' } })
    expect(store).toEqual([{ id: 'd1', columnId: h.col(0), text: 'a draft' }])
    expect(Object.keys(h.state.notes)).toEqual([])
  })

  it('refuses an unknown column, a blank text, a locked board and a full draft store with distinct messages', async () => {
    const { h, tool } = setup()
    const msg = 'Unknown column. Use retro_get_board to get column ids.'
    expect(await tool('retro_write_draft').run({ columnId: 'ghost', text: 'x' })).toEqual({ ok: false, error: msg })
    expect(await tool('retro_write_draft').run({ text: 'x' })).toEqual({ ok: false, error: msg })
    expect(await tool('retro_write_draft').run({ columnId: h.col(0), text: '   ' })).toEqual({ ok: false, error: 'Text is required.' })
    expect(await tool('retro_write_draft').run({ columnId: h.col(0), text: 42 })).toEqual({ ok: false, error: 'Text is required.' })
    expect(await tool('retro_write_draft').run({ columnId: h.col(0), text: 'FULL' })).toEqual({ ok: false, error: 'The draft could not be saved.' })
    h.run({ t: 'settings.update', locked: true })
    expect(await tool('retro_write_draft').run({ columnId: h.col(0), text: 'x' })).toEqual({ ok: false, error: 'locked' })
  })
})

describe('retro_publish_drafts', () => {
  it('asks to confirm with the texts of the drafts concerned, or nothing when there is none', async () => {
    const { h, tool } = setup()
    expect(tool('retro_publish_drafts').confirm!({})).toBeNull()
    await tool('retro_write_draft').run({ columnId: h.col(0), text: 'first' })
    await tool('retro_write_draft').run({ columnId: h.col(1), text: 'second' })
    expect(tool('retro_publish_drafts').confirm!({})).toEqual({ title: 'Publish these drafts for everyone?', items: ['first', 'second'] })
    expect(tool('retro_publish_drafts').confirm!({ draftIds: ['d2'] })).toEqual({ title: 'Publish these drafts for everyone?', items: ['second'] })
    expect(tool('retro_publish_drafts').confirm!({ draftIds: [] })).toEqual({ title: 'Publish these drafts for everyone?', items: ['first', 'second'] })
    expect(tool('retro_publish_drafts').confirm!({ draftIds: ['nope'] })).toBeNull()
  })

  it('publishes all or the chosen drafts, counts them, and refuses when none match', async () => {
    const { h, tool, store } = setup()
    expect(await tool('retro_publish_drafts').run({})).toEqual({ ok: false, error: 'No draft to publish.' })
    await tool('retro_write_draft').run({ columnId: h.col(0), text: 'first' })
    await tool('retro_write_draft').run({ columnId: h.col(0), text: 'second' })
    await tool('retro_write_draft').run({ columnId: h.col(1), text: 'third' })
    expect(await tool('retro_publish_drafts').run({ draftIds: ['nope'] })).toEqual({ ok: false, error: 'No draft to publish.' })
    expect(await tool('retro_publish_drafts').run({ draftIds: ['d1'] })).toEqual({ ok: true, data: { published: 1 } })
    expect(Object.values(h.state.notes).map((n) => n.text)).toEqual(['first'])
    expect(store.map((d) => d.id)).toEqual(['d2', 'd3'])
    expect(await tool('retro_publish_drafts').run({})).toEqual({ ok: true, data: { published: 2 } })
    expect(Object.values(h.state.notes)).toHaveLength(3)
  })

  it('passes the refusal of the board on (locked)', async () => {
    const { h, tool } = setup()
    await tool('retro_write_draft').run({ columnId: h.col(0), text: 'first' })
    h.run({ t: 'settings.update', locked: true })
    expect(await tool('retro_publish_drafts').run({})).toEqual({ ok: false, error: 'locked' })
  })
})

describe('retro_vote', () => {
  it('confirms with the idea text, and says whether it adds or removes the vote', async () => {
    const { tool, add } = setup()
    const id = add('good idea')
    expect(tool('retro_vote').confirm!({ ideaId: id })).toEqual({ title: 'Vote for this idea?', items: ['good idea'] })
    expect(tool('retro_vote').confirm!({ ideaId: 'ghost' })).toBeNull()
    expect(await tool('retro_vote').run({ ideaId: id })).toEqual({ ok: true, data: { done: true } })
    expect(tool('retro_vote').confirm!({ ideaId: id })).toEqual({ title: 'Remove your vote?', items: ['good idea'] })
  })

  it('toggles the vote on the board and refuses unknown or blank ids', async () => {
    const { h, tool, add } = setup()
    const id = add('good idea')
    await tool('retro_vote').run({ ideaId: ` ${id} ` })
    expect(h.state.notes[id]!.voters).toContain(alice.cid)
    await tool('retro_vote').run({ ideaId: id })
    expect(h.state.notes[id]!.voters).not.toContain(alice.cid)
    const unknown = { ok: false, error: 'Unknown idea. Use retro_list_ideas.' }
    expect(await tool('retro_vote').run({ ideaId: 'ghost' })).toEqual(unknown)
    expect(await tool('retro_vote').run({ ideaId: '  ' })).toEqual(unknown)
    expect(await tool('retro_vote').run({})).toEqual(unknown)
  })
})

describe('retro_propose_action', () => {
  it('confirms with the text and the owner in brackets, nothing for a blank text', () => {
    const { tool } = setup()
    expect(tool('retro_propose_action').confirm!({ text: ' Fix CI ' })).toEqual({ title: 'Add this action?', items: ['Fix CI'] })
    expect(tool('retro_propose_action').confirm!({ text: 'Fix CI', owner: ' Bob ' })).toEqual({ title: 'Add this action?', items: ['Fix CI (Bob)'] })
    expect(tool('retro_propose_action').confirm!({ text: 'Fix CI', owner: '  ' })).toEqual({ title: 'Add this action?', items: ['Fix CI'] })
    expect(tool('retro_propose_action').confirm!({ text: '  ' })).toBeNull()
  })

  it('adds the action with a trimmed owner (empty when none), and requires a text', async () => {
    const { h, tool } = setup()
    expect(await tool('retro_propose_action').run({ text: ' Fix CI ', owner: ' Bob ' })).toEqual({ ok: true, data: { done: true } })
    expect(await tool('retro_propose_action').run({ text: 'Docs' })).toEqual({ ok: true, data: { done: true } })
    expect(Object.values(h.state.actions).map((a) => [a.text, a.owner])).toEqual([['Fix CI', 'Bob'], ['Docs', '']])
    expect(await tool('retro_propose_action').run({ text: '   ' })).toEqual({ ok: false, error: 'Text is required.' })
    expect(await tool('retro_propose_action').run({})).toEqual({ ok: false, error: 'Text is required.' })
  })
})
