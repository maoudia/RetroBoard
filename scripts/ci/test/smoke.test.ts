import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { runSmoke } from '../../smoke.mjs'

type Frame = Record<string, unknown>
type Sock = { onmessage?: (ev: { data: string }) => void; onerror?: () => void; onclose?: () => void; send(data: string): void; close(): void; room: string }

const BASE = 'http://127.0.0.1:8787'
const HOME = '<html><body><div id="__nuxt"></div></body></html>'
const SECURE = { 'content-security-policy': "default-src 'none'; script-src 'self'", 'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=15552000' }

/** A site that answers like production; `relay` decides whether /ws2 exists and what a foreign origin gets. */
function fakeSite(relay: { present: boolean; foreign: number; crosses: boolean }) {
  const rooms = new Map<string, Sock[]>()
  class FakeWebSocket implements Sock {
    onmessage?: (ev: { data: string }) => void
    onerror?: () => void
    onclose?: () => void
    room: string
    constructor(url: string) {
      const u = new URL(url)
      this.room = u.searchParams.get('room') ?? ''
      if (!relay.present) { queueMicrotask(() => this.onerror?.()); return }
      rooms.set(this.room, [...(rooms.get(this.room) ?? []), this])
      queueMicrotask(() => {
        this.emit({ t: 'welcome', conn: 'abc', peers: [] })
        this.emit({ t: 'hist', envs: [], done: true })
      })
    }
    emit(f: Frame) { this.onmessage?.({ data: JSON.stringify(f) }) }
    send(data: string) {
      if (!relay.crosses) return
      for (const s of rooms.get(this.room) ?? []) if (s !== this) (s as unknown as FakeWebSocket).emit(JSON.parse(data) as Frame)
    }
    close() { this.onclose?.() }
  }
  const html = (body: string) => ({ ok: true, status: 200, headers: new Headers(SECURE), text: async () => body })
  return {
    fetch: async (url: string) => (url.endsWith('/healthz') ? { ok: true, status: 200, headers: new Headers(), text: async () => 'ok' } : html(url.endsWith('/') ? HOME : 'page')),
    WebSocket: FakeWebSocket,
    upgrade: async () => relay.foreign,
    log: () => {},
    waitMs: 50,
  }
}

describe('the smoke test', () => {
  it('passes when the relay refuses a foreign origin, opens a board and forwards a live frame', async () => {
    expect(await runSmoke(BASE, fakeSite({ present: true, foreign: 403, crosses: true }))).toEqual([])
  })

  it('fails when the relay route is gone (a 404 is not a refusal) and no board can connect', async () => {
    const failures = await runSmoke(BASE, fakeSite({ present: false, foreign: 404, crosses: false })) as string[]
    expect(failures.some((f) => f.includes('403 to a foreign origin'))).toBe(true)
    expect(failures.some((f) => f.includes('board connection opens'))).toBe(true)
  })

  it('fails when a foreign origin gets in', async () => {
    const failures = await runSmoke(BASE, fakeSite({ present: true, foreign: 101, crosses: true })) as string[]
    expect(failures).toEqual(['relay answers 403 to a foreign origin on /ws2'])
  })

  it('fails when frames do not cross between two connections', async () => {
    const failures = await runSmoke(BASE, fakeSite({ present: true, foreign: 403, crosses: false })) as string[]
    expect(failures).toEqual(['a live frame crosses the relay between two connections'])
  })
})
