import { expect, test } from '@playwright/test'

// Hashed files are served by the asset layer without the Worker (change prod-guardrails, ADR-0034).
test('a hashed file carries its security headers, a missing one is an uncacheable 404, HTML keeps its CSP', async ({ page, request }) => {
  const landing = await request.get('/')
  expect(landing.headers()['content-security-policy']).toContain("default-src 'none'")

  const entry = (await landing.text()).match(/\/_nuxt\/[\w.-]+\.js/)?.[0]
  expect(entry).toBeTruthy()
  const script = await request.get(entry!)
  expect(script.status()).toBe(200)
  expect(script.headers()['content-type']).toContain('javascript')
  expect(script.headers()['strict-transport-security']).toContain('max-age=')
  expect(script.headers()['x-content-type-options']).toBe('nosniff')
  expect(script.headers()['x-frame-options']).toBe('DENY')
  expect(script.headers()['cache-control'] ?? '').not.toContain('immutable')

  const gone = await request.get('/_nuxt/gone-after-deploy.js')
  expect(gone.status()).toBe(404)
  expect(gone.headers()['cache-control']).toBeUndefined()
  expect(gone.headers()['content-type'] ?? '').not.toContain('text/html')

  // An unknown path (the user guide included) is the branded 404, not the shell.
  for (const path of ['/nope', '/guide/nope']) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(404)
  }
})
