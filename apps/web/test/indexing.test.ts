import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@retroboard/domain'
import { formatPath, isPrivatePath, PRIVATE_PREFIXES } from '@retroboard/protocol'
// @ts-expect-error plain ESM build scripts without type declarations
import { isPrivate, parseIndexing, robotsMeta, robotsTxt, withRobotsMeta } from '../scripts/robots.mjs'
// @ts-expect-error plain ESM build scripts without type declarations
import { pathOf, publicPaths, sitemapXml } from '../scripts/sitemap.mjs'
import site from '../site.json'

const ORIGIN = 'https://retroboard.example'
const meta = (s: string) => (robotsMeta as (a: string, b: string) => string)(s, '/')

describe('indexing switch', () => {
  it('ships off: the site stays noindex until the owner flips it', () => {
    expect(site.indexing).toBe('none')
    expect(parseIndexing(site.indexing)).toBe('none')
    expect(site.origin).toMatch(/^https:\/\/[^/]+$/)
  })

  it('writes a robots.txt that disallows everything and names no sitemap while off', () => {
    const txt = robotsTxt('none', ORIGIN) as string
    expect(txt).toBe('User-agent: *\nDisallow: /\n')
    expect(txt).not.toContain('Sitemap')
    expect(robotsTxt(undefined, ORIGIN)).toBe(txt)
  })

  it('writes a robots.txt that allows the public pages, blocks the private prefixes and names the sitemap once on', () => {
    const lines = (robotsTxt('public', ORIGIN) as string).trim().split('\n')
    expect(lines).toContain('Allow: /')
    expect(lines).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
    for (const p of PRIVATE_PREFIXES) expect(lines).toContain(`Disallow: ${p}`)
    expect(lines).not.toContain('Disallow: /')
  })

  it('sets noindex on every page while off', () => {
    for (const p of ['/', '/new', '/formats/starfish/', '/boards']) expect(robotsMeta('none', p)).toBe('noindex, nofollow')
  })

  it('sets index on the public pages only once on, noindex on the private ones always', () => {
    expect(meta('public')).toBe('index, follow')
    for (const p of ['/new', '/formats/starfish/', '/en/formats/', '/guide/en/']) expect(robotsMeta('public', p), p).toBe('index, follow')
    for (const p of ['/boards', '/boards.html', '/board', '/check', '/offline', '/dev/service-pages', '/storage/callback']) expect(robotsMeta('public', p), p).toBe('noindex, nofollow')
  })

  it('rewrites the robots meta of a built page and leaves the rest alone', () => {
    const html = '<head><meta name="viewport" content="x"><meta name="robots" content="index, follow"><title>t</title></head>'
    expect(withRobotsMeta(html, 'noindex, nofollow')).toBe('<head><meta name="viewport" content="x"><meta name="robots" content="noindex, nofollow"><title>t</title></head>')
    expect(withRobotsMeta('<head></head>', 'noindex, nofollow')).toBe('<head></head>')
  })

  it('reads the private routes the same way as the protocol package, for the paths of the site', () => {
    for (const p of ['/', '/new', '/boards', '/boards/x', '/board', '/check', '/offline', '/dev/a', '/storage/callback', '/boardroom', '/devices', '/formats/']) expect(isPrivate(p), p).toBe(isPrivatePath(p))
  })
})

describe('sitemap', () => {
  const files = ['index.html', 'new.html', 'privacy.html', 'boards.html', 'board.html', 'check.html', 'offline.html', 'dev/service-pages.html', 'storage/callback.html', '404.html', '200.html', 'busy.html', 'maintenance.html', 'unsupported.html', 'formats/index.html', 'formats/starfish/index.html', 'en/formats/index.html', 'en/formats/starfish/index.html', 'guide/en/index.html', 'guide/en/create.html', '_nuxt/x.html']

  it('maps files to URLs', () => {
    expect([pathOf('index.html'), pathOf('new.html'), pathOf('formats/starfish/index.html'), pathOf('guide/en/create.html')]).toEqual(['/', '/new', '/formats/starfish/', '/guide/en/create'])
  })

  it('lists the public pages and no private, error or service URL', () => {
    const paths = publicPaths(files) as string[]
    expect(paths).toEqual(['/', '/en/formats/', '/en/formats/starfish/', '/formats/', '/formats/starfish/', '/guide/en/', '/guide/en/create', '/new', '/privacy'])
    for (const p of paths) expect(p).not.toMatch(/^\/(boards?|check|offline|dev|storage|404|200|busy|maintenance|unsupported|_)/)
  })

  it('writes one url per page with its last modification date, escaped', () => {
    const xml = sitemapXml(['/', '/a&b'], ORIGIN, '2026-12-13') as string
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain(`<url><loc>${ORIGIN}/</loc><lastmod>2026-12-13</lastmod></url>`)
    expect(xml).toContain(`<loc>${ORIGIN}/a&amp;b</loc>`)
    expect(xml.match(/<url>/g)).toHaveLength(2)
  })

  it('has a French and an English page for every format of the catalogue, whatever the catalogue holds', () => {
    const generated = TEMPLATES.flatMap((x) => (['fr', 'en'] as const).map((l) => formatPath(x.id, l)))
    const built = (publicPaths(['formats/index.html', 'en/formats/index.html', ...generated.map((p) => `${p.slice(1)}index.html`)]) as string[]).filter((p) => /\/formats\/.+/.test(p))
    expect(built.sort()).toEqual([...generated].sort())
    expect(new Set(generated).size).toBe(TEMPLATES.length * 2)
  })
})
