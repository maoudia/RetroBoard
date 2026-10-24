import { describe, expect, it } from 'vitest'
import { LIMITS } from '@retroboard/domain'
import { actionsFromCsv, actionsFromJson, mapStatus, parseCsv, suggestOwners } from '../src'

describe('owner suggestions', () => {
  it('lists present people first, then history, then the typed text last', () => {
    expect(suggestOwners('', ['Ana', 'Bob'], ['Carla', 'ana'])).toEqual([
      { name: 'Ana', source: 'present' }, { name: 'Bob', source: 'present' }, { name: 'Carla', source: 'history' },
    ])
    expect(suggestOwners('car', ['Ana'], ['Carla', 'Oscar'])).toEqual([
      { name: 'Carla', source: 'history' }, { name: 'Oscar', source: 'history' }, { name: 'car', source: 'custom' },
    ])
  })

  it('matches without case or accents and offers the typed name only when new', () => {
    expect(suggestOwners('helene', ['Hélène'], [])).toEqual([{ name: 'Hélène', source: 'present' }])
    expect(suggestOwners('Carla', [], [])).toEqual([{ name: 'Carla', source: 'custom' }])
    expect(suggestOwners('  ', ['A'], [])).toEqual([{ name: 'A', source: 'present' }])
    expect(suggestOwners('x'.repeat(80), [], [])[0]!.name).toHaveLength(LIMITS.actionOwner)
  })

  it('caps the list and keeps room for the custom entry', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Person ${i}`)
    const out = suggestOwners('person', many, [], 5)
    expect(out).toHaveLength(5)
    expect(out.at(-1)).toEqual({ name: 'person', source: 'custom' })
  })
})

describe('status mapping', () => {
  it.each([
    ['To Do', 'todo'], ['In Progress', 'doing'], ['En cours', 'doing'], ['Done', 'done'], ['Terminé', 'done'],
    ['Blocked', 'blocked'], ['Bloqué', 'blocked'], ["Won't Do", 'dropped'], ['Abandonné', 'dropped'], ['', 'todo'], ['weird', 'todo'],
  ])('%s -> %s', (raw, status) => expect(mapStatus(raw)).toBe(status))
})

describe('CSV', () => {
  it('parses quotes, doubled quotes, newlines in quotes, CRLF, semicolons and a BOM', () => {
    expect(parseCsv('﻿a,"b ""q""",c\r\n"multi\nline";x;y\n\n')).toEqual([['a', 'b "q"', 'c'], ['multi\nline', 'x', 'y']])
  })

  it('reads a Jira export and keeps open actions only on request', () => {
    const csv = 'Issue key,Summary,Assignee,Status,Due Date\nRB-1,Fix flaky tests,Ana,In Progress,2026-11-02\nRB-2,Old thing,Bob,Done,\nRB-3,,Bob,To Do,\n'
    expect(actionsFromCsv(csv, { from: 'Sprint 42' })).toEqual([
      { text: 'Fix flaky tests', owner: 'Ana', status: 'doing', due: '2026-11-02', from: 'Sprint 42' },
      { text: 'Old thing', owner: 'Bob', status: 'done', from: 'Sprint 42' },
    ])
    expect(actionsFromCsv(csv, { openOnly: true })!.map((a) => a.text)).toEqual(['Fix flaky tests'])
    expect(actionsFromCsv('Foo,Bar\n1,2\n')).toBeNull()
    expect(actionsFromCsv('')).toBeNull()
  })

  it('caps an import at the protocol limit and trims long fields', () => {
    const rows = Array.from({ length: LIMITS.maxImport + 10 }, (_, i) => `a${i},${'o'.repeat(100)}`)
    const out = actionsFromCsv(`Action,Owner\n${rows.join('\n')}`)!
    expect(out).toHaveLength(LIMITS.maxImport)
    expect(out[0]!.owner).toHaveLength(LIMITS.actionOwner)
  })
})

describe('JSON', () => {
  it('accepts a bare array (older exports with done only) and refuses other shapes', () => {
    expect(actionsFromJson('[{"text":"a","owner":"x","done":true},{"text":"b"},{"nope":1}]')).toEqual([
      { text: 'a', owner: 'x', status: 'done' }, { text: 'b', owner: '', status: 'todo' },
    ])
    expect(actionsFromJson('{"notes":[]}')).toBeNull()
    expect(actionsFromJson('not json')).toBeNull()
  })
})
