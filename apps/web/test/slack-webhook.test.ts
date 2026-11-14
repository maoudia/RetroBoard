import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { isSlackWebhook, postToSlack } from '../app/utils/slack-webhook'

const URL_OK = 'https://hooks.slack.com/services/T0123ABCD/B0456EFGH/abcDEF123456'

describe('isSlackWebhook', () => {
  it('accepts a Slack incoming webhook URL, with or without surrounding spaces', () => {
    expect(isSlackWebhook(URL_OK)).toBe(true)
    expect(isSlackWebhook(`  ${URL_OK}\n`)).toBe(true)
  })
  it('refuses anything else: other hosts, plain http, credentials, port, query, other paths', () => {
    for (const bad of [
      '', 'not a url', 'http://hooks.slack.com/services/T0/B0/x', 'https://evil.example/services/T0/B0/x',
      'https://hooks.slack.com.evil.example/services/T0/B0/x', 'https://user:pw@hooks.slack.com/services/T0/B0/x',
      'https://hooks.slack.com:8443/services/T0/B0/x', 'https://hooks.slack.com/services/T0/B0/x?a=1', 'https://hooks.slack.com/services/T0/B0/x#h',
      'https://hooks.slack.com/services/T0/B0', 'https://hooks.slack.com/other/T0/B0/x', 'https://hooks.slack.com/services/t0/b0/x',
    ]) expect(isSlackWebhook(bad), bad).toBe(false)
  })
})

describe('postToSlack', () => {
  const ok = () => Promise.resolve(new Response('ok', { status: 200 }))

  it('posts the summary as JSON in a text/plain body: no preflight, no credentials, no referrer', async () => {
    const send = vi.fn(ok)
    expect(await postToSlack(URL_OK, '*Sprint 42*\n- <x> & y', send)).toBe('sent')
    expect(send).toHaveBeenCalledOnce()
    const [url, init] = send.mock.calls[0]!
    expect(url).toBe(URL_OK)
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', referrerPolicy: 'no-referrer' })
    expect(JSON.parse(init!.body as string)).toEqual({ text: '*Sprint 42*\n- <x> & y' })
  })

  it('never calls the network for a URL that is not a Slack webhook', async () => {
    const send = vi.fn(ok)
    expect(await postToSlack('https://evil.example/collect', 'secret retro', send)).toBe('invalid')
    expect(send).not.toHaveBeenCalled()
  })

  it('tells a refusal from Slack apart from a network failure', async () => {
    expect(await postToSlack(URL_OK, 'x', () => Promise.resolve(new Response('no_service', { status: 404 })))).toBe('rejected')
    expect(await postToSlack(URL_OK, 'x', () => Promise.reject(new TypeError('Failed to fetch')))).toBe('unreachable')
  })
})

describe('the webhook never travels', () => {
  const root = join(import.meta.dirname, '..', '..', '..')
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.nuxt' || e.name === '.output') return []
    const p = join(dir, e.name)
    return e.isDirectory() ? files(p) : /\.(ts|vue)$/.test(e.name) ? [p] : []
  })

  it('is read only by the settings, the export panel, the settings file filter and the sync list that excludes it; no other package or the relay knows it', () => {
    const users = [...files(join(root, 'apps/web/app')), ...files(join(root, 'apps/relay/src')), ...files(join(root, 'packages'))]
      .filter((f) => readFileSync(f, 'utf8').includes('slackWebhook'))
      .map((f) => f.slice(root.length + 1))
      .sort()
    // settings-sync.ts names it only in LOCAL_ONLY_SETTINGS, the list of what never syncs (change user-drive-storage).
    expect(users).toEqual(['apps/web/app/components/ExportDialog.vue', 'apps/web/app/stores/settings.ts', 'apps/web/app/utils/settings-file.ts', 'packages/application/src/storage/settings-sync.ts'])
  })
})
