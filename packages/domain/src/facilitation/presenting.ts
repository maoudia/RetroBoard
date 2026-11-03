/**
 * Presenting announcement (change toast-notifications-v2): whoever starts the presentation view tells the room,
 * so everybody sees who is presenting. Kept in the signed ledger like the chat; never stored on the server. Pure.
 */
import { done, type HandlerMap } from '../shared/outcome'

export const presentingHandlers: HandlerMap<'presenter.set'> = {
  'presenter.set': (s, c, a, ctx) => {
    if (c.on) return done({ ...s, presenting: { cid: a.cid, name: a.showName && a.name ? a.name : null, at: ctx.now } }, { meta: true })
    // Only the one who started it (or nobody) clears it; a late "off" from someone else changes nothing.
    if (!s.presenting || s.presenting.cid !== a.cid) return done(s, {})
    return done({ ...s, presenting: null }, { meta: true })
  },
}
