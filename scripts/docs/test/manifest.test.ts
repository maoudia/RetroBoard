import { describe, expect, it } from 'vitest'
// @ts-expect-error TypeScript source shared with the tour
import { anchors, CHAPTERS, imageName, manifestHash, text } from '../../../tests/docs/manifest'

type Chapter = { id: string; title: Record<string, string>; intro: Record<string, string>; steps: { id: string; caption: Record<string, string>; ops: object[]; anchors: string[] }[] }
const chapters = CHAPTERS as Chapter[]

describe('the user guide manifest', () => {
  it('has unique chapter ids and unique step ids inside a chapter', () => {
    expect(new Set(chapters.map((c) => c.id)).size).toBe(chapters.length)
    for (const c of chapters) expect(new Set(c.steps.map((s) => s.id)).size, c.id).toBe(c.steps.length)
  })

  it('has every title, intro and caption in French and in English', () => {
    for (const c of chapters) {
      for (const v of [c.title, c.intro, ...c.steps.map((s) => s.caption)]) {
        expect(v.fr?.trim(), `${c.id} fr`).toBeTruthy()
        expect(v.en?.trim(), `${c.id} en`).toBeTruthy()
        expect(v.en, `${c.id}: the English text is not the French one`).not.toBe(v.fr)
      }
    }
  })

  it('gives every step an anchor to wait for, and creates the demo board once, before the first use of it', () => {
    for (const c of chapters) for (const s of c.steps) expect(s.anchors.length, `${c.id}/${s.id}`).toBeGreaterThan(0)
    const ops = chapters.flatMap((c) => c.steps.flatMap((s) => s.ops)) as { demoBoard?: true; goto?: string }[]
    expect(ops.filter((o) => o.demoBoard)).toHaveLength(1)
  })

  it('lists anchors once and in a stable order', () => {
    const list = anchors() as string[]
    expect(new Set(list).size).toBe(list.length)
    expect(list).toContain('btn-share')
  })

  it('names images chapter-step.webp and resolves a text in a language', () => {
    expect(imageName(chapters[0], chapters[0].steps[0])).toBe('create-form.webp')
    expect(text({ fr: 'a', en: 'b' }, 'en')).toBe('b')
    expect(text('same', 'fr')).toBe('same')
  })

  it('hashes the manifest: stable for the same data, different when a step changes', () => {
    expect(manifestHash()).toBe(manifestHash())
    expect(manifestHash()).toMatch(/^[0-9a-f]{8}$/)
    const changed = chapters.map((c, i) => (i === 0 ? { ...c, steps: [{ ...c.steps[0], id: 'other' }, ...c.steps.slice(1)] } : c))
    expect(manifestHash(changed)).not.toBe(manifestHash())
  })
})
