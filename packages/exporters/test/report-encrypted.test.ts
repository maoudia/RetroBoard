import { describe, expect, it } from 'vitest'
import { buildReport } from '@retroboard/application'
import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import { DECRYPT_SCRIPT, toEncryptedReportHtml } from '../src'

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
    await expect(toEncryptedReportHtml(report(), t, '')).rejects.toThrow()
  })
})
