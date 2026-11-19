import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterAll, describe, expect, it } from 'vitest'
import { PAGE, REDIRECT, bytesOf, fakeWithCode } from './onedrive-helpers'
import type { WorkerReply, WorkerRequest } from '../app/adapters/sync/onedrive-protocol'

/** The script the Worker serves at /sync/onedrive.js, built the way `pnpm generate` builds it, run in an empty scope with only a fake network. */
const out = mkdtempSync(join(tmpdir(), 'rb-sync-worker-'))
afterAll(() => rmSync(out, { recursive: true, force: true }))

async function startWorker() {
  const builder = '../scripts/build-sync-workers.mjs'
  const { buildSyncWorkers } = (await import(/* @vite-ignore */ builder)) as { buildSyncWorkers(dir: string): Promise<Record<string, string>> }
  const source = readFileSync((await buildSyncWorkers(out)).onedrive!, 'utf8')
  const { fake, verifier, code } = await fakeWithCode()
  const replies: WorkerReply[] = []
  const scope: Record<string, unknown> = {
    postMessage: (m: WorkerReply) => replies.push(m),
    onmessage: null,
    fetch: fake.fetchFrom(PAGE),
    URL, URLSearchParams, TextEncoder, TextDecoder, setTimeout, clearTimeout, Headers, Request, Response, AbortController,
  }
  scope.self = scope
  // `globalThis` of the script is the scope: what it can reach is exactly what is listed above.
  runInNewContext(source, scope)
  const send = async (request: WorkerRequest) => {
    const before = replies.length
    ;(scope.onmessage as (e: { data: WorkerRequest }) => void)({ data: request })
    for (let i = 0; i < 500 && !replies.slice(before).some((r) => 'id' in r && r.id === request.id); i++) await new Promise((r) => setTimeout(r, 2))
    return replies.slice(before).find((r) => 'id' in r && r.id === request.id) as Extract<WorkerReply, { id: number }>
  }
  return { fake, verifier, code, send, replies, source }
}

describe('the built OneDrive worker script', () => {
  it('is one small self-contained file that names no origin of its own and holds no key code', async () => {
    const { source } = await startWorker()
    expect(source.length).toBeLessThan(20_000)
    expect(source).not.toMatch(/import\s|require\(|importScripts|eval\(/)
    expect(source).not.toMatch(/https?:\/\//)
    expect(source).not.toMatch(/AES-GCM|deriveKey|HKDF|argon/i)
  })

  it('answers the page: configure, trade the code for tokens, then write, list, read and delete through the fake Graph', async () => {
    const { fake, verifier, code, send, replies } = await startWorker()
    expect(await send({ id: 1, op: 'config', config: { clientId: fake.clientId, authority: fake.authority, graph: fake.graph, redirectUri: REDIRECT } })).toMatchObject({ ok: true })
    const exchanged = await send({ id: 2, op: 'exchange', code, verifier })
    expect(exchanged).toMatchObject({ ok: true })
    expect((exchanged as { value: { refreshToken?: string } }).value.refreshToken).toMatch(/^rt-/)
    expect(replies.some((r) => 'event' in r && r.event === 'refresh-token')).toBe(true)
    const body = bytesOf(2048)
    expect(await send({ id: 3, op: 'put', path: 's/aaaa/x.rbs', bytes: body })).toMatchObject({ ok: true })
    const listed = await send({ id: 4, op: 'list', prefix: 's/' })
    expect((listed as { value: { objects: { path: string }[] } }).value.objects.map((o) => o.path)).toEqual(['s/aaaa/x.rbs'])
    const read = await send({ id: 5, op: 'get', path: 's/aaaa/x.rbs' })
    expect(Array.from((read as { value: { found: { bytes: Uint8Array } } }).value.found.bytes)).toEqual(Array.from(body))
    expect(await send({ id: 6, op: 'delete', path: 's/aaaa/x.rbs' })).toMatchObject({ ok: true })
    expect((await send({ id: 7, op: 'stat', path: 's/aaaa/x.rbs' }) as { value: { info: unknown } }).value.info).toBeNull()
  })

  it('says only a code when something fails, never a message, a path or a body', async () => {
    const { fake, send } = await startWorker()
    expect(await send({ id: 1, op: 'get', path: 's/aaaa/x.rbs' })).toEqual({ id: 1, ok: false, code: 'unsupported' })
    await send({ id: 2, op: 'config', config: { clientId: fake.clientId, authority: fake.authority, graph: fake.graph, redirectUri: REDIRECT } })
    expect(await send({ id: 3, op: 'get', path: 's/aaaa/x.rbs' })).toEqual({ id: 3, ok: false, code: 'auth-expired' })
    expect(await send({ id: 4, op: 'restore', refreshToken: 'rt-unknown' })).toMatchObject({ ok: true })
    expect(await send({ id: 5, op: 'get', path: 'Bad Path' })).toEqual({ id: 5, ok: false, code: 'unsupported' })
  })
})
