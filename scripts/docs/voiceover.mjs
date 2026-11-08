#!/usr/bin/env node
// Optional voice-over of the tutorial video (change user-manual-and-tutorials), run by the owner on their machine, never in CI.
// The narration is the step captions of the manifest and nothing else: no board content ever reaches a speech engine.
//   pnpm docs:voice --locale en                       local engine (macOS `say`, else Piper)
//   pnpm docs:voice --locale fr --engine elevenlabs   ElevenLabs, key in ELEVENLABS_API_KEY, voice in ELEVENLABS_VOICE_ID
//   pnpm docs:voice --dry-run                         prints the narration and the plan, produces and sends nothing
// Needs the silent video and its timings from `pnpm docs:video`, and ffmpeg/ffprobe. Without a voice-over the video still
// carries its captions: this step is only ever an addition.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAPTERS } from '../../tests/docs/manifest.ts'
import { captionOf } from './video.mjs'

const TMP = process.env.GUIDE_VIDEO ?? '.guide-tmp/video'
const OUT = process.env.GUIDE_VIDEO_OUT ?? 'apps/web/public/guide/video'
export const ELEVEN_MODEL = 'eleven_multilingual_v2'
export const MAX_TEMPO = 1.3

/** The narration: one text per step, taken from the manifest captions, with the window the step is on screen. */
export function narration(timings, locale, chapters = CHAPTERS) {
  return timings.map((t) => ({ id: `${t.chapter}-${t.step}`, text: captionOf(t, locale, chapters), start: t.start, end: t.end }))
}

/** Default voices of the local engines, by language (macOS voice names; override with --voice or GUIDE_VOICE). */
export const SAY_VOICES = { fr: 'Thomas', en: 'Samantha' }

/** macOS `say`: the text goes as an argument after `--`, so it can never be read as an option. */
export const sayArgs = (text, voice, output) => ['-v', voice, '-o', output, '--', text]

/** Piper (MIT): the text goes on stdin, the model comes from the owner's PIPER_MODEL. */
export const piperArgs = (model, output) => ['--model', model, '--output_file', output]

/** The ElevenLabs request for one text: the only things sent are the narration text and the model name. */
export function elevenRequest(text, voiceId, key) {
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    init: { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: ELEVEN_MODEL }) },
  }
}

/** How much faster a clip must play to fit its window (1 when it fits, capped so that speech stays natural). */
export const tempoFor = (clipMs, windowMs) => (clipMs <= windowMs ? 1 : Math.min(MAX_TEMPO, clipMs / windowMs))

/**
 * ffmpeg arguments that lay the clips over the silent video, each starting with its step: clips are { file, startMs, tempo }.
 * The video stream is copied, the audio is Opus.
 */
export function muxArgs(video, clips, output) {
  const inputs = clips.flatMap((c) => ['-i', c.file])
  const filters = clips.map((c, i) => `[${i + 1}:a]${c.tempo > 1 ? `atempo=${c.tempo.toFixed(3)},` : ''}adelay=${Math.round(c.startMs)}|${Math.round(c.startMs)}[a${i}]`)
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0[a]`
  return ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', [...filters, mix].join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '48k', output]
}

/** Which engine runs: the one asked for, else the first local one that exists on this machine, else null (skip). */
export function pickEngine(asked, { platform, hasSay, hasPiper }) {
  if (asked) return asked
  if (platform === 'darwin' && hasSay) return 'say'
  if (hasPiper) return 'piper'
  return null
}

const flag = (name) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? null : (process.argv[i + 1] ?? true) }
const has = (bin) => spawnSync(bin, ['--version'], { stdio: 'ignore' }).error === undefined

async function speak(engine, text, locale, file) {
  if (engine === 'say') {
    const out = file.replace(/\.\w+$/, '.aiff')
    const r = spawnSync('say', sayArgs(text, flag('voice') || process.env.GUIDE_VOICE || SAY_VOICES[locale], out), { stdio: 'inherit' })
    if (r.status !== 0) throw new Error('say failed (is the voice installed? System Settings > Accessibility > Spoken Content)')
    return out
  }
  if (engine === 'piper') {
    const model = process.env.PIPER_MODEL
    if (!model) throw new Error('piper needs PIPER_MODEL (path of a voice model for this language)')
    const out = file.replace(/\.\w+$/, '.wav')
    const r = spawnSync('piper', piperArgs(model, out), { input: text, stdio: ['pipe', 'inherit', 'inherit'] })
    if (r.status !== 0) throw new Error('piper failed')
    return out
  }
  const { url, init } = elevenRequest(text, process.env.ELEVENLABS_VOICE_ID, process.env.ELEVENLABS_API_KEY)
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}`)
  const out = file.replace(/\.\w+$/, '.mp3')
  writeFileSync(out, Buffer.from(await res.arrayBuffer()))
  return out
}

const durationMs = (file) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout) * 1000

async function main() {
  const dry = process.argv.includes('--dry-run')
  const locales = flag('locale') ? [flag('locale')] : ['fr', 'en']
  const engine = pickEngine(flag('engine'), { platform: process.platform, hasSay: has('say'), hasPiper: has('piper') })
  if (!engine) { console.log('docs:voice: no local speech engine here (macOS `say` or Piper): skipped, the video keeps its captions.'); return }
  if (engine === 'elevenlabs' && !dry) {
    if (process.env.CI) { console.error('docs:voice: ElevenLabs is an owner-run option and never runs in CI'); process.exit(1) }
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) { console.error('docs:voice: set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your environment (never commit them)'); process.exit(1) }
  }
  for (const locale of locales) {
    const dir = join(TMP, locale)
    const timingsFile = join(dir, 'timings.shifted.json')
    if (!existsSync(timingsFile) || !existsSync(join(dir, 'silent.webm'))) { console.error(`docs:voice: run pnpm docs:video first (${timingsFile} missing)`); process.exit(1) }
    const lines = narration(JSON.parse(readFileSync(timingsFile, 'utf8')).timings, locale)
    console.log(`docs:voice: ${locale} with ${engine}: ${lines.length} line(s), narration text only`)
    if (dry) { for (const l of lines) console.log(`  ${(l.start / 1000).toFixed(1)}s  ${l.text}`); continue }
    mkdirSync(join(dir, 'voice'), { recursive: true })
    const clips = []
    for (const l of lines) {
      const file = await speak(engine, l.text, locale, join(dir, 'voice', `${l.id}.x`))
      const clipMs = durationMs(file)
      const tempo = tempoFor(clipMs, l.end - l.start)
      if (clipMs / tempo > l.end - l.start) console.warn(`docs:voice: "${l.id}" is longer than its step even at ${tempo.toFixed(2)}x: shorten the caption`)
      clips.push({ file, startMs: l.start, tempo })
    }
    const voiced = join(dir, 'voiced.webm')
    if (spawnSync('ffmpeg', muxArgs(join(dir, 'silent.webm'), clips, voiced), { stdio: 'inherit' }).status !== 0) { console.error('docs:voice: ffmpeg failed'); process.exit(1) }
    copyFileSync(voiced, join(OUT, locale, 'tutorial.webm'))
    console.log(`docs:voice: ${locale}: voice-over added to ${join(OUT, locale, 'tutorial.webm')}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
