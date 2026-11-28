import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { captionsVtt, cutArgs, expectedFiles, launchInfo, pictureName, sourcesHash, themeIds, vttTime, walkthroughCaptions } from '../media.mjs'
// @ts-expect-error plain ESM script without types
import { mediaProblems } from '../check.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { en } from '@retroboard/i18n'
import { THEMES } from '@retroboard/themes'

const root = join(__dirname, '..', '..', '..')

describe('the launch media plan', () => {
  it('reads the theme ids of packages/themes and they are the real ones', () => {
    const ids = themeIds(readFileSync(join(root, 'packages/themes/src/index.ts'), 'utf8')) as string[]
    expect(ids).toEqual(THEMES.map((t) => t.id))
  })
  it('refuses a themes file without THEMES', () => {
    expect(() => themeIds('export const X = []')).toThrow('THEMES not found')
  })
  it('expects one picture per theme and variant plus the video and its captions', () => {
    expect(expectedFiles(['studio', 'paper'])).toEqual(['board-paper-dark.png', 'board-paper-light.png', 'board-studio-dark.png', 'board-studio-light.png', 'walkthrough-30s.vtt', 'walkthrough-30s.webm'])
    expect(pictureName('noel', 'dark')).toBe('board-noel-dark.png')
  })
  it('cuts 30 s from the recording and captions the five scenes that fit', () => {
    const args = cutArgs('in.webm', 'out.webm', { startMs: 1500 }) as string[]
    expect(args.slice(args.indexOf('-ss'), args.indexOf('-ss') + 2)).toEqual(['-ss', '1.500'])
    expect(args[args.indexOf('-t') + 1]).toBe('30')
    const caps = walkthroughCaptions(readFileSync(join(root, 'packages/i18n/src/en.ts'), 'utf8')) as string[]
    expect(caps).toHaveLength(7)
    expect(caps[0]).toBe(en['landing.video.c1'])
    const vtt = captionsVtt(caps) as string
    expect(vtt.startsWith('WEBVTT\n\n1\n00:00:00.000 --> 00:00:06.000\n' + caps[0])).toBe(true)
    expect(vtt).toContain('5\n00:00:24.000 --> 00:00:30.000')
    expect(vtt).not.toContain('00:00:36.000')
    expect(vttTime(3_723_004)).toBe('01:02:03.004')
  })
  it('hashes the sources by name and content', () => {
    const read = (p: string) => Buffer.from(`content of ${p}`)
    const list = () => ['a.ts', 'b.vue', 'c.css'].filter((f) => /\.(ts|vue)$/.test(f))
    expect(sourcesHash(read, list)).toBe(sourcesHash(read, list))
    expect(sourcesHash((p: string) => Buffer.from(p.endsWith('a.ts') ? 'x' : 'y'), list)).not.toBe(sourcesHash((p: string) => Buffer.from('y' + p), list))
  })
})

describe('the launch media check', () => {
  const themes = ['studio', 'paper']
  const files = Object.fromEntries((expectedFiles(themes) as string[]).map((f) => [f, `hash-${f}`]))
  const recorded = launchInfo({ themes, hashes: files, sources: 's1' })
  const check = (over: Record<string, unknown> = {}) => mediaProblems({ recorded, themes, files, sources: 's1', ...over }) as string[]

  it('passes on a generated kit', () => expect(check()).toEqual([]))
  it('fails when the kit was never generated', () => expect(check({ recorded: null })[0]).toContain('pnpm launch:media'))
  it('fails after a theme is added and passes after regeneration', () => {
    const more = [...themes, 'noel']
    const problems = check({ themes: more })
    expect(problems.join('\n')).toContain('no launch picture for the theme(s) noel')
    expect(problems.join('\n')).toContain('board-noel-light.png is missing')
    const regenerated = launchInfo({ themes: more, hashes: Object.fromEntries((expectedFiles(more) as string[]).map((f) => [f, `hash-${f}`])), sources: 's1' })
    expect(mediaProblems({ recorded: regenerated, themes: more, files: regenerated.files, sources: 's1' })).toEqual([])
  })
  it('fails on a changed file, a stray file and changed sources', () => {
    expect(check({ files: { ...files, 'board-studio-light.png': 'other' } }).join()).toContain('board-studio-light.png does not match')
    expect(check({ files: { ...files, 'extra.png': 'x' } }).join()).toContain('extra.png is not part of the kit')
    expect(check({ sources: 's2' }).join()).toContain('out of date')
  })
})
