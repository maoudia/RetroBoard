import { describe, expect, it } from 'vitest'
import { actionsFromCsv, actionsFromJson } from '@retroboard/application'
import { buildSnapshot } from '@retroboard/domain'
import { harness } from '@retroboard/testkit'
import { toActionsCsv, toJson } from '../src'

describe('exports read back by the carry-over import', () => {
  it('round-trips our own actions CSV, formulas included', () => {
    const h = harness()
    h.run({ t: 'action.add', text: '=SUM(A1)', owner: 'Ana' })
    h.run({ t: 'action.add', text: 'Plain, with comma', owner: '' })
    h.run({ t: 'action.status', id: Object.keys(h.state.actions)[1]!, status: 'blocked' })
    const csv = toActionsCsv(buildSnapshot(h.state, { cid: 'x' }, [], h.now))
    expect(csv.split('\n')[0]).toBe('"Summary","Assignee","Status","Due Date","Description","Labels"')
    expect(actionsFromCsv(csv)).toEqual([
      { text: '=SUM(A1)', owner: 'Ana', status: 'todo' },
      { text: 'Plain, with comma', owner: '', status: 'blocked' },
    ])
  })

  it('reads our board export, using its title as origin', () => {
    const h = harness()
    h.run({ t: 'settings.update', title: 'Sprint 42' })
    h.run({ t: 'action.add', text: 'Cache deps', owner: 'Bob', due: '2026-11-07' })
    h.run({ t: 'action.add', text: 'Done thing', owner: '' })
    h.run({ t: 'action.toggle', id: Object.keys(h.state.actions)[1]!, done: true })
    const json = toJson(buildSnapshot(h.state, { cid: 'x' }, [], h.now))
    expect(actionsFromJson(json, { openOnly: true })).toEqual([{ text: 'Cache deps', owner: 'Bob', status: 'todo', due: '2026-11-07', from: 'Sprint 42' }])
  })

})
