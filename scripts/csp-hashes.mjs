// Post-generate step: hash every inline <script> and <style> Nuxt emitted into the static HTML,
// so the Worker can serve a strict Content-Security-Policy without 'unsafe-inline'.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? '.output/public'

function* walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (p.endsWith('.html')) yield p
  }
}

const sha = (s) => `sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}`
const scripts = new Set()
const styles = new Set()

for (const file of walk(dir)) {
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] ?? ''
    const body = m[2] ?? ''
    if (/\bsrc\s*=/.test(attrs) || !body.trim()) continue
    if (/type\s*=\s*["']application\/(json|ld\+json)["']/i.test(attrs)) continue // data blocks are not executed
    scripts.add(sha(body))
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (m[1]?.trim()) styles.add(sha(m[1]))
  }
}

writeFileSync(join(dir, '_csp.json'), JSON.stringify({ scripts: [...scripts], styles: [...styles] }))
console.log(`csp: ${scripts.size} inline script hash(es), ${styles.size} inline style hash(es)`)
