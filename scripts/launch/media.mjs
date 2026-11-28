#!/usr/bin/env node
// The launch media (change public-launch, task 2.2): one demo board per theme in light and dark, and the 30 s captioned cut of the landing walkthrough,
// under docs/launch/media/, with their hashes in docs/launch/launch.json. `scripts/launch/check.mjs` (part of `pnpm verify`) fails when the files
// or the sources they came from changed since: run `pnpm launch:media` again.
//   pnpm launch:media
// The pictures come from tests/docs/launch-media.spec.ts, which creates its own invented demo board (tests/docs/demo.ts): no real board is ever shown.
// Needs ffmpeg with libvpx-vp9 (build-time tool only), like `pnpm docs:video`.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const MEDIA_DIR = 'docs/launch/media'
export const LAUNCH_JSON = 'docs/launch/launch.json'
export const TMP = process.env.LAUNCH_MEDIA ?? '.guide-tmp/launch'
export const VARIANTS = ['light', 'dark']
export const VIDEO = { webm: 'walkthrough-30s.webm', vtt: 'walkthrough-30s.vtt', seconds: 30, sceneMs: 6000 }
/** What the media are made from: a change to one of these makes them stale. */
export const SOURCE_DIRS = ['packages/themes/src', 'apps/web/app/components']
export const SOURCE_FILES = ['tests/docs/launch-media.spec.ts', 'tests/docs/demo.ts', 'scripts/launch/media.mjs', 'packages/i18n/src/en.ts']

export const sha = (data) => createHash('sha256').update(data).digest('hex')

/** The theme ids of `THEMES` in packages/themes/src/index.ts: each identifier is also the file `<id>.ts` next to it. */
export function themeIds(indexSource) {
  const body = /export const THEMES[^=]*=\s*\[([^\]]*)\]/.exec(indexSource)?.[1]
  if (!body) throw new Error('THEMES not found in packages/themes/src/index.ts')
  return body.split(',').map((s) => s.trim()).filter(Boolean)
}

/** The picture of a theme in a variant. */
export const pictureName = (theme, variant) => `board-${theme}-${variant}.png`

/** Every file of the kit (picture names and the video pair), sorted. */
export function expectedFiles(themes) {
  return [...themes.flatMap((t) => VARIANTS.map((v) => pictureName(t, v))), VIDEO.webm, VIDEO.vtt].sort()
}

/** "00:00:06.000" from milliseconds. */
export function vttTime(ms) {
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`
}

/** One cue per scene of the walkthrough that fits in the cut (scenes last `sceneMs`, the cut `seconds`). */
export function captionsVtt(captions, { seconds = VIDEO.seconds, sceneMs = VIDEO.sceneMs } = {}) {
  const count = Math.min(captions.length, Math.floor((seconds * 1000) / sceneMs))
  const cues = captions.slice(0, count).map((c, i) => `${i + 1}\n${vttTime(i * sceneMs)} --> ${vttTime((i + 1) * sceneMs)}\n${c}`)
  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

/** The English walkthrough captions (`landing.video.c1`..), in order, from the source of packages/i18n/src/en.ts. */
export function walkthroughCaptions(enSource) {
  const out = []
  for (let n = 1; ; n++) {
    const m = new RegExp(`'landing\\.video\\.c${n}': '((?:[^'\\\\]|\\\\.)*)'`).exec(enSource)
    if (!m) return out
    out.push(m[1].replace(/\\'/g, "'"))
  }
}

/** ffmpeg arguments: the first `seconds` of the recording after `startMs`, to a small VP9 WebM without sound. */
export function cutArgs(input, output, { startMs = 0, seconds = VIDEO.seconds } = {}) {
  return ['-y', '-loglevel', 'error', '-ss', (startMs / 1000).toFixed(3), '-i', input, '-t', String(seconds), '-an', '-vf', 'scale=960:-2,fps=15', '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', output]
}

/** Hash of the sources the media come from (file names and contents, in a stable order). */
export function sourcesHash(read = (p) => readFileSync(p), list = (d) => readdirSync(d).filter((f) => /\.(ts|vue)$/.test(f))) {
  const files = [...SOURCE_DIRS.flatMap((d) => list(d).map((f) => `${d}/${f}`)), ...SOURCE_FILES].sort()
  return sha(files.map((f) => `${f}\n${sha(read(f))}`).join('\n')).slice(0, 16)
}

/** What launch.json records. */
export function launchInfo({ themes, hashes, sources }) {
  return { themes, variants: VARIANTS, sources, files: Object.fromEntries(Object.keys(hashes).sort().map((f) => [f, hashes[f]])) }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout?.includes('libvpx-vp9') !== true) { console.error('launch:media needs ffmpeg with libvpx-vp9'); process.exit(1) }
  const themes = themeIds(readFileSync('packages/themes/src/index.ts', 'utf8'))
  rmSync(TMP, { recursive: true, force: true })
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.docs.config.ts', 'launch-media.spec'], { stdio: 'inherit', env: { ...process.env, LAUNCH_MEDIA: TMP, LAUNCH_THEMES: themes.join(',') } })
  if (run.status !== 0) process.exit(run.status ?? 1)
  rmSync(MEDIA_DIR, { recursive: true, force: true })
  mkdirSync(MEDIA_DIR, { recursive: true })
  for (const t of themes) for (const v of VARIANTS) copyFileSync(join(TMP, pictureName(t, v)), join(MEDIA_DIR, pictureName(t, v)))
  const { startMs } = JSON.parse(readFileSync(join(TMP, 'timings.json'), 'utf8'))
  const cut = spawnSync('ffmpeg', cutArgs(join(TMP, 'raw.webm'), join(MEDIA_DIR, VIDEO.webm), { startMs }), { stdio: 'inherit' })
  if (cut.status !== 0) { console.error('ffmpeg failed on the walkthrough cut'); process.exit(1) }
  writeFileSync(join(MEDIA_DIR, VIDEO.vtt), captionsVtt(walkthroughCaptions(readFileSync('packages/i18n/src/en.ts', 'utf8'))))
  const files = readdirSync(MEDIA_DIR)
  if (files.sort().join() !== expectedFiles(themes).join()) throw new Error(`unexpected media files: ${files.join(', ')}`)
  const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(join(MEDIA_DIR, f)))]))
  writeFileSync(LAUNCH_JSON, JSON.stringify(launchInfo({ themes, hashes, sources: sourcesHash() }), null, 2) + '\n')
  console.log(`launch:media: ${files.length} file(s) in ${MEDIA_DIR}, hashes in ${LAUNCH_JSON}`)
}
