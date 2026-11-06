import { describe, expect, it, vi } from 'vitest'
import { buildReport } from '@retroboard/application'
import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import { DECRYPT_SCRIPT, toEncryptedReportHtml, toReportHtml } from '../src'

const t = (key: string) => key
const report = () => {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Secret retro' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'Confidential idea' })
  return buildReport(buildSnapshot(h.state, { cid: alice.cid }, [], h.now), new Date('2026-11-06T10:00:00Z'))
}
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

describe('encrypted report', () => {
  it('hides the content, allows only its own script by hash and decrypts with the passphrase', async () => {
    const html = await toEncryptedReportHtml(report(), t, 'correct horse', 1000)
    expect(html).not.toContain('Confidential idea')
    expect(html).not.toContain('Secret retro')
    const csp = /content="(default-src[^"]+)"/.exec(html)![1]!.replaceAll('&#39;', "'")
    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(DECRYPT_SCRIPT))).toString('base64')
    expect(csp).toContain(`script-src 'sha256-${digest}'`)
    expect(html).toContain(`<script>${DECRYPT_SCRIPT}</script>`)
    const p = JSON.parse(/id="p">([^<]+)</.exec(html)![1]!) as { s: string; v: string; c: string; i: number }
    const derive = async (pass: string) => crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(p.s), iterations: p.i }, await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.v) }, await derive('correct horse'), b64(p.c))
    expect(new TextDecoder().decode(plain)).toContain('Confidential idea')
    await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.v) }, await derive('wrong'), b64(p.c))).rejects.toThrow()
  })
  it('refuses an empty passphrase', async () => {
    await expect(toEncryptedReportHtml(report(), t, '')).rejects.toThrow('A passphrase is required')
  })

  it('is one page: the form, the sealed payload and the script, in this order, with the styles of the report and of the form', async () => {
    const html = await toEncryptedReportHtml(report(), t, 'correct horse', 1000)
    const lines = html.split('\n')
    expect(lines[0]).toBe('<!doctype html><html lang="report.lang"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">')
    expect(lines[1]).toMatch(/^<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;sha256-[A-Za-z0-9+/=]+&#39;; style-src &#39;sha256-[A-Za-z0-9+/=]+&#39;">$/)
    expect(lines[2]).toBe('<title>report.title - report.encrypted</title><style>' + html.slice(html.indexOf('<style>') + 7, html.indexOf('\n', html.indexOf('<style>'))))
    const form = lines.findIndex((l) => l.startsWith('<div id="o">'))
    expect(lines[form - 1]).toMatch(/<\/style><\/head><body>$/)
    expect(lines.slice(form, form + 3)).toEqual([
      '<div id="o"><form id="f"><h1>report.encrypted</h1><label for="w">report.passphrase</label>',
      '<input id="w" type="password" autocomplete="off" required><button type="submit">report.unlock</button>',
      '<p id="e" class="err" role="alert" hidden>report.wrongPassphrase</p></form></div>',
    ])
    expect(lines[form + 3]).toMatch(/^<script type="application\/json" id="p">\{[^\n]+\}<\/script><script>\(async\(\)=>\{$/)
    expect(lines.at(-1)).toBe('})()</script></body></html>')
    const style = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'))
    expect(style).toContain('form{display:grid')
    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(style))).toString('base64')
    expect(lines[1]).toContain(`style-src &#39;sha256-${digest}&#39;`)
  })

  it('seals the body of the report only, not its head or its page frame', async () => {
    const html = await toEncryptedReportHtml(report(), t, 'pw', 1000)
    const clear = await open(html, 'pw')
    const full = toReportHtml(report(), t)
    expect(clear).toBe(full.slice(full.indexOf('<body>') + '<body>'.length, full.lastIndexOf('</body>')))
    expect(clear).not.toMatch(/<body|<\/body|<head|<!doctype/i)
  })

  it('says so when the browser has no WebCrypto', async () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto), subtle: undefined })
    try {
      await expect(toEncryptedReportHtml(report(), t, 'pw')).rejects.toThrow('WebCrypto is not available (secure context required)')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  describe('the script of the page', () => {
    /** Runs DECRYPT_SCRIPT against a minimal page and submits the form with a passphrase. */
    async function submit(html: string, passphrase: string) {
      const els = {
        p: { textContent: /id="p">([^<]+)</.exec(html)![1]! },
        f: { hidden: false, handler: undefined as undefined | ((ev: { preventDefault(): void }) => Promise<void>), addEventListener(_type: string, h: (ev: { preventDefault(): void }) => Promise<void>) { this.handler = h } },
        w: { value: passphrase },
        o: { shown: undefined as unknown, replaceChildren(c: unknown) { this.shown = c } },
        e: { hidden: true },
      }
      const doc = { getElementById: (id: keyof typeof els) => els[id], createElement: () => ({ content: '', set innerHTML(v: string) { this.content = v } }) }
      await new Function('document', `return ${DECRYPT_SCRIPT}`)(doc)
      let prevented = false
      await els.f.handler!({ preventDefault: () => { prevented = true } })
      return { els, prevented }
    }

    it('shows the report for the right passphrase and keeps the form away', async () => {
      const html = await toEncryptedReportHtml(report(), t, 'right', 1000)
      const { els, prevented } = await submit(html, 'right')
      expect(prevented).toBe(true)
      expect(String(els.o.shown)).toContain('Confidential idea')
      expect(els.f.hidden).toBe(true)
      expect(els.e.hidden).toBe(true)
    })

    it('shows the error and nothing else for a wrong passphrase', async () => {
      const html = await toEncryptedReportHtml(report(), t, 'right', 1000)
      const { els } = await submit(html, 'wrong')
      expect(els.e.hidden).toBe(false)
      expect(els.o.shown).toBeUndefined()
      expect(els.f.hidden).toBe(false)
    })
  })
})

/** The sealed body, opened with the passphrase like the page does. */
async function open(html: string, passphrase: string): Promise<string> {
  const p = JSON.parse(/id="p">([^<]+)</.exec(html)![1]!) as { s: string; v: string; i: number; c: string }
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(p.s), iterations: p.i }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.v) }, key, b64(p.c)))
}
