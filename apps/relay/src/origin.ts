import { ROOM_ID_RE } from '@retroboard/protocol'

/** WebSocket upgrades are only accepted from the site itself, or from origins listed in ALLOWED_ORIGINS. */
export function isAllowedOrigin(origin: string | null, url: URL, extra: string | undefined): boolean {
  if (!origin) return false
  try {
    if (new URL(origin).host === url.host) return true
  } catch { return false }
  return (extra ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(origin)
}

export type Admission =
  | { ok: true; room: string }
  | { ok: false; status: 400 | 403 | 426; reason: 'upgrade' | 'origin' | 'room'; text: string }

/** Whether a request may open a room: a WebSocket upgrade, from an allowed origin, for a well-formed room id. Pure. */
export function admitUpgrade(upgrade: string | null, origin: string | null, url: URL, extra: string | undefined): Admission {
  if (upgrade !== 'websocket') return { ok: false, status: 426, reason: 'upgrade', text: 'Expected WebSocket' }
  if (!isAllowedOrigin(origin, url, extra)) return { ok: false, status: 403, reason: 'origin', text: 'Forbidden origin' }
  const room = url.searchParams.get('room') ?? ''
  if (!ROOM_ID_RE.test(room)) return { ok: false, status: 400, reason: 'room', text: 'Invalid room' }
  return { ok: true, room }
}
