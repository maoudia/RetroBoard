import { expect, test, type Page } from '@playwright/test'
import { column, createBoard, settle } from './helpers'

/** Text that stays dark on dark (or light on light) in a state axe does not reach (#225): measured on every theme, both variants. */
const THEMES = ['studio', 'corporate', 'slate', 'paper', 'minimal', 'halloween', 'noel', 'cyber', 'sakura']

async function lowContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0]!, g: p[1]!, b: p[2]!, a: p[3] ?? 1 } }
    const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const lum = (c: { r: number; g: number; b: number }) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
    const bgOf = (el: Element) => {
      let acc = { r: 255, g: 255, b: 255 }; const layers: { r: number; g: number; b: number; a: number }[] = []
      for (let e: Element | null = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a === 1) break } }
      for (const l of layers.reverse()) acc = { r: acc.r * (1 - l.a) + l.r * l.a, g: acc.g * (1 - l.a) + l.g * l.a, b: acc.b * (1 - l.a) + l.b * l.a }
      return acc
    }
    const out: string[] = []
    const seen = new Set<string>()
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (!own) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const fg = parse(cs.color); if (!fg) continue
      const bg = bgOf(el)
      const f = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) }
      const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700)
      if (ratio < (big ? 3 : 4.5)) {
        const key = `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`
        if (!seen.has(key)) { seen.add(key); out.push(`${key} "${el.textContent!.trim().slice(0, 24)}" ${ratio.toFixed(2)}`) }
      }
    }
    return out
  })
}

for (const variant of ['light', 'dark'] as const) {
  for (const theme of THEMES) {
    test(`contrast, ${theme}, ${variant} (#225)`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: variant })
      await page.addInitScript((v) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant: v })) } catch { /* ignore */ } }, variant)
      await createBoard(page, { theme, template: 'start-stop-continue' })
      await column(page, 0).locator('textarea').fill('x'.repeat(150)) // the counter shows from 80% of the limit
      await settle(page)
      expect(await lowContrast(page)).toEqual([])
      // The locked board shows the lock pill and the vote bar controls in their disabled and pressed states.
      await page.evaluate(() => {
        const store = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { updateSettings: (p: unknown) => void } }> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('board')!
        store.commands.updateSettings({ locked: true, secretVoting: true })
      })
      await settle(page)
      expect(await lowContrast(page)).toEqual([])
    })
  }
}
