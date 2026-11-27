#!/usr/bin/env node
// Records the landing walkthrough (change landing-v2-and-product-video, task 1.3) as a WebM for social media, in French and
// in English: one full loop of the seven scenes, the captions burnt in because they are part of the page.
//   pnpm video:record                       needs a running site, `pnpm dev:worker` (BASE_URL overrides http://127.0.0.1:8787)
//   VIDEO_OUT=reports/product-video pnpm video:record --locale en
// Output: <VIDEO_OUT>/walkthrough-<locale>.webm (default reports/product-video). No audio; ffmpeg is not needed.
import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

export const SCENES = 7
export const SCENE_MS = 6000
export const LOCALES = ['fr', 'en']
export const SIZE = { width: 1280, height: 720 }
/** One loop plus a margin for the first paint and the last caption. */
export const recordMs = () => SCENES * SCENE_MS + 1500

/** The page shows the walkthrough alone, filling the frame. The context bypasses the CSP: this is a build-time tool, never the site. */
export const FRAME_CSS = `
  body > * { visibility: hidden !important; }
  [data-testid="walkthrough"], [data-testid="walkthrough"] * { visibility: visible !important; }
  [data-testid="walkthrough"] { position: fixed !important; inset: 0 !important; z-index: 99999 !important; width: auto !important; margin: 0 !important; display: grid !important; align-content: center !important; padding: 0 140px !important; background: #f5f5f7 !important; }
  [data-testid="walkthrough"] .ctl { display: none !important; }
`

export const outputName = (locale) => `walkthrough-${locale}.webm`

/** `--locale en` limits the run to one language. */
export function pickLocales(argv) {
  const i = argv.indexOf('--locale')
  if (i < 0) return LOCALES
  const l = argv[i + 1]
  if (!LOCALES.includes(l)) throw new Error(`--locale must be one of ${LOCALES.join(', ')}`)
  return [l]
}

async function record(browser, base, locale, outDir) {
  const tmp = join(outDir, `.tmp-${locale}`)
  rmSync(tmp, { recursive: true, force: true })
  const context = await browser.newContext({
    baseURL: base, locale: locale === 'fr' ? 'fr-FR' : 'en-US', colorScheme: 'light', reducedMotion: 'no-preference',
    viewport: SIZE, bypassCSP: true, recordVideo: { dir: tmp, size: SIZE },
  })
  const page = await context.newPage()
  await page.goto('/')
  await page.getByTestId('walkthrough').scrollIntoViewIfNeeded()
  // Hydration starts the loop on scene 1: wait for it, then film one full turn.
  await page.waitForFunction(() => document.querySelector('[data-testid="walkthrough"]')?.getAttribute('data-scene') === '0')
  await page.addStyleTag({ content: FRAME_CSS })
  await page.waitForTimeout(recordMs())
  const video = page.video()
  await context.close()
  renameSync(await video.path(), join(outDir, outputName(locale)))
  rmSync(tmp, { recursive: true, force: true })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = process.env.BASE_URL ?? 'http://127.0.0.1:8787'
  const outDir = process.env.VIDEO_OUT ?? 'reports/product-video'
  mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const locale of pickLocales(process.argv.slice(2))) { await record(browser, base, locale, outDir); console.log(`wrote ${join(outDir, outputName(locale))}`) }
  } finally { await browser.close() }
}
