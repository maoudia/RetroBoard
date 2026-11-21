import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The token audit of the Scrum Poker interface (change poker-design-v2, task 6.1, K11): in the poker components and pages no literal colour, no literal
 * font size and no radius off the scale. `design-tokens.test.ts` guards the whole application with a baseline; this one has none: the poker files start clean.
 */
const app = join(__dirname, '..', 'app')
const files = [
  ...readdirSync(join(app, 'components', 'poker')).map((n) => join(app, 'components', 'poker', n)),
  ...readdirSync(join(app, 'pages', 'poker')).map((n) => join(app, 'pages', 'poker', n)),
].filter((f) => f.endsWith('.vue'))
/** The CSS of a component without its comments, so that a sentence cannot trip a pattern. */
const styles = files.map((f) => ({ f: f.replace(`${app}/`, ''), css: (readFileSync(f, 'utf8').match(/<style[\s\S]*?<\/style>/g) ?? []).join('\n').replace(/\/\*[\s\S]*?\*\//g, '') }))
const declarations = (prop: string) => styles.flatMap(({ f, css }) => [...css.matchAll(new RegExp(`(?:^|[;{\\s])${prop}: *([^;}]+)(?=[;}])`, 'g'))].map((m) => ({ f, v: m[1]!.trim() })))

describe('the poker interface keeps to the tokens', () => {
  it('has files to audit', () => {
    expect(files.length).toBeGreaterThan(10)
    expect(styles.filter(({ css }) => css).length).toBeGreaterThan(10)
  })

  it('writes no hex, rgb or hsl colour: colours are tokens, system colours (forced colours) or the hue the moderator picked', () => {
    const bad = styles.flatMap(({ f, css }) => [...css.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/g)].map((m) => `${f}: ${m[0]}`))
    expect(bad, 'use var(--text), var(--accent), var(--surface)... (docs/design-system.md)').toEqual([])
  })

  it('sizes every font from the type scale, alone or scaled by the type scale, never a literal size', () => {
    const scale = /var\(--(?:fs|fluid)-(?:xs|sm|md|lg|xl|2xl|3xl)\)/
    const bad = declarations('font-size').filter(({ v }) => !scale.test(v) && !/^(?:inherit|calc\(min\(var\(--fs-(?:xs|sm|md|lg)\), \d+cqw\)\))$/.test(v))
    expect(bad.map(({ f, v }) => `${f}: ${v}`), 'use var(--fs-*) or var(--fluid-*)').toEqual([])
    expect(declarations('font-size').filter(({ v }) => /(?<![\w-])\d*\.?\d+(?:px|rem|em|pt)\b/.test(v)).map(({ f, v }) => `${f}: ${v}`)).toEqual([])
  })

  it('takes every radius from the scale (a circle and a pill are 50% and 999px)', () => {
    // A radius that follows the size of a card is the token times a factor: the token stays the source.
    const scaled = /calc\(var\(--r-[\w-]+\)(?: \* [\w.(),* -]+)\)/g
    const one = /^(?:0|50%|999px|var\(--r-[\w-]+\)|inherit)$/
    const bad = declarations('border-radius').filter(({ v }) => !v.replace(scaled, 'var(--r-card)').split(/ +/).every((x) => one.test(x)))
    expect(bad.map(({ f, v }) => `${f}: ${v}`), 'use var(--r-card), var(--r-control) or var(--r-pill)').toEqual([])
  })
})
