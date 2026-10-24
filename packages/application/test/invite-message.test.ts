import { describe, expect, it } from 'vitest'
import { chatInvite, emailInvite, mailtoHref, type Translate } from '../src'

// A fake translator that shows which key and params were used.
const t: Translate = (key, params) => (params ? `${key}(${Object.values(params).join(',')})` : key)
const url = 'https://retroboard.maoudia.com/board#r=Ab3dEfGhIjKlMnOpQrStUv&k=abc&p=1'

describe('invite messages', () => {
  it('chat: title, link, and a reminder to send the passcode apart', () => {
    expect(chatInvite({ title: '  Sprint\n42 ', url, passcodeProtected: true }, t).body).toBe(`invite.chat.lead(Sprint 42)\n${url}\ninvite.passcodeSeparately`)
    expect(chatInvite({ title: 'Sprint 42', url, passcodeProtected: false }, t).body).toBe(`invite.chat.lead(Sprint 42)\n${url}`)
  })

  it('email: subject and body, untitled fallback', () => {
    const m = emailInvite({ title: '   ', url, passcodeProtected: false }, t)
    expect(m.subject).toBe('invite.email.subject(invite.untitled)')
    expect(m.body).toBe(`invite.email.hello\n\ninvite.email.lead(invite.untitled)\n${url}\n\ninvite.email.noAccount`)
    expect(emailInvite({ title: 'R', url, passcodeProtected: true }, t).body.endsWith('\n\ninvite.passcodeSeparately')).toBe(true)
  })

  it('never contains a facilitator secret since only the participant link is given', () => {
    const body = chatInvite({ title: 'x', url, passcodeProtected: true }, t).body + emailInvite({ title: 'x', url, passcodeProtected: true }, t).body
    expect(body).not.toMatch(/[#&]f=/)
  })

  it('mailto encodes subject and body', () => {
    expect(mailtoHref({ subject: 'Rétro & co', body: 'a\nb' })).toBe('mailto:?subject=R%C3%A9tro%20%26%20co&body=a%0Ab')
    expect(mailtoHref({ body: 'x' })).toBe('mailto:?subject=&body=x')
  })
})
