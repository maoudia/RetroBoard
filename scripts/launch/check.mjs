#!/usr/bin/env node
// `node scripts/launch/check.mjs` (part of `pnpm verify`, change public-launch task 2.2): the launch media cannot silently go stale.
//   1. docs/launch/launch.json lists the themes of packages/themes (a theme added since needs `pnpm launch:media`)
//   2. every picture and the video pair are in docs/launch/media/, and nothing else
//   3. every file matches its recorded hash
//   4. the sources the media come from (themes, landing components, the spec) are the recorded ones
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expectedFiles, LAUNCH_JSON, MEDIA_DIR, sha, sourcesHash, themeIds } from './media.mjs'

export const REGENERATE = 'run pnpm launch:media'

/** The problems of a kit: `recorded` is launch.json (or null), `themes` the current theme ids, `files` the media files by name with their hash, `sources` the current sources hash. */
export function mediaProblems({ recorded, themes, files, sources }) {
  if (!recorded) return [`the launch media have not been generated (${LAUNCH_JSON} is missing): ${REGENERATE}`]
  const problems = []
  const missing = themes.filter((t) => !recorded.themes.includes(t))
  if (missing.length) problems.push(`no launch picture for the theme(s) ${missing.join(', ')}: ${REGENERATE}`)
  const stale = recorded.themes.filter((t) => !themes.includes(t))
  if (stale.length) problems.push(`launch pictures of the removed theme(s) ${stale.join(', ')}: ${REGENERATE}`)
  const expected = expectedFiles(themes)
  for (const f of expected) if (!(f in files)) problems.push(`${MEDIA_DIR}/${f} is missing: ${REGENERATE}`)
  for (const f of Object.keys(files)) if (!expected.includes(f)) problems.push(`${MEDIA_DIR}/${f} is not part of the kit: ${REGENERATE}`)
  for (const [f, hash] of Object.entries(files)) if (recorded.files?.[f] !== hash) problems.push(`${MEDIA_DIR}/${f} does not match ${LAUNCH_JSON}: ${REGENERATE}`)
  if (recorded.sources !== sources) problems.push(`the launch media are out of date: the themes, the landing or the media spec changed (${recorded.sources} then, ${sources} now): ${REGENERATE}`)
  return problems
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const recorded = existsSync(LAUNCH_JSON) ? JSON.parse(readFileSync(LAUNCH_JSON, 'utf8')) : null
  const files = existsSync(MEDIA_DIR) ? Object.fromEntries(readdirSync(MEDIA_DIR).map((f) => [f, sha(readFileSync(join(MEDIA_DIR, f)))])) : {}
  const problems = mediaProblems({ recorded, themes: themeIds(readFileSync('packages/themes/src/index.ts', 'utf8')), files, sources: sourcesHash() })
  for (const p of problems) console.error(`launch:check: ${p}`)
  if (problems.length) process.exit(1)
  console.log(`launch media ok: ${Object.keys(files).length} file(s)`)
}
