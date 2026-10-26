import { describe, expect, it } from 'vitest'
import { buildReport } from '@retroboard/application'
import { buildSnapshot, MIN } from '@retroboard/domain'
import { alice, bob, harness } from '@retroboard/testkit'
import { escapeHtml, toReportHtml } from '../src'

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}(${Object.values(params).join(',')})` : key)

function board() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Sprint <42>' })
  h.run({ t: 'note.add', columnId: h.col(0), text: '<script>alert(1)</script>' })
  h.run({ t: 'note.add', columnId: h.col(1), text: 'Long meetings' }, bob)
  const meetings = Object.keys(h.state.notes)[1]!
  h.run({ t: 'vote.add', kind: 'note', id: meetings })
  h.run({ t: 'action.add', text: 'Cache deps', owner: 'Ana', due: '2026-11-01' })
  h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }] })
  h.run({ t: 'agenda.start' })
  h.tick(6 * MIN)
  h.run({ t: 'agenda.end' })
  return buildReport(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), new Date('2026-10-24T10:00:00Z'))
}

describe('report as a standalone HTML file', () => {
  it('escapes everything that comes from the board', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
    const html = toReportHtml(board(), t)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('<h1>Sprint &lt;42&gt;</h1>')
  })

  it('is self-contained: no script, no external resource', () => {
    const html = toReportHtml(board(), t)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).not.toMatch(/<script|src=|href=|@import|url\(/i)
  })

  it('has every section: metrics, podium, columns, actions, agenda', () => {
    const html = toReportHtml(board(), t)
    for (const k of ['report.metrics', 'report.podium', 'report.ideasByColumn', 'report.actions', 'report.agenda']) expect(html).toContain(k)
    expect(html).toContain('<li>Long meetings <span class="v">report.votesN(1)</span></li>')
    expect(html).toContain('<td>Cache deps</td><td>Ana</td><td>actions.status.todo</td><td>2026-11-01</td>')
    expect(html).toContain('<td>agenda.phase.write</td><td>5 min</td><td>6 min</td>')
  })

  it('says when votes are hidden instead of showing counts', () => {
    const r = { ...board(), votesHidden: true, podium: [] }
    const html = toReportHtml(r, t)
    expect(html).toContain('report.votesHidden')
    expect(html).not.toContain('report.votesN')
  })

  it('prints the ROTI distribution when the team rated', () => {
    const r = board()
    expect(toReportHtml(r, t)).not.toContain('report.roti')
    const html = toReportHtml({ ...r, roti: { counts: [0, 0, 1, 2, 0], total: 3, average: 3.7 } }, t)
    expect(html).toContain('report.roti.average(3.7,3)')
    expect(html).toContain('<li>4 / 5: 2</li>')
  })
})
