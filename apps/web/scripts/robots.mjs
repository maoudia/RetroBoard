// Post-generate step: writes robots.txt and _site.json from apps/web/site.json (the indexing switch, change public-launch), and,
// when indexing is on, makes sure the static shell of every private route still says noindex (the Worker header and
// plugins/robots.ts say it too: three channels, one rule).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const PRIVATE_PREFIXES = ['/boards', '/board', '/poker/room', '/check', '/offline', '/dev', '/storage']
const NOINDEX = 'noindex, nofollow'

/** Same rule as isPrivatePath in packages/protocol (this script cannot import TypeScript); scripts/ci/test checks the two agree. */
export const isPrivate = (pathname) => {
  const path = pathname.replace(/\.html$/, '')
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

export const parseIndexing = (value) => (value === 'public' ? 'public' : 'none')

/** `none`: everything disallowed, no sitemap named. `public`: public pages allowed, private prefixes disallowed, the sitemap named. */
export function robotsTxt(indexing, origin) {
  if (indexing !== 'public') return 'User-agent: *\nDisallow: /\n'
  return ['User-agent: *', 'Allow: /', ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`), `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')
}

/** The `robots` meta a built HTML file must carry: private routes always noindex, the others follow the switch. */
export function robotsMeta(indexing, pathname) {
  return indexing === 'public' && !isPrivate(pathname) ? 'index, follow' : NOINDEX
}

/** Sets the content of the robots meta tag of an HTML document (adds none when the page has none). */
export function withRobotsMeta(html, content) {
  return html.replace(/<meta\b[^>]*\bname="robots"[^>]*>/i, `<meta name="robots" content="${content}">`)
}

function* walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (p.endsWith('.html')) yield p
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = process.argv[2] ?? '.output/public'
  const site = JSON.parse(readFileSync(new URL('../site.json', import.meta.url), 'utf8'))
  const indexing = parseIndexing(site.indexing)
  writeFileSync(join(dir, 'robots.txt'), robotsTxt(indexing, site.origin))
  writeFileSync(join(dir, '_site.json'), JSON.stringify({ indexing }))
  let shells = 0
  for (const file of walk(dir)) {
    const path = `/${file.slice(dir.length + 1)}`
    if (!isPrivate(path)) continue
    const html = readFileSync(file, 'utf8')
    const next = withRobotsMeta(html, NOINDEX)
    if (next !== html) { writeFileSync(file, next); shells++ }
  }
  console.log(`robots: indexing ${indexing}, robots.txt written, ${shells} private shell(s) set to noindex`)
}
