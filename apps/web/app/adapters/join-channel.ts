import { parseRelayFrame } from '@retroboard/protocol'
import { buildWs2Url } from '~/transport/encrypted'
import { joinRoomId, type JoinMsg, openJoinMsg, sealJoinMsg } from '~/utils/join-code'

/**
 * The side room of a join code on the relay (change short-links-and-join): sealed messages in both directions.
 * Used by the person holding the board and by the joiner. Nothing here touches board data.
 */
export interface JoinChannel {
  send(msg: JoinMsg): void
  close(): void
}

export async function openJoinChannel(
  code: string, wsUrl: string, handlers: { onMessage: (m: JoinMsg) => void, onOpen?: () => void, onClose?: () => void, WS?: typeof WebSocket },
): Promise<JoinChannel> {
  const room = await joinRoomId(code)
  const WS = handlers.WS ?? WebSocket
  const ws = new WS(buildWs2Url(wsUrl, room, window.location))
  let beat: ReturnType<typeof setInterval> | undefined
  let closed = false
  ws.onopen = () => { beat = setInterval(() => { if (ws.readyState === 1) ws.send('ping') }, 25_000) }
  ws.onmessage = (ev: MessageEvent) => {
    if (ev.data === 'pong') return
    let raw: unknown
    try { raw = JSON.parse(String(ev.data)) } catch { return }
    const frame = parseRelayFrame(raw)
    if (!frame) return
    if (frame.t === 'welcome') handlers.onOpen?.()
    else if (frame.t === 'eph') void openJoinMsg(code, frame.env).then((m) => { if (m && !closed) handlers.onMessage(m) })
  }
  ws.onclose = () => { clearInterval(beat); if (!closed) handlers.onClose?.() }
  ws.onerror = () => { /* onclose follows */ }
  return {
    send: (msg) => { void sealJoinMsg(code, room, msg).then((env) => { if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'eph', env })) }) },
    close: () => { closed = true; clearInterval(beat); try { ws.close() } catch { /* already closed */ } },
  }
}
