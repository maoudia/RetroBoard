#!/usr/bin/env node
// Regenerates the pictures of the user guide: runs the tour (tests/docs/tour.spec.ts, playwright.docs.config.ts) on a seeded
// demo board, then turns each screenshot into an optimised WebP under apps/web/public/guide/img/<locale>/<variant>/.
//   pnpm docs:tour                      every language and variant
//   pnpm docs:tour --grep "en light"    one of them
// Needs `cwebp` (brew install webp) or an ffmpeg built with libwebp on the PATH (build-time tools only; nothing of it ships).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SHOTS = process.env.GUIDE_SHOTS ?? '.guide-tmp/shots'
const OUT = process.env.GUIDE_OUT ?? 'apps/web/public/guide/img'

/** The command that turns one PNG into a lossy WebP (quality 72, no metadata): cwebp when present, else ffmpeg with libwebp. */
export function webpCommand(tool, input, output) {
  return tool === 'cwebp'
    ? ['cwebp', ['-quiet', '-q', '72', '-m', '6', '-metadata', 'none', input, '-o', output]]
    : ['ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-c:v', 'libwebp', '-quality', '72', '-compression_level', '6', '-map_metadata', '-1', output]]
}

/** Which converter is installed ('cwebp', 'ffmpeg' with libwebp, or null). */
export function converter() {
  if (spawnSync('cwebp', ['-version'], { stdio: 'ignore' }).status === 0) return 'cwebp'
  const enc = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' })
  return enc.status === 0 && /libwebp/.test(enc.stdout) ? 'ffmpeg' : null
}

/** The (locale, variant, file) triples under a shots folder, sorted, so the output is the same on every run. */
export function listShots(root) {
  const out = []
  for (const locale of existsSync(root) ? readdirSync(root).sort() : []) {
    for (const variant of readdirSync(join(root, locale)).sort()) {
      for (const file of readdirSync(join(root, locale, variant)).filter((f) => f.endsWith('.png')).sort()) out.push({ locale, variant, file })
    }
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const extra = process.argv.slice(2)
  const tool = converter()
  if (!tool) { console.error('docs:tour needs cwebp (brew install webp) or an ffmpeg built with libwebp'); process.exit(1) }
  rmSync(SHOTS, { recursive: true, force: true })
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.docs.config.ts', ...extra], { stdio: 'inherit', env: { ...process.env, GUIDE_SHOTS: SHOTS } })
  if (run.status !== 0) process.exit(run.status ?? 1)
  const shots = listShots(SHOTS)
  let bytes = 0
  for (const { locale, variant, file } of shots) {
    const dir = join(OUT, locale, variant)
    mkdirSync(dir, { recursive: true })
    const target = join(dir, file.replace(/\.png$/, '.webp'))
    const [cmd, args] = webpCommand(tool, join(SHOTS, locale, variant, file), target)
    if (spawnSync(cmd, args, { stdio: 'inherit' }).status !== 0) { console.error(`${cmd} failed on ${file}`); process.exit(1) }
    bytes += statSync(target).size
  }
  console.log(`docs:tour: ${shots.length} picture(s), ${(bytes / 1024).toFixed(0)} KB in ${OUT}`)
}
