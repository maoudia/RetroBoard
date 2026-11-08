import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { buildVtt, captionOf, encodeArgs, shiftTimings, trimArgs, trimStartMs, vttTime } from '../video.mjs'
// @ts-expect-error plain ESM script without types
import { elevenRequest, ELEVEN_MODEL, muxArgs, narration, pickEngine, piperArgs, sayArgs, tempoFor } from '../voiceover.mjs'
// @ts-expect-error TypeScript source shared with the tour
import { CHAPTERS } from '../../../tests/docs/manifest'

const first = CHAPTERS[0]
const timings = [{ chapter: first.id, step: first.steps[0].id, start: 1000, end: 4500 }, { chapter: first.id, step: first.steps[1].id, start: 4600, end: 9000 }]

describe('the tutorial video captions', () => {
  it('writes WebVTT timestamps with hours, minutes, seconds and milliseconds', () => {
    expect(vttTime(0)).toBe('00:00:00.000')
    expect(vttTime(83_125)).toBe('00:01:23.125')
    expect(vttTime(3_723_004)).toBe('01:02:03.004')
    expect(vttTime(-5)).toBe('00:00:00.000')
  })

  it('has one numbered cue per step, with the manifest caption of the language', () => {
    const vtt = buildVtt(timings, 'en') as string
    expect(vtt.startsWith('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.500\n')).toBe(true)
    expect(vtt).toContain(first.steps[0].caption.en)
    expect(vtt).toContain('2\n00:00:04.600 --> 00:00:09.000')
    expect(buildVtt(timings, 'fr')).toContain(first.steps[1].caption.fr)
    expect(buildVtt(timings, 'fr')).not.toContain(first.steps[1].caption.en)
  })

  it('refuses a step the manifest does not know', () => {
    expect(() => captionOf({ chapter: 'nope', step: 'x' }, 'en')).toThrow('no step nope/x')
  })

  it('cuts the page load before the first step and keeps the captions lined up', () => {
    expect(trimStartMs(timings)).toBe(700)
    expect(trimStartMs([{ start: 100 }])).toBe(0)
    expect(trimStartMs([])).toBe(0)
    const shifted = shiftTimings(timings, 700) as { start: number; end: number }[]
    expect(shifted[0]).toMatchObject({ start: 300, end: 3800 })
    expect(shiftTimings(timings, 5000)[0]).toMatchObject({ start: 0, end: 0 })
  })

  it('encodes a small silent VP9 WebM, with a fast cut before the input when asked', () => {
    const args = encodeArgs('in.webm', 'out.webm') as string[]
    expect(args).toContain('libvpx-vp9')
    expect(args).toContain('-an')
    expect(args.at(-1)).toBe('out.webm')
    expect(trimArgs('in.webm', 'out.webm', 0)).toEqual(args)
    const cut = trimArgs('in.webm', 'out.webm', 1500) as string[]
    expect(cut.slice(0, 2)).toEqual(['-ss', '1.500'])
    expect(cut.indexOf('-ss')).toBeLessThan(cut.indexOf('-i'))
  })
})

describe('the optional voice-over', () => {
  it('narrates the manifest captions and nothing else', () => {
    const lines = narration(timings, 'fr') as { id: string; text: string; start: number; end: number }[]
    expect(lines.map((l) => l.text)).toEqual([first.steps[0].caption.fr, first.steps[1].caption.fr])
    expect(lines[0]).toMatchObject({ id: `${first.id}-${first.steps[0].id}`, start: 1000, end: 4500 })
    const everyCaption = new Set(CHAPTERS.flatMap((c: { steps: { caption: Record<string, string> }[] }) => c.steps.flatMap((s) => [s.caption.fr, s.caption.en])))
    for (const l of narration(timings, 'en') as { text: string }[]) expect(everyCaption.has(l.text)).toBe(true)
  })

  it('sends to ElevenLabs the narration text and the model, with the key in a header and never in the body or the url', () => {
    const { url, init } = elevenRequest('Hello there', 'voice 1', 'secret-key') as { url: string; init: { method: string; headers: Record<string, string>; body: string } }
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice%201')
    expect(init.method).toBe('POST')
    expect(init.headers['xi-api-key']).toBe('secret-key')
    expect(JSON.parse(init.body)).toEqual({ text: 'Hello there', model_id: ELEVEN_MODEL })
    expect(init.body).not.toContain('secret-key')
    expect(url).not.toContain('secret-key')
  })

  it('passes the text to a local engine in a way it cannot be read as an option', () => {
    expect(sayArgs('-v evil', 'Samantha', 'out.aiff')).toEqual(['-v', 'Samantha', '-o', 'out.aiff', '--', '-v evil'])
    expect(piperArgs('m.onnx', 'o.wav')).toEqual(['--model', 'm.onnx', '--output_file', 'o.wav'])
  })

  it('speeds a clip up only as much as it needs, within natural bounds', () => {
    expect(tempoFor(2000, 3000)).toBe(1)
    expect(tempoFor(3000, 3000)).toBe(1)
    expect(tempoFor(3300, 3000)).toBeCloseTo(1.1, 5)
    expect(tempoFor(9000, 3000)).toBe(1.3)
  })

  it('lays each clip over the video at the start of its step and copies the video stream', () => {
    const args = muxArgs('silent.webm', [{ file: 'a.aiff', startMs: 1000, tempo: 1 }, { file: 'b.aiff', startMs: 4600.4, tempo: 1.2 }], 'out.webm') as string[]
    const graph = args[args.indexOf('-filter_complex') + 1]
    expect(graph).toContain('[1:a]adelay=1000|1000[a0]')
    expect(graph).toContain('[2:a]atempo=1.200,adelay=4600|4600[a1]')
    expect(graph).toContain('[a0][a1]amix=inputs=2:normalize=0[a]')
    expect(args[args.indexOf('-c:v') + 1]).toBe('copy')
    expect(args.slice(args.indexOf('-i'), args.indexOf('-i') + 6)).toEqual(['-i', 'silent.webm', '-i', 'a.aiff', '-i', 'b.aiff'])
    expect(args.at(-1)).toBe('out.webm')
  })

  it('picks the engine asked for, else a local one, else none', () => {
    expect(pickEngine('elevenlabs', { platform: 'linux', hasSay: false, hasPiper: false })).toBe('elevenlabs')
    expect(pickEngine(null, { platform: 'darwin', hasSay: true, hasPiper: true })).toBe('say')
    expect(pickEngine(null, { platform: 'linux', hasSay: true, hasPiper: true })).toBe('piper')
    expect(pickEngine(null, { platform: 'linux', hasSay: false, hasPiper: false })).toBeNull()
  })
})
