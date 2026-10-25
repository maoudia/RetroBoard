#!/usr/bin/env node
// Creates the next ADR from docs/adr/template.md and refreshes the index.
// Usage: pnpm adr:new "Short title of the problem and the solution"
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { newFileName, renderIndex } from './lib.mjs'
import { ADR_DIR, loadAdrs } from './load.mjs'

const title = process.argv.slice(2).join(' ').trim()
if (!title) { console.error('Usage: pnpm adr:new "Short title"'); process.exit(1) }
const adrs = loadAdrs()
const next = Math.max(-1, ...adrs.map((a) => a.number)) + 1
const file = newFileName(next, title)
if (existsSync(join(ADR_DIR, file))) { console.error(`${file} exists`); process.exit(1) }
const today = new Date().toISOString().slice(0, 10)
const text = readFileSync(join(ADR_DIR, 'template.md'), 'utf8')
  .replace('status: proposed', 'status: proposed').replace('date: YYYY-MM-DD', `date: ${today}`).replace('# Title', `# ${title}`)
writeFileSync(join(ADR_DIR, file), text)
writeFileSync(join(ADR_DIR, 'README.md'), renderIndex(loadAdrs()))
console.log(`docs/adr/${file} created (status: proposed). Fill it in, then run pnpm adr:check.`)
