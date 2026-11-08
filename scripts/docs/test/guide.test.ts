import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { chapterPage, css, guideInfo, indexPage, inline, LOCALES, markdown, script, sections } from '../guide.mjs'
// @ts-expect-error TypeScript source shared with the tour
import { CHAPTERS } from '../../../tests/docs/manifest'

describe('guide Markdown', () => {
  it('escapes the text before it formats it, so a source can never inject markup', () => {
    expect(inline('<script>alert(1)</script> & "x"')).toBe('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;')
    expect(inline('**<b>**')).toBe('<strong>&lt;b&gt;</strong>')
  })

  it('formats code, bold and links, and only links to http, absolute or relative targets', () => {
    expect(inline('`a` **b** [c](https://x.y/z) [d](/new) [e](other.html#s)')).toBe('<code>a</code> <strong>b</strong> <a href="https://x.y/z">c</a> <a href="/new">d</a> <a href="other.html#s">e</a>')
    expect(inline('[x](javascript:alert(1))')).not.toContain('<a')
  })

  it('makes paragraphs and lists', () => {
    expect(markdown('one\ntwo\n\nthree')).toBe('<p>one two</p>\n<p>three</p>')
    expect(markdown('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('splits a chapter into a lead and its steps', () => {
    const s = sections('lead text\n\n## form\nFirst.\n\n## theme\nSecond.')
    expect(s.lead).toBe('lead text')
    expect([...s.steps.entries()]).toEqual([['form', 'First.'], ['theme', 'Second.']])
    expect(sections('only a lead').steps.size).toBe(0)
  })
})

describe('guide pages', () => {
  const chapter = CHAPTERS[0]
  const html = (locale: string) => chapterPage(locale, chapter, '## form\nBody **text**.') as string

  it('is a page of its language with no inline script or style (strict CSP), and loads its assets from the same origin', () => {
    for (const locale of LOCALES) {
      const page = html(locale)
      expect(page).toContain(`<html lang="${locale}">`)
      expect(page).not.toMatch(/<script(?![^>]*\bsrc=)/)
      expect(page).not.toMatch(/\sstyle=|<style|\son\w+=/)
      expect(page).not.toMatch(/https?:\/\/(?!retroboard)/)
      expect(page).toContain('href="../guide.css"')
      expect(page).toContain('src="../guide.js"')
    }
  })

  it('gives every picture its caption as text alternative, in light and dark, for the right language', () => {
    const page = html('en')
    const alt = chapter.steps[0].caption.en
    expect(page.match(new RegExp(`alt="${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'))).toHaveLength(2)
    expect(page).toContain('src="../img/en/light/create-form.webp"')
    expect(page).toContain('src="../img/en/dark/create-form.webp"')
    expect(html('fr')).toContain('src="../img/fr/light/create-form.webp"')
  })

  it('links the same chapter in the other language and the neighbours of the chapter', () => {
    expect(html('en')).toContain('href="../fr/create.html"')
    expect(html('fr')).toContain('href="../en/create.html"')
    expect(html('en')).toContain('rel="next"')
    expect(html('en')).not.toContain('rel="prev"')
    expect(chapterPage('en', CHAPTERS.at(-1), '')).not.toContain('rel="next"')
  })

  it('has an index that lists every chapter', () => {
    const page = indexPage('fr', 'Bienvenue.') as string
    for (const c of CHAPTERS) expect(page).toContain(`href="${c.id}.html"`)
  })

  it('shows the tutorial video on the index page when there is one: captions on a track, loaded only when played, from the same origin', () => {
    const page = indexPage('en', 'Welcome.', true) as string
    expect(page).toMatch(/<video controls preload="none"[^>]*src="\.\.\/video\/en\/tutorial\.webm"/)
    expect(page).toContain('<track kind="captions" src="../video/en/tutorial.vtt" srclang="en" label="English" default>')
    expect(page).not.toMatch(/\sstyle=|\sautoplay/)
    expect(indexPage('fr', 'Bienvenue.', true)).toContain('srclang="fr" label="Français" default')
    expect(indexPage('en', 'Welcome.')).not.toContain('<video')
    expect(indexPage('en', 'Welcome.', false)).not.toContain('<video')
  })

  it('ships a stylesheet from the design tokens (light, dark and system) and a script that remembers the variant', () => {
    const style = css() as string
    expect(style).toContain('--accent: #0066cc')
    expect(style).toContain('prefers-color-scheme: dark')
    expect(style).toContain(':root[data-variant="dark"]')
    expect(style).toContain('--fs-md: 1rem')
    expect(script()).toContain('retroboard:guide-variant')
  })

  it('records the manifest hash and the chapters in guide.json', () => {
    const info = guideInfo({ a: 'x' })
    expect(info.manifest).toMatch(/^[0-9a-f]{8}$/)
    expect(info.chapters).toEqual(CHAPTERS.map((c: { id: string }) => c.id))
    expect(guideInfo({ a: 'y' }).sources).not.toBe(info.sources)
  })
})
