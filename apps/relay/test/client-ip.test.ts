import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { clientIp } from '../src/core/client-ip'

const req = (headers: Record<string, string>) => new Request('https://retroboard.example/', { headers })

describe('clientIp', () => {
  it('reads the configured header', () => {
    expect(clientIp(req({ 'CF-Connecting-IP': '203.0.113.7' }), { CLIENT_IP_HEADER: 'CF-Connecting-IP' }, '10.0.0.1')).toBe('203.0.113.7')
  })

  it('ignores a forwarding header that is not configured, and uses the socket address', () => {
    const r = req({ 'X-Forwarded-For': '198.51.100.9', 'CF-Connecting-IP': '203.0.113.7', 'X-Real-IP': '192.0.2.1' })
    expect(clientIp(r, {}, '10.0.0.1')).toBe('10.0.0.1')
    expect(clientIp(r, { CLIENT_IP_HEADER: '  ' }, '10.0.0.1')).toBe('10.0.0.1')
    expect(clientIp(r, {}, null)).toBeNull()
  })

  it('does not let another header stand in for the configured one', () => {
    expect(clientIp(req({ 'X-Forwarded-For': '198.51.100.9' }), { CLIENT_IP_HEADER: 'CF-Connecting-IP' }, '10.0.0.1')).toBe('10.0.0.1')
    expect(clientIp(req({}), { CLIENT_IP_HEADER: 'CF-Connecting-IP' }, null)).toBeNull()
    expect(clientIp(req({ 'CF-Connecting-IP': '  ' }), { CLIENT_IP_HEADER: 'CF-Connecting-IP' }, '10.0.0.1')).toBe('10.0.0.1')
  })

  it('counts trusted proxies from the right of X-Forwarded-For, one by default', () => {
    const r = req({ 'X-Forwarded-For': '6.6.6.6, 198.51.100.9, 192.0.2.10' })
    const settings = { CLIENT_IP_HEADER: 'X-Forwarded-For' }
    expect(clientIp(r, settings, 's')).toBe('192.0.2.10')
    expect(clientIp(r, { ...settings, TRUSTED_PROXIES: '2' }, 's')).toBe('198.51.100.9')
    expect(clientIp(r, { ...settings, TRUSTED_PROXIES: '3' }, 's')).toBe('6.6.6.6')
    expect(clientIp(r, { ...settings, TRUSTED_PROXIES: '9' }, 's')).toBe('s')
    expect(clientIp(r, { ...settings, TRUSTED_PROXIES: 'x' }, 's')).toBe('192.0.2.10')
    expect(clientIp(r, { CLIENT_IP_HEADER: 'x-forwarded-for' }, 's')).toBe('192.0.2.10')
  })
})

describe('deployment configuration', () => {
  const text = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url).href), 'utf8')
  it('the hosted Worker names the edge header, so the page limiter never keys every client on one address', () => {
    expect(text('../../../wrangler.jsonc')).toMatch(/"CLIENT_IP_HEADER":\s*"CF-Connecting-IP"/)
    expect(text('../../../deploy/selfhost/wrangler.jsonc')).toMatch(/"CLIENT_IP_HEADER":\s*"CF-Connecting-IP"/)
  })
})
