/**
 * Board chat (change board-chat): plain text lines between the participants, kept in the signed event ledger
 * like everything else (so end-to-end encrypted and never stored on the server). The fold keeps the last
 * CHAT_MAX_MESSAGES lines, older ones leave every replica alike. Pure.
 */
import { CHAT_MAX_MESSAGES, CHAT_TEXT_MAX } from '../shared/limits'
import { done, fail, type HandlerMap } from '../shared/outcome'

export const chatHandlers: HandlerMap<'chat.post' | 'chat.clear'> = {
  'chat.post': (s, c, a, ctx) => {
    const text = c.text.trim()
    if (!text || text.length > CHAT_TEXT_MAX) return fail('invalid')
    const message = { id: ctx.newId(), cid: a.cid, name: a.showName && a.name ? a.name : null, at: ctx.now, text }
    return done({ ...s, chat: [...(s.chat ?? []), message].slice(-CHAT_MAX_MESSAGES) }, { meta: true })
  },
  /** Facilitators only (see PRIVILEGED_COMMANDS). */
  'chat.clear': (s) => ((s.chat ?? []).length ? done({ ...s, chat: [] }, { meta: true }) : done(s, {})),
}
