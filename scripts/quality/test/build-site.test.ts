import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const script = join(import.meta.dirname, '../build-site.mjs')
const dirs: string[] = []
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })

function file(root: string, path: string, content = 'x') {
  mkdirSync(join(root, path, '..'), { recursive: true })
  writeFileSync(join(root, path), content)
}

/** Runs the builder on a fake artifacts folder holding `files`, returns the output folder. */
function build(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'site-'))
  dirs.push(root)
  for (const [path, content] of Object.entries(files)) file(join(root, 'in'), path, content)
  mkdirSync(join(root, 'in'), { recursive: true })
  const run = spawnSync('node', [script, join(root, 'in'), join(root, 'out')], { encoding: 'utf8' })
  expect(run.status).toBe(0)
  return { out: join(root, 'out'), log: run.stdout }
}

const read = (out: string, path: string) => readFileSync(join(out, path), 'utf8')

describe('quality site', () => {
  it('has the Allure report as its front page, with coverage and mutation beside it and its history at the root', () => {
    const { out, log } = build({
      'allure/index.html': '<title>Allure</title>', 'allure/app.js': 'js', 'allure/history.jsonl': '{"run":1}\n',
      'coverage/index.html': 'cov', 'mutation/index.html': 'mut', 'mutation/summary.json': '{"score":80}',
    })
    expect(read(out, 'index.html')).toBe('<title>Allure</title>')
    expect(read(out, 'app.js')).toBe('js')
    expect(read(out, 'history.jsonl')).toBe('{"run":1}\n')
    expect(read(out, 'coverage/index.html')).toBe('cov')
    expect(read(out, 'mutation/summary.json')).toBe('{"score":80}')
    expect(log).toContain('allure yes, coverage yes, mutation yes')
  })

  it('leaves no hand-built page, trend or per-project report behind', () => {
    const { out } = build({ 'allure/index.html': 'A', 'playwright-chromium/playwright-report/index.html': 'pw', 'unit/results.json': '{}' })
    for (const gone of ['summary.json', 'history.json', 'e2e', 'unit', 'playwright-chromium']) expect(existsSync(join(out, gone))).toBe(false)
  })

  it('keeps links to the earlier /allure/ address working', () => {
    const { out } = build({ 'allure/index.html': 'A' })
    expect(read(out, 'allure/index.html')).toContain('<meta http-equiv="refresh" content="0; url=../">')
  })

  it('still publishes a page that lists what exists when there is no Allure report', () => {
    const { out, log } = build({ 'coverage/index.html': 'cov' })
    const page = read(out, 'index.html')
    expect(page).toContain('No Allure report for this commit')
    expect(page).toContain('<a href="coverage/index.html">Coverage</a>')
    expect(page).not.toContain('Mutation testing')
    expect(log).toContain('allure no, coverage yes, mutation no')
  })

  it('does not take an artifact folder without an index for a report', () => {
    const { out } = build({ 'allure/history.jsonl': '{}\n' })
    expect(read(out, 'index.html')).toContain('No Allure report for this commit')
  })
})
