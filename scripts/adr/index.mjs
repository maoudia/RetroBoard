#!/usr/bin/env node
// Writes docs/adr/README.md (the index) from the ADR files. Usage: pnpm adr:index
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderIndex } from './lib.mjs'
import { ADR_DIR, loadAdrs } from './load.mjs'

const adrs = loadAdrs()
writeFileSync(join(ADR_DIR, 'README.md'), renderIndex(adrs))
console.log(`docs/adr/README.md: ${adrs.length} ADRs`)
