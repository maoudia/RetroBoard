import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Design system guard (docs/design-system.md): type and small radii come from the shared scales. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.(vue|css)$/.test(n) ? [p] : []
  })
}
const root = join(__dirname, '..', 'app')
const all = files(root).map((f) => ({ f, s: readFileSync(f, 'utf8') }))

const decl = (prop: string) => all.flatMap(({ f, s }) => [...s.matchAll(new RegExp(`${prop}: *([^;}]+)(?=[;}])`, 'g'))].map((m) => ({ f: f.replace(`${root}/`, ''), v: m[1]!.trim() })))

/** Hex colours that existed when the guard was added (fixed palettes, print, QR code, avatars). Lower a number when you remove one; never raise it. */
const BASELINE: Record<string, number> = {
  'assets/css/base.css': 17, 'components/AgendaRing.vue': 1, 'components/AppToolbar.vue': 2, 'components/ChatPanel.vue': 2, 'components/Dropdown.vue': 2,
  'components/GroupCard.vue': 2, 'components/JoinScanner.vue': 1, 'components/ParticipantsMenu.vue': 1, 'components/PrivateSection.vue': 1,
  'components/ProfileButton.vue': 1, 'components/ProfileDialog.vue': 1, 'components/QrCode.vue': 2, 'pages/check.vue': 1,
}

describe('design tokens', () => {
  it('font sizes use the type scale (fixed --fs-* or fluid --fluid-*), a fluid clamp or inherit', () => {
    const bad = decl('font-size').filter(({ v }) => !/^(var\(--(fs|fluid)-(xs|sm|md|lg|xl|2xl|3xl)\)|inherit|clamp\(.*\)|calc\(.*\)|[\d.]+em|[\d.]+%|larger|smaller)$/.test(v))
    expect(bad, 'use var(--fs-*) from base.css').toEqual([])
  })

  it('radii use the radius tokens (pills, circles and hairline bars stay literal; marketing pages are exempt)', () => {
    const marketing = /^(components\/Landing|pages\/index\.vue)/
    const one = /^(0|50%|999px|[1-4]px|var\(--[\w-]+(, *[^)]+)?\)|calc\(.+\)|[\d.]+%|inherit)$/
    const parts = (v: string) => v.replace(/var\([^)]*\)|calc\([^)]*\)/g, (m) => m.replace(/ /g, '')).split(/ +/)
    const bad = decl('border-radius').filter(({ f, v }) => !marketing.test(f) && !v.startsWith('calc(') && !parts(v).every((x) => one.test(x)))
    expect(bad.map((b) => `${b.f}: ${b.v}`), 'use var(--r-xs|--r-sm|--r-control|--r-card)').toEqual([])
  })

  it('every labelled button has an icon at the left of its label (numeric and status chips are exempt)', () => {
    const marketing = /^(components\/Landing|pages\/index\.vue)/
    const exempt = /^(\+\d+|\{\{ n \}\}|\{\{ t\(`actions\.status\.\$\{s\}`\) \}\}|\{\{ t\('agenda\.preset', \{ n \}\) \}\})$/
    const bad = all.filter(({ f }) => f.endsWith('.vue') && !marketing.test(f.replace(`${root}/`, ''))).flatMap(({ f, s }) => [...s.matchAll(/<(button|NuxtLink|a)\b([^>]*?)>([\s\S]*?)<\/\1>/g)]
      .filter((m) => /class="[^"]*\bbtn\b/.test(m[2]!) && !/<Icon|<svg/.test(m[3]!))
      .map((m) => ({ f: f.replace(`${root}/`, ''), txt: m[3]!.replace(/\s+/g, ' ').trim() }))
      .filter(({ txt }) => txt && !exempt.test(txt)))
    expect(bad.map((b) => `${b.f}: ${b.txt}`), 'put <Icon name="lucide:..." /> before the label (docs/design-system.md)').toEqual([])
  })

  it('hard-coded colours only shrink: no component gets a new hex colour (docs/design-system.md, section 2)', () => {
    const marketing = /^(components\/Landing|pages\/index\.vue|components\/LocaleSwitch\.vue)/
    // Hex inside a style block, except a fallback written as var(--token, #hex).
    const hex = (src: string) => [...(src.match(/<style[\s\S]*?<\/style>/g)?.join('\n') ?? (src.includes('</') ? '' : src)).replace(/var\(--[\w-]+,\s*#[0-9a-fA-F]{3,8}\)/g, '').matchAll(/#[0-9a-fA-F]{3,8}\b/g)].length
    const now = Object.fromEntries(all.map(({ f, s }) => [f.replace(`${root}/`, ''), hex(s)] as const).filter(([f, n]) => n > 0 && !marketing.test(f)))
    const over = Object.entries(now).filter(([f, n]) => n > (BASELINE[f] ?? 0)).map(([f, n]) => `${f}: ${n} (allowed ${BASELINE[f] ?? 0})`)
    expect(over, 'use a theme token (var(--text), var(--accent-ink), ...) instead of a hex colour').toEqual([])
  })

  it('the shared scales exist in base.css', () => {
    const base = readFileSync(join(root, 'assets/css/base.css'), 'utf8')
    for (const t of ['--fs-xs', '--fs-sm', '--fs-md', '--fs-lg', '--fs-xl', '--fs-2xl', '--fs-3xl', '--r-xs', '--r-sm', '--sp-1', '--dur-base']) expect(base).toContain(`${t}:`)
  })
})

describe('one button shape (change ui-coherence-pass)', () => {
  it('rules for .btn, .mini-btn and .icon-btn use the pill radius', () => {
    const pill = /^(var\(--r-pill\)|999px|50%|inherit|0)$/
    const bad = all.flatMap(({ f, s }) => [...s.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, sel, body]) => /(^|[\s,>+~])\.(btn|mini-btn|icon-btn)(?![\w-])/.test(sel!.trim().split(',').map((x) => x.trim().split(/[\s>+~]+/).pop()!).join(' ')) && /(^|;|\s)border-radius:/.test(body!))
      .map(([, sel, body]) => ({ f: f.replace(`${root}/`, ''), sel: sel!.trim(), v: /border-radius: *([^;}]+)/.exec(body!)![1]!.trim() }))
      .filter(({ v }) => !pill.test(v)))
    expect(bad.map((b) => `${b.f}: ${b.sel} { border-radius: ${b.v} }`), 'buttons use var(--r-pill)').toEqual([])
  })
})

describe('a labelled button is not an icon-only button (change history-panel-phone-layout)', () => {
  /** The visible text of every `.mini-btn` (a fixed 30 px square for an icon) in a template; the icon and its markup do not count. */
  const labelled = (src: string) => [...src.matchAll(/<(button|NuxtLink|a)\b((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*?)<\/\1>/g)]
    .filter((m) => /class="[^"]*\bmini-btn\b/.test(m[2]!))
    .map((m) => [...m[3]!.matchAll(/(?:^|>)([^<>]+)/g)].map((t) => t[1]!).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  it('flags a .mini-btn that shows text (seeded violation)', () => {
    expect(labelled('<button class="mini-btn" type="button"><Icon name="lucide:x" /> Restore</button>')).toEqual(['Restore'])
    expect(labelled('<button class="mini-btn" type="button">{{ t(\'x\') }}</button>')).toEqual(["{{ t('x') }}"])
    expect(labelled('<button class="mini-btn" type="button" :aria-label="t(\'x\')"><Icon name="lucide:x" /></button>')).toEqual([])
  })

  it('no component uses .mini-btn with a visible label', () => {
    const bad = all.filter(({ f }) => f.endsWith('.vue')).flatMap(({ f, s }) => labelled(s).map((txt) => `${f.replace(`${root}/`, '')}: ${txt}`))
    expect(bad, 'use .btn .btn-sm for a labelled button; .mini-btn is icon-only').toEqual([])
  })
})
