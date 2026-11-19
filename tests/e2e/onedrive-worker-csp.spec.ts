import { createHash, randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'

const GRAPH = `http://127.0.0.1:${process.env.E2E_GRAPH_PORT ?? 8789}`
const CLIENT = '11111111-2222-4333-8444-555555555555'

/**
 * Change user-drive-storage, task 3.1, in every engine: a dedicated worker takes the Content-Security-Policy of its own script
 * response, not the page's. The page cannot reach the provider origin at all; the worker can, and only that origin; a redirect
 * hop is judged by the worker's policy too. This is what lets the OneDrive origins exist for a person who connects, and nowhere else.
 */
test('the OneDrive worker reaches the provider and nothing else, and the page cannot reach the provider', async ({ page, request, baseURL }) => {
  const policy = (await request.get('/sync/onedrive.js')).headers()['content-security-policy']!
  expect(policy).toBe(`default-src 'none'; connect-src https://login.microsoftonline.com https://graph.microsoft.com https://*.up.1drv.com https://*.files.1drv.com ${GRAPH}`)
  const pagePolicy = (await request.get('/boards')).headers()['content-security-policy']!
  expect(pagePolicy).not.toContain(GRAPH)
  expect(pagePolicy).not.toMatch(/microsoft|1drv/)

  // A sign-in code from the fake, made the way the page would (PKCE), so the worker can hold a token.
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const redirectUri = `${baseURL}/storage/callback`
  const authorize = new URL(`${GRAPH}/consumers/oauth2/v2.0/authorize`)
  for (const [k, v] of Object.entries({ client_id: CLIENT, response_type: 'code', redirect_uri: redirectUri, state: 's', code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' })) authorize.searchParams.set(k, v)
  const code = new URL((await request.get(authorize.toString(), { maxRedirects: 0 })).headers().location!).searchParams.get('code')!

  await page.goto('/privacy')
  const result = await page.evaluate(async ({ graph, site, code, verifier, redirectUri, client }) => {
    const out: Record<string, string> = {}
    // The page itself is held to the page policy: the provider origin is not in it.
    try { await fetch(`${graph}/healthz`); out.page = 'allowed' } catch { out.page = 'blocked' }

    const worker = new Worker('/sync/onedrive.js')
    let next = 1
    const waiting = new Map<number, (r: { ok: boolean; code?: string; value?: { objects?: unknown[]; refreshToken?: string } }) => void>()
    worker.onmessage = (e: MessageEvent) => { waiting.get(e.data.id)?.(e.data); waiting.delete(e.data.id) }
    const call = (body: Record<string, unknown>) => new Promise<{ ok: boolean; code?: string; value?: { objects?: unknown[]; refreshToken?: string } }>((resolve) => { const id = next++; waiting.set(id, resolve); worker.postMessage({ id, ...body }) })

    // The worker starts under the page policy (it falls back to script-src 'self') and works against the provider.
    await call({ op: 'config', config: { clientId: client, authority: `${graph}/consumers`, graph: `${graph}/v1.0`, redirectUri } })
    const exchanged = await call({ op: 'exchange', code, verifier })
    out.exchange = exchanged.ok ? 'ok' : `failed ${exchanged.code}`
    const listed = await call({ op: 'list', prefix: 's/' })
    out.provider = listed.ok ? 'allowed' : `blocked ${listed.code}`

    // The same worker pointed at the site's own origin: Graph calls there are not in its policy (a 404 would have been an empty listing).
    await call({ op: 'config', config: { clientId: client, authority: `${graph}/consumers`, graph: `${site}/v1.0`, redirectUri } })
    await call({ op: 'restore', refreshToken: exchanged.value?.refreshToken })
    const own = await call({ op: 'list', prefix: 's/' })
    out.siteOrigin = own.ok ? 'allowed' : `blocked ${own.code}`

    // And at an origin that is not named at all.
    await call({ op: 'config', config: { clientId: client, authority: `${graph}/consumers`, graph: 'https://example.invalid/v1.0', redirectUri } })
    await call({ op: 'restore', refreshToken: exchanged.value?.refreshToken })
    const other = await call({ op: 'list', prefix: 's/' })
    out.other = other.ok ? 'allowed' : `blocked ${other.code}`
    worker.terminate()
    return out
  }, { graph: GRAPH, site: baseURL!, code, verifier, redirectUri, client: CLIENT })

  expect(result).toEqual({ page: 'blocked', exchange: 'ok', provider: 'allowed', siteOrigin: 'blocked unreachable', other: 'blocked unreachable' })
})

test('the page that loads no provider script has no provider origin anywhere', async ({ request }) => {
  for (const path of ['/', '/boards', '/new', '/storage/callback']) {
    const csp = (await request.get(path)).headers()['content-security-policy']!
    expect(csp, path).toContain("connect-src 'self' https://hooks.slack.com;")
    expect(csp, path).not.toMatch(/microsoft|1drv/)
    expect(csp, path).not.toContain(GRAPH)
  }
})
