import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en, fr } from '@retroboard/i18n'

const dir = join(__dirname, '..', '..', '..', 'docs', 'launch', 'posts')
const channels = ['show-hn', 'product-hunt', 'linkedin', 'devto']
const langs = ['fr', 'en'] as const
const dict = { fr, en } as Record<(typeof langs)[number], Record<string, string>>
const read = (channel: string, lang: string): string => readFileSync(join(dir, `${channel}.${lang}.md`), 'utf8')

const LINKS = ['https://retroboard.maoudia.com/', 'https://github.com/maoudia/RetroBoard']
const guide = (lang: string): string => `https://retroboard.maoudia.com/guide/${lang}/`
/** Feature names are the landing headings (`landing.f.*.h`) of the post language; nothing else may be bold. */
const headings = (lang: (typeof langs)[number]): Set<string> =>
  new Set(Object.entries(dict[lang]).filter(([k]) => /^landing\.f\.[a-z]+\.h$/.test(k)).map(([, v]) => v))

describe('the launch posts', () => {
  it('exist for every channel in both languages and nothing else', () => {
    const expected = channels.flatMap((c) => langs.map((l) => `${c}.${l}.md`)).sort()
    expect(readdirSync(dir).sort()).toEqual(expected)
  })

  describe.each(channels.flatMap((c) => langs.map((l) => [c, l] as const)))('%s (%s)', (channel, lang) => {
    const text = read(channel, lang)

    it('links the landing, the repository and the guide of its language', () => {
      for (const link of [...LINKS, guide(lang)]) expect(text).toContain(link)
    })

    it('names the license and never calls the project open source', () => {
      expect(text).toContain('PolyForm Noncommercial 1.0.0')
      const claimsOpen = lang === 'en' ? /\bis open source\b|\bopen-source\b/i : /\best open source\b|\bopen-source\b/i
      expect(text).not.toMatch(claimsOpen)
      expect(text).toMatch(lang === 'en' ? /not open source/i : /pas de l'open source/i)
    })

    it('says built in public, end-to-end encrypted and nothing stored', () => {
      expect(text).toMatch(lang === 'en' ? /built in public/ : /construit en public/)
      expect(text).toMatch(lang === 'en' ? /end-to-end encrypted/ : /chiffr\S* de bout en bout/)
      expect(text).toMatch(lang === 'en' ? /stores nothing|nothing is stored/ : /ne stocke rien|rien n'est stocké/)
    })

    it('names only features the landing names', () => {
      const bold = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1] ?? '')
      expect(bold.length).toBeGreaterThan(0)
      const known = headings(lang)
      for (const feature of bold) expect(known.has(feature), `"${feature}" is not a landing heading`).toBe(true)
    })

    it('stays free of tracking links', () => {
      expect(text).not.toMatch(/[?&](utm_|ref=)/)
    })
  })
})
