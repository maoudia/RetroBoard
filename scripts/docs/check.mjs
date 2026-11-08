#!/usr/bin/env node
// `pnpm docs:check` (part of `pnpm verify`): the user guide cannot silently go stale (change user-manual-and-tutorials).
// Every problem names the guide step, so a renamed control or a missing text points at what to fix.
//   1. the manifest and the sources hashed in guide.json are the current ones
//   2. every step has its text in French and in English, and no text names an unknown step
//   3. every step has its four pictures (fr and en, light and dark)
//   4. every anchor the tour uses is a data-testid of the app
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CHAPTERS, imageName } from '../../tests/docs/manifest.ts'
import { guideInfo, LOCALES, readSources, sections } from './guide.mjs'

const GUIDE = 'apps/web/public/guide'
const APP = 'apps/web/app'
const VARIANTS = ['light', 'dark']
export const REGENERATE = 'run pnpm docs:tour && pnpm docs:guide'

/** Problem 1: the recorded hashes against the current manifest and sources. `recorded` is guide.json, or null when absent. */
export function hashProblems(recorded, sources, chapters = CHAPTERS) {
  if (!recorded) return [`the guide has not been generated (guide.json is missing): ${REGENERATE}`]
  const now = guideInfo(sources, chapters)
  const problems = []
  if (recorded.manifest !== now.manifest) problems.push(`the guide is out of date: the manifest changed since the guide was generated (${recorded.manifest} then, ${now.manifest} now): ${REGENERATE}`)
  if (recorded.sources !== now.sources) problems.push(`the guide is out of date: the text in docs/user-guide changed since the guide was generated: ${REGENERATE}`)
  return problems
}

/** Problem 2: a text for every step in both languages, and nothing for an unknown step. */
export function textProblems(sources, chapters = CHAPTERS) {
  const problems = []
  for (const chapter of chapters) {
    for (const locale of LOCALES) {
      const key = `${locale}/${chapter.id}`
      if (!(key in sources)) { problems.push(`${chapter.id}: no ${locale} text (docs/user-guide/${locale}/${chapter.id}.md)`); continue }
      const { steps } = sections(sources[key])
      for (const step of chapter.steps) if (!steps.get(step.id)?.trim()) problems.push(`${chapter.id}/${step.id}: no ${locale} text (add "## ${step.id}" to docs/user-guide/${locale}/${chapter.id}.md)`)
      for (const id of steps.keys()) if (!chapter.steps.some((s) => s.id === id)) problems.push(`${chapter.id}/${id}: the ${locale} text names a step that is not in the manifest`)
    }
  }
  return problems
}

/** Problem 3: the pictures of every step. `exists(path)` tells whether a file is there. */
export function pictureProblems(exists, chapters = CHAPTERS, root = `${GUIDE}/img`) {
  const problems = []
  for (const chapter of chapters) for (const step of chapter.steps) for (const locale of LOCALES) for (const variant of VARIANTS) {
    const path = `${root}/${locale}/${variant}/${imageName(chapter, step)}`
    if (!exists(path)) problems.push(`${chapter.id}/${step.id}: no ${locale} ${variant} picture (${path}): ${REGENERATE}`)
  }
  return problems
}

/** The pattern a data-testid in the app source stands for: static text, or a template with each `${...}` as a wildcard. */
const testidPattern = (value) => new RegExp(`^${value.split(/\$\{[^}]*\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+')}$`)

/** Every data-testid declared in the given sources, as patterns (a literal one matches only itself). */
export function testidPatterns(files) {
  const found = new Set()
  for (const text of files) for (const m of text.matchAll(/data-testid=(["'])(.+?)\1/g)) found.add(m[2].replace(/^`|`$/g, ''))
  return [...found].map((source) => ({ source, re: testidPattern(source) }))
}

/** Problem 4: the anchors the tour uses against the test ids of the app. Reports each missing anchor with its steps. */
export function anchorProblems(patterns, chapters = CHAPTERS) {
  const problems = []
  const used = (s) => [...s.anchors, ...(s.shoot ? [s.shoot] : []), ...s.ops.flatMap((o) => ('click' in o ? [o.click] : 'fill' in o ? [o.fill[0]] : []))]
  for (const chapter of chapters) for (const step of chapter.steps) {
    for (const a of new Set(used(step))) if (!patterns.some((p) => p.re.test(a))) problems.push(`${chapter.id}/${step.id}: anchor ${a} not found in the app (a data-testid renamed or removed?)`)
  }
  return problems
}

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : /\.(vue|ts)$/.test(n) ? [join(dir, n)] : []))

export function check() {
  let sources
  try { sources = readSources() } catch (e) { return [e.message] }
  const recorded = existsSync(join(GUIDE, 'guide.json')) ? JSON.parse(readFileSync(join(GUIDE, 'guide.json'), 'utf8')) : null
  const patterns = testidPatterns(walk(APP).map((f) => readFileSync(f, 'utf8')))
  return [...hashProblems(recorded, sources), ...textProblems(sources), ...pictureProblems(existsSync), ...anchorProblems(patterns)]
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = check()
  for (const p of problems) console.log(process.env.GITHUB_ACTIONS ? `::error title=User guide::${p}` : `docs:check: ${p}`)
  console.log(problems.length ? `docs:check: ${problems.length} problem(s)` : `docs:check: the guide is up to date (${CHAPTERS.length} chapters, ${CHAPTERS.reduce((n, c) => n + c.steps.length, 0)} steps)`)
  process.exit(problems.length ? 1 : 0)
}
