/**
 * Golden outputs: the exact text of every destination for two fixtures (full board, empty board).
 * Any change to an exporter shows up here as a reviewed snapshot diff.
 */
import { describe, expect, it } from 'vitest'
import { buildReport } from '@retroboard/application'
import { buildSnapshot, MIN } from '@retroboard/domain'
import { alice, bob, harness } from '@retroboard/testkit'
import { toActionsCsv, toAgentsBundle, toCsv, toDocHtml, toJson, toMarkdown, toPlainText, toReportHtml, toSheetsTsv, toSlack } from '../src'

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}(${Object.values(params).join(',')})` : key)
const date = new Date('2026-10-25T00:00:00Z')

function full(secret = false) {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Sprint 42' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Slow CI' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Flaky\ntests' })
  h.run({ t: 'note.add', columnId: h.col(1), text: 'Long <meetings>' }, bob)
  h.run({ t: 'note.add', columnId: h.col(1), text: '=SUM(A1)' }, bob)
  const [ci, flaky, meetings] = Object.keys(h.state.notes)
  h.run({ t: 'note.group', id: flaky!, ontoId: ci! })
  h.run({ t: 'group.rename', id: Object.keys(h.state.groups)[0]!, title: 'Tooling' })
  h.run({ t: 'vote.add', kind: 'note', id: meetings! })
  h.run({ t: 'vote.add', kind: 'note', id: meetings! }, bob)
  h.run({ t: 'vote.add', kind: 'cluster', id: Object.keys(h.state.groups)[0]! })
  h.run({ t: 'action.add', text: 'Cache deps', owner: 'Ana', due: '2026-11-01' })
  h.run({ t: 'action.add', text: 'Shorter standups', owner: '' })
  h.run({ t: 'action.import', items: [{ text: 'Old one', owner: 'Zed', status: 'blocked', from: 'Sprint 41' }] })
  h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 3 }] })
  h.run({ t: 'agenda.start' })
  h.tick(6 * MIN)
  h.run({ t: 'agenda.next' })
  h.run({ t: 'settings.update', talkMode: 'ring' })
  h.run({ t: 'talk.assign', speaker: 'speaker-one-key', label: 'Ana' })
  h.tick(2 * MIN)
  h.run({ t: 'talk.assign', speaker: 'speaker-two-key', label: null })
  h.tick(MIN)
  h.run({ t: 'talk.end' })
  if (secret) h.run({ t: 'settings.update', secretVoting: true })
  const snap = buildSnapshot(h.state, { cid: alice.cid }, [{ name: 'Alice', me: true }, { name: null, me: false }], h.now)
  return { snap, report: buildReport(snap, date) }
}

function empty() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Empty' })
  const snap = buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
  return { snap, report: buildReport(snap, date) }
}

const labels = t as Parameters<typeof toMarkdown>[1]['labels']

describe('golden outputs', () => {
  for (const [name, fixture] of [['full', () => full()], ['secret', () => full(true)], ['empty', empty]] as const) {
    it(`${name}: every destination`, () => {
      const { snap, report } = fixture()
      expect({
        markdown: toMarkdown(snap, { date, labels }),
        csv: toCsv(snap, labels),
        json: toJson(snap),
        jira: toActionsCsv(snap),
        reportHtml: toReportHtml(report, t),
        docHtml: toDocHtml(report, t),
        docHtmlActions: toDocHtml(report, t, { actionsOnly: true }),
        plain: toPlainText(report, t),
        plainActions: toPlainText(report, t, { actionsOnly: true }),
        slack: toSlack(report, t),
        slackActions: toSlack(report, t, { actionsOnly: true }),
        sheets: toSheetsTsv(report, t),
        sheetsActions: toSheetsTsv(report, t, { actionsOnly: true }),
        agents: toAgentsBundle(report),
        agentsActions: toAgentsBundle(report, { actionsOnly: true }),
      }).toMatchSnapshot()
    })
  }
})
