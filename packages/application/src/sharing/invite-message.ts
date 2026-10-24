/**
 * Ready-to-paste invitations (change frictionless-sharing). The passcode is never an input:
 * it must travel in another message, so a template cannot leak it.
 */
export type Translate = (key: string, params?: Record<string, string | number>) => string

export interface InviteInput {
  readonly title: string
  /** Participant link (never the facilitator link). */
  readonly url: string
  readonly passcodeProtected: boolean
}

export interface InviteMessage { readonly subject?: string; readonly body: string }

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Short message for a team chat (Slack, Teams, Mattermost...). */
export function chatInvite(input: InviteInput, t: Translate): InviteMessage {
  const title = clean(input.title) || t('invite.untitled')
  const lines = [t('invite.chat.lead', { title }), input.url]
  if (input.passcodeProtected) lines.push(t('invite.passcodeSeparately'))
  return { body: lines.join('\n') }
}

/** E-mail with a subject line. */
export function emailInvite(input: InviteInput, t: Translate): InviteMessage {
  const title = clean(input.title) || t('invite.untitled')
  const lines = [t('invite.email.hello'), '', t('invite.email.lead', { title }), input.url, '', t('invite.email.noAccount')]
  if (input.passcodeProtected) lines.push('', t('invite.passcodeSeparately'))
  return { subject: t('invite.email.subject', { title }), body: lines.join('\n') }
}

/** mailto: link that opens the participant's own mail app (nothing goes through our servers). */
export const mailtoHref = (m: InviteMessage): string =>
  `mailto:?subject=${encodeURIComponent(m.subject ?? '')}&body=${encodeURIComponent(m.body)}`
