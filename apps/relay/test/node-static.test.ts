import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { candidates, createAssets, safePath } from '../src/adapters/node-static'

let root = ''
let outside = ''
const get = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init)

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'rb-static-'))
  root = join(dir, 'public')
  outside = join(dir, 'secret.txt')
  mkdirSync(join(root, '_nuxt'), { recursive: true })
  mkdirSync(join(root, 'boards'))
  mkdirSync(join(root, 'guide', 'en'), { recursive: true })
  writeFileSync(outside, 'secret')
  writeFileSync(join(root, 'index.html'), '<div id="__nuxt"></div>')
  writeFileSync(join(root, 'boards', 'index.html'), 'boards')
  writeFileSync(join(root, 'privacy.html'), 'privacy')
  writeFileSync(join(root, 'guide', 'en', 'index.html'), 'guide')
  writeFileSync(join(root, '_nuxt', 'app.js'), 'console.log(1)')
  writeFileSync(join(root, 'manifest.webmanifest'), '{}')
  writeFileSync(join(root, 'blob.unknown'), 'x')
  writeFileSync(join(root, '_headers'), '/*\n  X: y')
  symlinkSync(outside, join(root, 'leak.txt'))
  symlinkSync(join(root, '..'), join(root, 'up'))
})
afterAll(() => rmSync(join(root, '..'), { recursive: true, force: true }))

describe('candidates', () => {
  it('lists the file, the .html file and the directory index, in that order', () => {
    expect(candidates('/')).toEqual(['/index.html'])
    expect(candidates('/boards')).toEqual(['/boards', '/boards.html', '/boards/index.html'])
    expect(candidates('/boards/')).toEqual(['/boards/index.html', '/boards.html'])
  })
})

describe('safePath', () => {
  it('decodes once and refuses what cannot name a file inside the root', () => {
    expect(safePath('/a%20b')).toBe('/a b')
    for (const bad of ['/%E0%A4%A', '/a%00b', '/a\\b', '/../x', '/%2e%2e/x', '/a/%2e%2e/x', 'x']) expect(safePath(bad)).toBeNull()
  })
})

describe('createAssets', () => {
  it('serves the exact file, the .html file and the directory index with their types', async () => {
    const assets = createAssets(root)
    const js = await assets.fetch(get('/_nuxt/app.js'))
    expect([js.status, js.headers.get('content-type'), await js.text()]).toEqual([200, 'text/javascript; charset=utf-8', 'console.log(1)'])
    expect(await (await assets.fetch(get('/privacy'))).text()).toBe('privacy')
    expect(await (await assets.fetch(get('/boards'))).text()).toBe('boards')
    expect(await (await assets.fetch(get('/boards/'))).text()).toBe('boards')
    expect(await (await assets.fetch(get('/'))).text()).toContain('__nuxt')
    expect((await assets.fetch(get('/guide/en/'))).headers.get('content-type')).toContain('text/html')
    expect((await assets.fetch(get('/manifest.webmanifest'))).headers.get('content-type')).toBe('application/manifest+json')
    expect((await assets.fetch(get('/blob.unknown'))).headers.get('content-type')).toBe('application/octet-stream')
  })

  it('answers a missing file, hashed ones included, with a plain 404', async () => {
    const assets = createAssets(root)
    for (const path of ['/nope', '/_nuxt/gone.js', '/boards/x']) {
      const res = await assets.fetch(get(path))
      expect([res.status, res.headers.get('content-type')]).toEqual([404, 'text/plain; charset=utf-8'])
    }
  })

  it('never serves the build tool files, a path outside the root or a link that leaves it', async () => {
    const assets = createAssets(root)
    for (const path of ['/_headers', '/leak.txt', '/up/secret.txt', '/../secret.txt', '/%2e%2e/secret.txt', '/a%00', '/%E0%A4%A']) {
      expect((await assets.fetch(get(path))).status).toBe(404)
    }
  })

  it('answers a conditional GET with 304 and no body, a changed tag with the file', async () => {
    const assets = createAssets(root)
    const first = await assets.fetch(get('/_nuxt/app.js'))
    const etag = first.headers.get('etag') ?? ''
    expect(etag).toMatch(/^W\/"/)
    expect(first.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
    const same = await assets.fetch(get('/_nuxt/app.js', { headers: { 'If-None-Match': etag } }))
    expect([same.status, await same.text()]).toEqual([304, ''])
    expect((await assets.fetch(get('/_nuxt/app.js', { headers: { 'If-None-Match': 'W/"other"' } }))).status).toBe(200)
    expect((await assets.fetch(get('/_nuxt/app.js', { headers: { 'If-None-Match': `W/"x", ${etag}` } }))).status).toBe(304)
    expect((await assets.fetch(get('/_nuxt/app.js', { headers: { 'If-None-Match': '*' } }))).status).toBe(304)
  })

  it('answers HEAD with the headers and no body, and refuses other methods', async () => {
    const assets = createAssets(root)
    const head = await assets.fetch(get('/_nuxt/app.js', { method: 'HEAD' }))
    expect([head.status, head.headers.get('content-length'), await head.text()]).toEqual([200, '14', ''])
    expect((await assets.fetch(get('/_nuxt/app.js', { method: 'POST' }))).status).toBe(405)
  })

  it('accepts a URL string as the port contract allows', async () => {
    expect((await createAssets(root).fetch('http://localhost/privacy')).status).toBe(200)
  })
})
