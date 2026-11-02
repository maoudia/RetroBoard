import { describe, expect, it } from 'vitest'
import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import { RAG_FORMAT, toRagJsonl, toRagMarkdown } from '../src'

function snapshot() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Sprint 42' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Slow CI' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Flaky tests\nacross teams' })
  const [a, b] = Object.keys(h.state.notes)
  h.run({ t: 'note.group', id: a!, ontoId: b! })
  h.run({ t: 'vote.add', kind: 'note', id: a! })
  h.run({ t: 'action.add', text: 'Cache deps', owner: 'Ana', sourceNote: a })
  return buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
}

describe('RAG export (task 3.4)', () => {
  it('JSON Lines: one valid chunk per idea, cluster and action, linked together', () => {
    const lines = toRagJsonl(snapshot(), new Date('2026-11-02T00:00:00Z')).trim().split('\n')
    const chunks = lines.map((l) => JSON.parse(l) as Record<string, unknown>)
    expect(chunks.map((c) => c.kind).sort()).toEqual(['action', 'cluster', 'idea', 'idea'])
    for (const c of chunks) {
      expect(c.format).toBe(RAG_FORMAT)
      expect(c.untrusted).toBe(true)
      expect(typeof c.id).toBe('string')
      expect(typeof c.text).toBe('string')
      expect(Array.isArray(c.links)).toBe(true)
    }
    const cluster = chunks.find((c) => c.kind === 'cluster')!
    expect((cluster.links as string[]).length).toBe(2)
    const idea = chunks.find((c) => c.kind === 'idea')!
    expect(idea.links).toEqual([cluster.id])
    expect(chunks.find((c) => c.text === 'Flaky tests across teams')).toBeTruthy()
    expect((chunks.find((c) => c.kind === 'action')!.links as string[])).toHaveLength(1)
  })

  it('never exposes author names, only whether the idea is named', () => {
    const out = toRagJsonl(snapshot(), new Date('2026-11-02T00:00:00Z'))
    expect(out).toContain('"authorKind"')
    expect(out).not.toContain('"author"')
  })

  it('Markdown: a front matter per column and one for the actions', () => {
    const md = toRagMarkdown(snapshot(), new Date('2026-11-02T00:00:00Z'))
    expect(md.split('\n---\nformat:').length - 1 + (md.startsWith('---\nformat:') ? 1 : 0)).toBe(4)
    expect(md).toContain('section: "actions"')
    expect(md).toContain('untrusted: true')
    expect(md).toContain('Slow CI')
  })
})
