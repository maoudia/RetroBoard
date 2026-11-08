#!/usr/bin/env node
// Generates the static user guide (change user-manual-and-tutorials) under apps/web/public/guide/ from
//   tests/docs/manifest.ts      chapters, steps, captions (the tour photographs them)
//   docs/user-guide/<fr|en>/*.md  the text of each chapter, one "## <step id>" section per step
//   apps/web/public/guide/img/    the pictures of `pnpm docs:tour`
// Pages carry no inline script or style (strict CSP): they load guide.css and guide.js from the same origin.
//   pnpm docs:guide
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { studio } from '../../packages/themes/src/studio.ts'
import { CHAPTERS, imageName, manifestHash } from '../../tests/docs/manifest.ts'

export const LOCALES = ['fr', 'en']
const OUT = process.env.GUIDE_PAGES ?? 'apps/web/public/guide'
const SRC = 'docs/user-guide'

const UI = {
  fr: { title: 'Guide d’utilisation', home: 'Accueil du guide', open: 'Ouvrir RetroBoard', prev: 'Précédent', next: 'Suivant', chapters: 'Chapitres', variant: 'Thème clair ou sombre', other: 'English', otherCode: 'en', skip: 'Aller au contenu' },
  en: { title: 'User guide', home: 'Guide home', open: 'Open RetroBoard', prev: 'Previous', next: 'Next', chapters: 'Chapters', variant: 'Light or dark theme', other: 'Français', otherCode: 'fr', skip: 'Skip to content' },
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Inline Markdown: code, bold, links. The text is escaped first, so source text can never inject markup. */
export function inline(src) {
  return esc(src)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*|[\w./#-]+)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`)
}

/** Block Markdown: paragraphs and "- " lists. */
export function markdown(src) {
  const out = []
  for (const block of src.trim().split(/\n{2,}/)) {
    const lines = block.split('\n')
    if (lines.every((l) => /^- /.test(l))) out.push(`<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`)
    else out.push(`<p>${inline(lines.join(' '))}</p>`)
  }
  return out.join('\n')
}

/** Splits a chapter source into its steps: "## <step id>" sections. Text before the first one is the chapter's own. */
export function sections(src) {
  const parts = src.split(/^## (\S+)\s*$/m)
  const steps = new Map()
  for (let i = 1; i < parts.length; i += 2) steps.set(parts[i], parts[i + 1].trim())
  return { lead: parts[0].trim(), steps }
}

const page = ({ locale, title, body, root, nav }) => `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - RetroBoard</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}guide.css">
<script src="${root}guide.js" defer></script>
</head>
<body>
<a class="skip" href="#main">${esc(UI[locale].skip)}</a>
${nav}
<main id="main" tabindex="-1">
${body}
</main>
</body>
</html>
`

const header = (locale, file) => `<header class="top">
<a class="brand" href="index.html">RetroBoard <span>${esc(UI[locale].title)}</span></a>
<nav class="tools" aria-label="${esc(UI[locale].title)}">
<a class="btn" href="/new">${esc(UI[locale].open)}</a>
<a class="btn" href="../${UI[locale].otherCode}/${file}" hreflang="${UI[locale].otherCode}" lang="${UI[locale].otherCode}">${esc(UI[locale].other)}</a>
<button class="btn" type="button" id="variant" aria-pressed="false">${esc(UI[locale].variant)}</button>
</nav>
</header>`

const toc = (locale, current) => `<nav class="toc" aria-label="${esc(UI[locale].chapters)}"><ol>${CHAPTERS.map((c) => `<li><a href="${c.id}.html"${c.id === current ? ' aria-current="page"' : ''}>${esc(c.title[locale])}</a></li>`).join('')}</ol></nav>`

const picture = (locale, chapter, step) => {
  const file = imageName(chapter, step)
  const alt = esc(step.caption[locale])
  return `<figure class="shot"><img class="light" src="../img/${locale}/light/${file}" alt="${alt}" loading="lazy"><img class="dark" src="../img/${locale}/dark/${file}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`
}

/** One chapter page. */
export function chapterPage(locale, chapter, source) {
  const { lead, steps } = sections(source)
  const i = CHAPTERS.indexOf(chapter)
  const prev = CHAPTERS[i - 1]
  const next = CHAPTERS[i + 1]
  const body = `${toc(locale, chapter.id)}
<article>
<h1>${esc(chapter.title[locale])}</h1>
<p class="lead">${esc(chapter.intro[locale])}</p>
${lead ? markdown(lead) : ''}
${chapter.steps.map((s, n) => `<section id="${s.id}" aria-labelledby="${s.id}-h"><h2 id="${s.id}-h"><span class="n">${n + 1}</span> ${esc(s.caption[locale])}</h2>
${steps.has(s.id) ? markdown(steps.get(s.id)) : ''}
${picture(locale, chapter, s)}
</section>`).join('\n')}
<nav class="pager" aria-label="${esc(UI[locale].title)}">${prev ? `<a href="${prev.id}.html" rel="prev">${esc(UI[locale].prev)}: ${esc(prev.title[locale])}</a>` : '<span></span>'}${next ? `<a href="${next.id}.html" rel="next">${esc(UI[locale].next)}: ${esc(next.title[locale])}</a>` : '<span></span>'}</nav>
</article>`
  return page({ locale, title: chapter.title[locale], body, root: '../', nav: header(locale, `${chapter.id}.html`) })
}

/** The guide home of a language. */
export function indexPage(locale, source) {
  const body = `<article class="home">
<h1>${esc(UI[locale].title)}</h1>
${markdown(source)}
${toc(locale, '')}
</article>`
  return page({ locale, title: UI[locale].title, body, root: '../', nav: header(locale, 'index.html') })
}

/** guide.css: the Studio theme's tokens (light and dark) and the shared design-system scales. */
export function css(theme = studio) {
  const vars = (t) => Object.entries({ bg: t.bg, surface: t.surface, border: t.border, text: t.text, muted: t.muted, accent: t.accent, 'accent-ink': t.accentInk }).map(([k, v]) => `--${k}: ${v};`).join(' ')
  return `/* Generated by scripts/docs/guide.mjs from the Studio theme and docs/design-system.md: do not edit. */
:root { ${vars(theme.tokens)} --fs-xs: .75rem; --fs-sm: .875rem; --fs-md: 1rem; --fs-lg: 1.125rem; --fs-xl: 1.25rem; --fs-2xl: 1.5rem; --fs-3xl: 2rem; --r-xs: 6px; --r-sm: 8px; --r-control: ${theme.radius.control}px; --r-card: ${theme.radius.card}px; --sp-1: .25rem; --sp-2: .5rem; --sp-3: .75rem; --sp-4: 1rem; --sp-5: 1.5rem; --sp-6: 2rem; --font: ${theme.fonts.body}; --mono: ${theme.fonts.mono}; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root:not([data-variant="light"]) { ${vars(theme.alt)} color-scheme: dark; } }
:root[data-variant="dark"] { ${vars(theme.alt)} color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: var(--fs-md)/1.55 var(--font); }
a { color: var(--accent); }
.skip { position: absolute; left: var(--sp-2); top: -4rem; background: var(--surface); padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm); }
.skip:focus { top: var(--sp-2); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-xs); }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-3) var(--sp-5); background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 2; }
.brand { color: var(--text); font-weight: 700; text-decoration: none; font-size: var(--fs-lg); }
.brand span { color: var(--muted); font-weight: 500; margin-inline-start: var(--sp-2); }
.tools { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.btn { display: inline-flex; align-items: center; min-height: 40px; padding: 0 var(--sp-4); border-radius: 999px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font: inherit; font-size: var(--fs-sm); font-weight: 600; text-decoration: none; cursor: pointer; }
.btn[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
main { display: grid; grid-template-columns: minmax(0, 15rem) minmax(0, 1fr); gap: var(--sp-6); max-width: 78rem; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
main:has(.home) { grid-template-columns: minmax(0, 46rem); }
.toc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-1); position: sticky; top: 5rem; }
.toc a { display: block; padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm); text-decoration: none; color: var(--text); }
.toc a[aria-current="page"] { background: var(--surface); border: 1px solid var(--border); font-weight: 700; }
.home .toc ol { position: static; margin-top: var(--sp-5); }
h1 { font-size: var(--fs-3xl); line-height: 1.1; margin: 0 0 var(--sp-3); }
h2 { font-size: var(--fs-xl); margin: var(--sp-6) 0 var(--sp-3); display: flex; gap: var(--sp-3); align-items: baseline; }
.n { display: inline-grid; place-items: center; min-width: 1.8rem; height: 1.8rem; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: var(--fs-sm); }
.lead { font-size: var(--fs-lg); color: var(--muted); }
code { font-family: var(--mono); font-size: .9em; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-xs); padding: 0 .3em; }
.shot { margin: var(--sp-4) 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card); padding: var(--sp-3); }
.shot img { display: block; max-width: 100%; height: auto; margin: 0 auto; border-radius: var(--r-sm); }
.shot .dark { display: none; }
@media (prefers-color-scheme: dark) { :root:not([data-variant="light"]) .shot .light { display: none; } :root:not([data-variant="light"]) .shot .dark { display: block; } }
:root[data-variant="dark"] .shot .light { display: none; }
:root[data-variant="dark"] .shot .dark { display: block; }
:root[data-variant="light"] .shot .light { display: block; }
:root[data-variant="light"] .shot .dark { display: none; }
figcaption { color: var(--muted); font-size: var(--fs-sm); margin-top: var(--sp-2); text-align: center; }
.pager { display: flex; justify-content: space-between; gap: var(--sp-4); margin-top: var(--sp-6); }
@media (max-width: 52rem) { main { grid-template-columns: minmax(0, 1fr); } .toc ol { position: static; } }
`
}

/** guide.js: the light or dark switch, remembered on this device. */
export const script = () => `(() => {
  const root = document.documentElement
  const KEY = 'retroboard:guide-variant'
  const stored = (() => { try { return localStorage.getItem(KEY) } catch { return null } })()
  const system = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  const apply = (v) => { root.dataset.variant = v; const b = document.getElementById('variant'); if (b) b.setAttribute('aria-pressed', String(v === 'dark')) }
  apply(stored === 'dark' || stored === 'light' ? stored : system())
  document.getElementById('variant')?.addEventListener('click', () => {
    const next = root.dataset.variant === 'dark' ? 'light' : 'dark'
    apply(next)
    try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice lasts for this page */ }
  })
})()
`

const read = (p) => readFileSync(p, 'utf8')
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12)

/** What guide.json records: the manifest hash and a hash of the sources, so a check can tell the pages are stale. */
export function guideInfo(sources, chapters = CHAPTERS) {
  return { manifest: manifestHash(chapters), sources: sha(JSON.stringify(sources)), chapters: chapters.map((c) => c.id), locales: LOCALES }
}

/** The Markdown sources of the guide, keyed "<locale>/index" and "<locale>/<chapter>". Throws on a missing file. */
export function readSources(src = SRC) {
  const sources = {}
  for (const locale of LOCALES) {
    for (const name of ['index', ...CHAPTERS.map((c) => c.id)]) {
      const file = join(src, locale, `${name}.md`)
      if (!existsSync(file)) throw new Error(`missing guide text: ${file}`)
      sources[`${locale}/${name}`] = read(file)
    }
  }
  return sources
}

export function build(out = OUT) {
  const sources = readSources()
  for (const locale of LOCALES) {
    mkdirSync(join(out, locale), { recursive: true })
    writeFileSync(join(out, locale, 'index.html'), indexPage(locale, sources[`${locale}/index`]))
    for (const chapter of CHAPTERS) writeFileSync(join(out, locale, `${chapter.id}.html`), chapterPage(locale, chapter, sources[`${locale}/${chapter.id}`]))
  }
  writeFileSync(join(out, 'guide.css'), css())
  writeFileSync(join(out, 'guide.js'), script())
  writeFileSync(join(out, 'guide.json'), JSON.stringify(guideInfo(sources), null, 2) + '\n')
  console.log(`docs:guide: ${LOCALES.length * (CHAPTERS.length + 1)} page(s) in ${out}`)
}

if (import.meta.url === `file://${process.argv[1]}`) build()
