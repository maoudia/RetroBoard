/**
 * The fake Microsoft identity platform and Graph of the e2e harness (change user-drive-storage, group 3), on a real port so the
 * OneDrive worker of the page under test talks to it as it would to Microsoft. The Worker serves its origin in the policy of
 * `/sync/onedrive.js` only (`FAKE_PROVIDER_ORIGINS`), and `/providers.json` points the endpoints at it. Each test signs in as an
 * account of its own (a cookie on the authorize navigation), so tests that run in parallel never meet in the same app folder.
 * `/__fake/*` is the test's remote control; a browser under test never calls it.
 */
import { createServer } from 'node:http'
import { createFakeGraph } from '@retroboard/testkit'

const port = Number(process.env.E2E_GRAPH_PORT ?? 8789)
const site = `http://127.0.0.1:${process.env.E2E_PORT ?? 8787}`
export const E2E_CLIENT_ID = '11111111-2222-4333-8444-555555555555'

const fake = createFakeGraph({ origin: `http://127.0.0.1:${port}`, clientId: E2E_CLIENT_ID, redirectUris: [`${site}/storage/callback`] })

interface Control { action: string; account?: string; alive?: boolean; times?: number; seconds?: number; error?: string; canaries?: string[]; status?: number }

function control(c: Control): unknown {
  switch (c.action) {
    case 'expire': fake.expireAccessTokens(c.account); return {}
    case 'revoke': fake.revokeRefreshTokens(c.account); return {}
    case 'session': fake.setSession(c.alive ?? true, c.account); return {}
    case 'deny': fake.denyNextAuthorize(c.error ?? 'access_denied'); return {}
    case 'throttle': fake.fail({ status: 429, headers: { 'Retry-After': String(c.seconds ?? 1) }, times: c.times ?? 1, when: (r) => r.account === c.account }); return {}
    case 'fail': fake.fail({ status: c.status ?? 500, times: c.times ?? 1, when: (r) => r.account === c.account }); return {}
    case 'objects': return { paths: [...fake.objects(c.account).keys()] }
    case 'stats': return { ...fake.stats }
    case 'plaintext':
      try { fake.assertNoPlaintext(c.canaries ?? []); return { ok: true } } catch (e) { return { ok: false, message: (e as Error).message } }
    default: return { error: 'unknown action' }
  }
}

const server = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', (c: Buffer) => chunks.push(c))
  req.on('end', () => {
    void (async () => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
      const body = Buffer.concat(chunks)
      if (url.pathname === '/healthz') { res.writeHead(200).end('ok'); return }
      if (url.pathname === '/__fake/control' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(control(JSON.parse(body.toString('utf8')) as Control)))
        return
      }
      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
      const answer = await fake.fetch(url, { method: req.method ?? 'GET', headers, ...(req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS' ? {} : { body }), redirect: 'manual' })
      const out: Record<string, string> = {}
      answer.headers.forEach((v, k) => { out[k] = v })
      res.writeHead(answer.status, out).end(Buffer.from(await answer.arrayBuffer()))
    })().catch(() => { res.writeHead(500).end('fake graph failed') })
  })
})

server.listen(port, '127.0.0.1', () => { console.log(`fake graph on http://127.0.0.1:${port}`) })
