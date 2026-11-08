#!/usr/bin/env node
// The tutorial video of the user guide (change user-manual-and-tutorials): records the tour (tests/docs/video.spec.ts) in
// French and in English, encodes it to a small WebM and writes the WebVTT captions from the manifest and the recorded step
// timings, under apps/web/public/guide/video/<locale>/ (tutorial.webm, tutorial.vtt).
//   pnpm docs:video                      both languages
//   pnpm docs:video --grep "the tutorial video en"
// Needs ffmpeg with libvpx-vp9 (build-time tool only). A voice-over is added afterwards by `pnpm docs:voice`.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAPTERS } from '../../tests/docs/manifest.ts'

export const LOCALES = ['fr', 'en']
const TMP = process.env.GUIDE_VIDEO ?? '.guide-tmp/video'
const OUT = process.env.GUIDE_VIDEO_OUT ?? 'apps/web/public/guide/video'

/** 83125 ms -> "00:01:23.125" (WebVTT timestamp). */
export function vttTime(ms) {
  const t = Math.max(0, Math.round(ms))
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(Math.floor(t / 3_600_000))}:${p(Math.floor(t / 60_000) % 60)}:${p(Math.floor(t / 1000) % 60)}.${p(t % 1000, 3)}`
}

/** The caption of a step in a language, or throws: a step the manifest does not know cannot be captioned. */
export function captionOf(timing, locale, chapters = CHAPTERS) {
  const step = chapters.find((c) => c.id === timing.chapter)?.steps.find((s) => s.id === timing.step)
  if (!step) throw new Error(`no step ${timing.chapter}/${timing.step} in the manifest`)
  return step.caption[locale]
}

/** WebVTT captions: one cue per step, from the recorded timings and the manifest captions. */
export function buildVtt(timings, locale, chapters = CHAPTERS) {
  const cues = timings.map((t, i) => `${i + 1}\n${vttTime(t.start)} --> ${vttTime(t.end)}\n${captionOf(t, locale, chapters)}`)
  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

/** ffmpeg arguments: the recording to a small VP9 WebM (no audio), 960 px wide, constant quality. */
export function encodeArgs(input, output) {
  return ['-y', '-loglevel', 'error', '-i', input, '-an', '-vf', 'scale=960:-2,fps=15', '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', output]
}

/** The first seconds of a recording show the page loading: cut them, so that the video starts on the first step. */
export const trimStartMs = (timings) => Math.max(0, (timings[0]?.start ?? 0) - 300)

/** Timings with the cut applied, so the captions still line up with the trimmed video. */
export const shiftTimings = (timings, ms) => timings.map((t) => ({ ...t, start: Math.max(0, t.start - ms), end: Math.max(0, t.end - ms) }))

/** Same, with a start offset: `-ss` goes before the input for a fast cut. */
export const trimArgs = (input, output, ms) => {
  const args = encodeArgs(input, output)
  return ms > 0 ? ['-ss', (ms / 1000).toFixed(3), ...args] : args
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout?.includes('libvpx-vp9') !== true) { console.error('docs:video needs ffmpeg with libvpx-vp9'); process.exit(1) }
  rmSync(TMP, { recursive: true, force: true })
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.docs.config.ts', 'video.spec', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, GUIDE_VIDEO: TMP } })
  if (run.status !== 0) process.exit(run.status ?? 1)
  for (const locale of LOCALES) {
    const dir = join(TMP, locale)
    if (!existsSync(join(dir, 'raw.webm'))) continue
    const { timings } = JSON.parse(readFileSync(join(dir, 'timings.json'), 'utf8'))
    const cut = trimStartMs(timings)
    const shifted = shiftTimings(timings, cut)
    writeFileSync(join(dir, 'timings.shifted.json'), JSON.stringify({ locale, timings: shifted }, null, 2) + '\n')
    const silent = join(dir, 'silent.webm')
    if (spawnSync('ffmpeg', trimArgs(join(dir, 'raw.webm'), silent, cut), { stdio: 'inherit' }).status !== 0) { console.error(`ffmpeg failed on the ${locale} video`); process.exit(1) }
    const target = join(OUT, locale)
    mkdirSync(target, { recursive: true })
    copyFileSync(silent, join(target, 'tutorial.webm'))
    writeFileSync(join(target, 'tutorial.vtt'), buildVtt(shifted, locale))
    console.log(`docs:video: ${locale}: ${(statSync(join(target, 'tutorial.webm')).size / 1024).toFixed(0)} KB, ${shifted.length} caption(s) in ${target}`)
  }
}
