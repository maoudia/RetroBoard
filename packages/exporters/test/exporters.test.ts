import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { csvCell, type ExportLabels, toCsv, toJson, toMarkdown } from '../src'

const labels: ExportLabels = (key, params) => (params ? `${key}:${params.n}` : key)

function board() {
  const h = harness()
  const col = h.state.columns[0]!.id
  h.run({ t: 'note.add', columnId: col, text: 'Slow CI\nreally' })
  h.run({ t: 'note.add', columnId: col, text: '=HYPERLINK("x")' })
  h.run({ t: 'action.add', text: 'Cache deps', owner: 'Bob' })
  const id = Object.keys(h.state.notes)[0]!
  h.run({ t: 'vote.toggle', id })
  return buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
}

describe('exporters', () => {
  it('writes Markdown with titles, votes, one-line notes and actions', () => {
    const md = toMarkdown(board(), { date: new Date('2026-10-24T10:00:00Z'), labels })
    expect(md).toContain('_2026-10-24_')
    expect(md).toContain('- Slow CI really (export.votes:1)')
    expect(md).toContain('## export.actions')
    expect(md).toContain('- [ ] Cache deps (Bob)')
  })

  it('neutralises spreadsheet formulas in CSV', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"')
    expect(csvCell('+33')).toBe('"\'+33"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    const csv = toCsv(board(), labels)
    expect(csv.split('\n')[0]).toBe('"export.csv.column","export.csv.group","export.csv.note","export.csv.votes","export.csv.author"')
    expect(csv).toContain('"\'=HYPERLINK(""x"")"')
  })

  it('JSON has no per-viewer fields', () => {
    const json = JSON.parse(toJson(board())) as { notes: Record<string, unknown>[] }
    expect(json.notes[0]).not.toHaveProperty('mine')
    expect(json.notes[0]).not.toHaveProperty('voted')
  })
})

describe('exports respect hidden counts until voting closes', () => {
  it('omits counts while hidden, shows them once voting is closed', () => {
    const h = harness()
    const col = h.state.columns[0]!.id
    h.run({ t: 'note.add', columnId: col, text: 'Idea' })
    h.run({ t: 'settings.update', secretVoting: true })
    h.run({ t: 'vote.add', kind: 'note', id: Object.keys(h.state.notes)[0]! })
    const hidden = toMarkdown(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), { date: new Date(0), labels })
    expect(hidden).toContain('- Idea - Alice\n')
    h.run({ t: 'vote.close' })
    const shown = toMarkdown(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), { date: new Date(0), labels })
    expect(shown).toContain('- Idea (export.votes:1) - Alice')
  })
})
