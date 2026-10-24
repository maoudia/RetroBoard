import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createBoard } from '@retroboard/domain'
import { ROOM_ID_RE } from '@retroboard/protocol'
import { buildCsp, originTrialToken, withSecurityHeaders } from '../src/headers'
import { roomHash } from '../src/logger'
import { isAllowedOrigin } from '../src/origin'
import { DurableStorageRepository } from '../src/repository'
import { ids } from '@retroboard/testkit'

class FakeStorage {
  data = new Map<string, unknown>()
  batches: number[] = []
  list() { return Promise.resolve(new Map(this.data)) }
  put(entries: Record<string, unknown>) { this.batches.push(Object.keys(entries).length); for (const [k, v] of Object.entries(entries)) this.data.set(k, v); return Promise.resolve() }
  delete(keys: string[]) { this.batches.push(keys.length); for (const k of keys) this.data.delete(k); return Promise.resolve(keys.length) }
  deleteAll() { this.data.clear(); return Promise.resolve() }
}
const repo = (s: FakeStorage) => new DurableStorageRepository(s as unknown as DurableObjectStorage)
const noDirty = { meta: false, notes: [], groups: [], actions: [], wipe: false }

describe('isAllowedOrigin', () => {
  const url = new URL('https://retroboard.example.workers.dev/ws?room=x')
  it('accepts the site itself and listed origins only', () => {
    expect(isAllowedOrigin('https://retroboard.example.workers.dev', url, undefined)).toBe(true)
    expect(isAllowedOrigin('https://evil.example', url, undefined)).toBe(false)
    expect(isAllowedOrigin('https://app.example.com', url, 'https://x.io, https://app.example.com')).toBe(true)
    expect(isAllowedOrigin(null, url, undefined)).toBe(false)
    expect(isAllowedOrigin('not a url', url, undefined)).toBe(false)
  })
})

describe('room ids', () => {
  it('accept url-safe 22 to 64 chars only', () => {
    expect(ROOM_ID_RE.test('a'.repeat(22))).toBe(true)
    expect(ROOM_ID_RE.test('a'.repeat(21))).toBe(false)
    expect(ROOM_ID_RE.test('a'.repeat(22) + '/../')).toBe(false)
  })
  it('hash to a short tag that does not reveal the id', async () => {
    const h = await roomHash('a'.repeat(22))
    expect(h).toMatch(/^[0-9a-f]{8}$/)
    expect(h).not.toContain('aaaa')
  })
})

describe('security headers', () => {
  it('builds a strict CSP with the build hashes', () => {
    const csp = buildCsp({ scripts: ['sha256-AAA'], styles: ['sha256-BBB'] })
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("script-src 'self' 'sha256-AAA'")
    expect(csp).toContain("style-src 'self' 'sha256-BBB'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-')
  })
  it('adds the CSP to html only, other headers to everything', () => {
    const html = withSecurityHeaders(new Response('<p>', { headers: { 'content-type': 'text/html' } }), 'default-src none')
    const js = withSecurityHeaders(new Response('x', { headers: { 'content-type': 'text/javascript' } }), 'default-src none')
    expect(html.headers.get('Content-Security-Policy')).toBe('default-src none')
    expect(js.headers.get('Content-Security-Policy')).toBeNull()
    for (const r of [html, js]) {
      expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(r.headers.get('Referrer-Policy')).toBe('no-referrer')
      expect(r.headers.get('X-Frame-Options')).toBe('DENY')
    }
  })
})

describe('DurableStorageRepository', () => {
  it('returns null for an empty room', async () => {
    expect(await repo(new FakeStorage()).load()).toBeNull()
  })

  it('round-trips a board and applies incremental changes', async () => {
    const s = new FakeStorage()
    const r = repo(s)
    const state = createBoard({ newId: ids() })
    await r.persist(state, { ...noDirty, wipe: true })
    const col = state.columns[0]!.id
    state.notes.n1 = { id: 'n1', columnId: col, text: 'hello', color: 0, authorCid: 'c', authorName: null, createdAt: 1, groupId: null, votes: [] } as never
    await r.persist(state, { ...noDirty, notes: ['n1'] })
    expect(Object.keys((await r.load())!.notes)).toEqual(['n1'])
    delete state.notes.n1
    await r.persist(state, { ...noDirty, notes: ['n1'] })
    expect(Object.keys((await r.load())!.notes)).toEqual([])
  })

  it('writes in batches within the storage limit', async () => {
    const s = new FakeStorage()
    const r = repo(s)
    const state = createBoard({ newId: ids() })
    for (let i = 0; i < 300; i++) state.notes[`n${i}`] = { id: `n${i}` } as never
    await r.persist(state, { ...noDirty, wipe: true })
    expect(Math.max(...s.batches)).toBeLessThanOrEqual(128)
    expect(Object.keys((await r.load())!.notes)).toHaveLength(300)
  })

  it('erases everything', async () => {
    const s = new FakeStorage()
    const r = repo(s)
    await r.persist(createBoard({ newId: ids() }), { ...noDirty, wipe: true })
    await r.erase()
    expect(await r.load()).toBeNull()
  })
})

describe('origin trial (WebMCP)', () => {
  const tokens = { 'retroboard.maoudia.com': 'TOKEN-PROD', 'retroboard-dev.maoudia.com': 'TOKEN-DEV' }

  it('picks the token of the request host only', () => {
    expect(originTrialToken('retroboard.maoudia.com', tokens)).toBe('TOKEN-PROD')
    expect(originTrialToken('RETROBOARD-DEV.maoudia.com', tokens)).toBe('TOKEN-DEV')
    expect(originTrialToken('localhost:8787', tokens)).toBeNull()
    expect(originTrialToken('retroboard.maoudia.com', undefined)).toBeNull()
  })

  it('adds the Origin-Trial header to HTML only', () => {
    const html = withSecurityHeaders(new Response('<p>', { headers: { 'content-type': 'text/html' } }), 'x', 'TOKEN-PROD')
    const js = withSecurityHeaders(new Response('x', { headers: { 'content-type': 'text/javascript' } }), 'x', 'TOKEN-PROD')
    expect(html.headers.get('Origin-Trial')).toBe('TOKEN-PROD')
    expect(js.headers.get('Origin-Trial')).toBeNull()
  })

  it('wrangler config holds one token per registered origin, matching its host', () => {
    const raw = readFileSync(fileURLToPath(new URL('../../../wrangler.jsonc', import.meta.url).href), 'utf8')
    const block = raw.slice(raw.indexOf('"ORIGIN_TRIAL_TOKENS"'))
    const pairs = [...block.matchAll(/"([a-z0-9.-]+)":\s*"([A-Za-z0-9+/=]+)"/g)].slice(0, 3)
    expect(pairs).toHaveLength(3)
    for (const [, host, token] of pairs) {
      const payload = Buffer.from(token!, 'base64').toString('latin1')
      expect(payload).toContain(`"origin":"https://${host}:443"`)
      expect(payload).toContain('"feature":"WebMCP"')
    }
  })
})

describe('legacy boards stored by older versions', () => {
  it('load with defaults for newer settings, cluster voters and action statuses', async () => {
    const { upgradeAction } = await import('../src/repository')
    const s = new FakeStorage()
    s.data.set('meta', { settings: { title: 'Old', voteLimit: 3, secretVoting: false, locked: false, themeId: 'studio', templateId: null, initialized: true }, columns: [], timer: { running: false, endsAt: 0, remaining: 1, length: 1 } })
    s.data.set('g:g1', { id: 'g1', columnId: 'c', title: null })
    s.data.set('a:a1', { id: 'a1', text: 'x', owner: '', done: true, createdAt: 5 })
    const state = (await repo(s).load())!
    expect([state.settings.maxVotesPerItem, state.settings.votable, state.settings.actionMode, state.agenda]).toEqual([1, 'both', 'checkbox', null])
    expect(state.groups.g1!.voters).toEqual([])
    expect(state.actions.a1).toMatchObject({ status: 'done', done: true, history: [{ status: 'done', at: 5 }], due: null, carriedFrom: null })
    expect(upgradeAction({ id: 'b', text: 'y', owner: '', done: false, createdAt: 1 }).status).toBe('todo')
  })
})
