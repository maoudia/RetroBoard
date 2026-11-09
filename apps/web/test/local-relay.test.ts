import { describe, expect, it } from 'vitest'
import { FRAME_MAX, MAX_FRAME_BYTES } from '@retroboard/protocol'
import { LocalRelaySocket } from '../app/transport/local-relay'

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'
const env = (i: number) => ({ v: 2, room: ROOM, id: `01J${String(i).padStart(23, '0')}`, hlc: i, ct: 'AAAA' })
const pub = (i: number) => JSON.stringify({ t: 'pub', envs: [env(i)] })

async function open(room: string) {
  const ws = new LocalRelaySocket(`/ws?room=${room}`)
  const closes: Array<{ code: number; reason: string }> = []
  const frames: string[] = []
  ws.onclose = (ev) => closes.push(ev)
  ws.onmessage = (ev) => frames.push(String(ev.data))
  await Promise.resolve()
  return { ws, closes, frames }
}

describe('the in-tab relay applies the real relay budgets', () => {
  it('closes with 1009 on an oversized frame, like the Durable Object', async () => {
    const { ws, closes } = await open('big')
    ws.send('x'.repeat(MAX_FRAME_BYTES + 1))
    expect(closes).toEqual([{ code: 1009, reason: 'Message too large' }])
    expect(ws.readyState).toBe(3)
  })

  it('closes with 1008 above the board frame budget, like the Durable Object', async () => {
    const { ws, closes } = await open('rate')
    for (let i = 0; i < FRAME_MAX; i++) ws.send(pub(i))
    expect(closes).toEqual([])
    ws.send(pub(FRAME_MAX))
    expect(closes).toEqual([{ code: 1008, reason: 'Rate limit' }])
  })

  it('keeps a board a reconnect replays, and answers ping with pong', async () => {
    const first = await open('replay')
    first.ws.send(pub(1))
    first.ws.close()
    expect(first.closes).toEqual([{ code: 1000, reason: '' }])
    const second = await open('replay')
    expect(second.frames.some((f) => f.includes('"hist"'))).toBe(true)
    const seen = second.frames.length
    second.ws.send('ping')
    expect(second.frames.slice(seen)).toEqual(['pong'])
  })
})
