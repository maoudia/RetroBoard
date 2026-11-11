#!/usr/bin/env node
// Worker requests of a cold load (change prod-guardrails, group 3). The Workers Free plan allows 100,000 requests a day;
// with `run_worker_first: true` every request of a page, hashed assets included, invokes the Worker.
// Opens `/`, `/new` and `/boards` in a fresh browser context each (nothing cached), then visits the same page again,
// records every request to the site and counts the ones that invoke the Worker under the `assets.run_worker_first`
// rule of wrangler.jsonc.
// Needs `pnpm generate`. Usage: node scripts/quality/worker-requests.mjs [baseUrl] [--config=wrangler.jsonc]
// Without a baseUrl it starts `wrangler dev` on a free port for the run.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { pathToFileURL } from 'node:url'

export const PAGES = ['/', '/new', '/boards']

/** The text of a JSONC file without its comments (strings are left alone, so a `//` inside one survives). */
export function stripJsonc(text) {
  return text.replace(/"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m) => (m.startsWith('"') ? m : ''))
}

/** The `assets.run_worker_first` rule of a wrangler config: true, false or a list of globs (`!` excludes). */
export function runWorkerFirst(configText) {
  return JSON.parse(stripJsonc(configText)).assets?.run_worker_first ?? false
}

const glob = (pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)

/** True when a request for `pathname` invokes the Worker under `rule` (Cloudflare: any positive pattern, no negative one). */
export function invokesWorker(pathname, rule) {
  if (typeof rule === 'boolean') return rule
  const hit = (p) => glob(p).test(pathname)
  return rule.some((p) => !p.startsWith('!') && hit(p)) && !rule.some((p) => p.startsWith('!') && hit(p.slice(1)))
}

/** Counts of one page load: every request to the site, the hashed assets among them, and the Worker invocations. */
export function tally(urls, rule) {
  const paths = urls.map((u) => new URL(u).pathname)
  return {
    total: paths.length,
    hashed: paths.filter((p) => p.startsWith('/_nuxt/')).length,
    worker: paths.filter((p) => invokesWorker(p, rule)).length,
  }
}

/** The table of docs/capacity.md: one row per page, the cold load and the next visit of the same browser. */
export function renderTable(rows) {
  const line = (cells) => `| ${cells.join(' | ')} |`
  return [
    line(['Page', 'Cold: requests', 'Cold: under `/_nuxt/`', 'Cold: Worker', 'Revisit: requests', 'Revisit: Worker']),
    line(['---', '---', '---', '---', '---', '---']),
    ...rows.map((r) => line([`\`${r.page}\``, r.cold.total, r.cold.hashed, r.cold.worker, r.revisit.total, r.revisit.worker])),
  ].join('\n')
}

const freePort = () => new Promise((resolve, reject) => {
  const server = createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)) })
})

async function startWorker() {
  const port = await freePort()
  const child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1'], { stdio: 'ignore' })
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 240; i++) {
    if (child.exitCode !== null) throw new Error('wrangler dev exited before answering')
    try { if ((await fetch(`${base}/healthz`)).ok) return { base, stop: () => child.kill() } } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  child.kill()
  throw new Error('wrangler dev did not answer /healthz within 2 minutes')
}

/** URLs of every request (and WebSocket) to the site during a cold load of `path` and during a second visit of the same browser. */
async function visits(browser, base, path) {
  const context = await browser.newContext()
  const origin = new URL(base).origin
  let urls = []
  context.on('request', (req) => { if (req.url().startsWith(origin)) urls.push(req.url()) })
  const page = await context.newPage()
  page.on('websocket', (ws) => { if (ws.url().replace(/^ws/, 'http').startsWith(origin)) urls.push(ws.url().replace(/^ws/, 'http')) })
  const visit = async () => {
    urls = []
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    return urls
  }
  const cold = await visit()
  const revisit = await visit()
  await context.close()
  return { cold, revisit }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const config = args.find((a) => a.startsWith('--config='))?.slice(9) ?? 'wrangler.jsonc'
  const given = args.find((a) => !a.startsWith('--'))
  const rule = runWorkerFirst(readFileSync(config, 'utf8'))
  const worker = given ? null : await startWorker()
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {})
  try {
    const rows = []
    for (const page of PAGES) {
      const { cold, revisit } = await visits(browser, given ?? worker.base, page)
      rows.push({ page, cold: tally(cold, rule), revisit: tally(revisit, rule) })
    }
    console.log(`run_worker_first in ${config}: ${JSON.stringify(rule)}\n`)
    console.log(renderTable(rows))
  } finally {
    await browser.close()
    worker?.stop()
  }
}
