import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { invokesWorker, renderTable, runWorkerFirst, stripJsonc, tally } from '../worker-requests.mjs'

describe('worker request counting', () => {
  it('reads run_worker_first from the real wrangler.jsonc, comments and urls included', () => {
    expect(runWorkerFirst('{ // note\n "assets": { /* x */ "run_worker_first": true }, "u": "https://a.b/c" }')).toBe(true)
    expect(stripJsonc('{ "u": "https://a.b//c" } // tail')).toBe('{ "u": "https://a.b//c" } ')
    expect(runWorkerFirst('{}')).toBe(false)
  })

  it('sends every request through the Worker when the rule is true, none when false', () => {
    expect(invokesWorker('/_nuxt/a.js', true)).toBe(true)
    expect(invokesWorker('/', false)).toBe(false)
  })

  it('skips the paths a negative pattern excludes and keeps the rest', () => {
    const rule = ['/*', '!/_nuxt/*']
    expect(invokesWorker('/', rule)).toBe(true)
    expect(invokesWorker('/ws2', rule)).toBe(true)
    expect(invokesWorker('/_nuxt/entry.js', rule)).toBe(false)
    expect(invokesWorker('/_nuxt_other', rule)).toBe(true)
  })

  it('counts the hashed files and the Worker invocations of one load', () => {
    const urls = ['http://x/', 'http://x/_nuxt/a.js', 'http://x/_nuxt/b.css', 'http://x/ws2?room=r']
    expect(tally(urls, true)).toEqual({ total: 4, hashed: 2, worker: 4 })
    expect(tally(urls, ['/*', '!/_nuxt/*'])).toEqual({ total: 4, hashed: 2, worker: 2 })
  })

  it('renders one table row per page', () => {
    const row = { page: '/', cold: { total: 36, hashed: 35, worker: 36 }, revisit: { total: 36, hashed: 35, worker: 36 } }
    expect(renderTable([row]).split('\n')[2]).toBe('| `/` | 36 | 35 | 36 | 36 | 36 |')
  })
})
