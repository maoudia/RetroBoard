import { expect, test } from '@playwright/test'

/** The site stays out of every index until the owner flips apps/web/site.json (change public-launch): robots.txt, the meta and the header agree. */
const PUBLIC = ['/', '/new', '/formats/', '/formats/starfish/', '/en/formats/starfish/', '/privacy']
const PRIVATE = ['/boards/', '/board/', '/check']

test('with indexing off, every page says noindex on all three channels and robots.txt disallows everything', async ({ page, request }) => {
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /\n')
  expect(robots).not.toContain('Sitemap')
  for (const path of [...PUBLIC, ...PRIVATE]) {
    const res = await page.goto(path)
    expect(res?.headers()['x-robots-tag'], `${path} header`).toBe('noindex, nofollow')
    await expect(page.locator('meta[name="robots"]'), `${path} meta`).toHaveAttribute('content', 'noindex, nofollow')
  }
})

test('the private routes keep noindex whatever the switch says', async ({ page }) => {
  for (const path of PRIVATE) {
    const res = await page.goto(path)
    expect(res?.headers()['x-robots-tag'], path).toBe('noindex, nofollow')
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex, nofollow')
  }
})

test('the sitemap lists the public pages and no private URL', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname)
  expect(urls).toEqual(expect.arrayContaining(['/', '/new', '/formats/', '/en/formats/', '/formats/starfish/', '/en/formats/starfish/']))
  expect(urls.filter((p) => /^\/(boards?|check|offline|dev|storage)(\/|$)/.test(p))).toEqual([])
})
