import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseAdr } from './lib.mjs'

export const ADR_DIR = new URL('../../docs/adr/', import.meta.url).pathname
/** Files that are not decisions. */
export const NOT_ADRS = new Set(['README.md', 'template.md'])

export function loadAdrs(dir = ADR_DIR) {
  return readdirSync(dir).filter((f) => f.endsWith('.md') && !NOT_ADRS.has(f)).sort()
    .map((f) => parseAdr(f, readFileSync(join(dir, f), 'utf8')))
}
