import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** The settings store needs the Nuxt runtime to import, so its defaults are read from the source (change column-defaults-and-collapse). */
const source = readFileSync(join(import.meta.dirname, '..', 'app', 'stores', 'settings.ts'), 'utf8')
const defaults = source.slice(source.indexOf('export const DEFAULTS'), source.indexOf('/** Personal, local-only'))

describe('column defaults (change column-defaults-and-collapse)', () => {
  it('links the columns by default', () => {
    expect(defaults).toMatch(/linkColumns: true/)
  })
  it('hides the collapse buttons by default', () => {
    expect(defaults).toMatch(/collapseButtons: false/)
  })
})
