// Post-generate step: writes sitemap.xml with every public page of the build, in both languages (change public-launch).
// The list comes from the prerendered files, so a format added to the catalogue appears without a manual edit;
// private routes and the service pages never do.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isPrivate } from './robots.mjs'

/** Prerendered pages that are not content: error and service shells. */
const SERVICE = ['/404', '/200', '/busy', '/maintenance', '/unsupported']

/** `index.html` is `/`, `a.html` is `/a`, `a/index.html` is `/a/`. */
export function pathOf(file) {
  const rel = `/${file.split(sep).join('/')}`.replace(/\.html$/, '')
  return rel.endsWith('/index') ? rel.slice(0, -'index'.length) : rel
}

/** The URL paths a crawler may be pointed at, sorted. */
export function publicPaths(files) {
  return files.map(pathOf).filter((p) => !isPrivate(p) && !SERVICE.includes(p) && !p.startsWith('/_') && !p.startsWith('/.')).sort()
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function sitemapXml(paths, origin, lastmod) {
  const urls = paths.map((p) => `  <url><loc>${escape(origin + p)}</loc><lastmod>${lastmod}</lastmod></url>`)
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n')
}

function* walk(root, d = root) {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) yield* walk(root, p)
    else if (p.endsWith('.html')) yield p.slice(root.length + 1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = process.argv[2] ?? '.output/public'
  const site = JSON.parse(readFileSync(new URL('../site.json', import.meta.url), 'utf8'))
  const paths = publicPaths([...walk(dir)])
  writeFileSync(join(dir, 'sitemap.xml'), sitemapXml(paths, site.origin, new Date().toISOString().slice(0, 10)))
  console.log(`sitemap: ${paths.length} public page(s)`)
}
