// Every `Stryker disable` must say why: a mutant may only be waived when no test can tell it from the real code
// (an equivalent mutant, or plain data such as a word list), and the reason is written next to it. Used by a unit
// test, so `pnpm test` and CI enforce it.
//   // Stryker disable next-line <Mutator,Other>: <reason of at least 12 characters>
//   // Stryker disable <Mutator>: <reason>      ...a block, closed by...      // Stryker restore <Mutator>
// "all" is never allowed: name what is waived.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIN_REASON = 12
const MUTATORS = '[A-Za-z]+(?:\\s*,\\s*[A-Za-z]+)*'
const DISABLE = new RegExp(`^\\s*//\\s*Stryker\\s+disable\\s+(next-line\\s+)?(${MUTATORS})\\s*:\\s*(\\S.*)$`)
const RESTORE = new RegExp(`^\\s*//\\s*Stryker\\s+restore\\s+(${MUTATORS})\\s*$`)
const norm = (names) => names.split(',').map((n) => n.trim()).sort().join(',')

/** Problems found in the text of one file; `file` only labels them. */
export function checkDisables(file, text) {
  const problems = []
  const open = []
  text.split('\n').forEach((line, i) => {
    if (!/\/\/\s*Stryker\s+(disable|restore)/.test(line)) return
    const at = `${file}:${i + 1}`
    const restore = RESTORE.exec(line)
    if (restore) {
      if (/^all$/i.test(restore[1].trim())) return void problems.push(`${at}: name the mutators instead of "all"`)
      const idx = open.findLastIndex((o) => o.names === norm(restore[1]))
      if (idx < 0) problems.push(`${at}: nothing to restore: no block disabled these mutators`)
      else open.splice(idx, 1)
      return
    }
    const m = DISABLE.exec(line)
    if (!m) return void problems.push(`${at}: write "// Stryker disable [next-line] <Mutator>: <reason>", naming the mutator and giving a reason after a colon`)
    if (/^all$/i.test(m[2].trim())) return void problems.push(`${at}: name the mutators instead of "all"`)
    if (m[3].trim().length < MIN_REASON) problems.push(`${at}: the reason is too short to explain why no test can tell the mutant apart`)
    if (!m[1]) open.push({ names: norm(m[2]), at })
  })
  for (const o of open) problems.push(`${o.at}: this block disable is never restored`)
  return problems
}

/** TypeScript sources under `dir`, tests and declaration files left out. */
export function sourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') out.push(...sourceFiles(path)) }
    else if (/\.ts$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(path)
  }
  return out
}
