import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM build script without type declarations
import { ASSET_HEADERS, renderHeaders } from '../../../apps/web/scripts/asset-headers.mjs'
import { withSecurityHeaders } from '../../../apps/relay/src/headers'

describe('_headers for /_nuxt/*', () => {
  it('carries the security headers the Worker adds to a script, so the two copies cannot drift', () => {
    const fromWorker = withSecurityHeaders(new Response('x', { headers: { 'content-type': 'text/javascript' } }), '')
    const expected = Object.fromEntries(fromWorker.headers.entries())
    delete expected['content-type']
    const written = Object.fromEntries(Object.entries(ASSET_HEADERS as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]))
    expect(written).toEqual(expected)
  })

  it('writes one rule for /_nuxt/* and no cache header', () => {
    const body = renderHeaders() as string
    expect(body.startsWith('/_nuxt/*\n')).toBe(true)
    expect(body.split('\n').filter((l) => /^\S/.test(l) && l !== '')).toEqual(['/_nuxt/*'])
    expect(body.toLowerCase()).not.toContain('cache-control')
  })
})
