// Post-generate step: writes /.well-known/security.txt (RFC 9116) with an Expires one year ahead.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const YEAR_MS = 365 * 24 * 3600 * 1000

/** Builds the security.txt body; `now` is injectable for tests. */
export function securityTxt(now = Date.now()) {
  const expires = new Date(now + YEAR_MS).toISOString().replace(/\.\d{3}Z$/, 'Z')
  return [
    'Contact: https://github.com/maoudia/RetroBoard/security/advisories/new',
    `Expires: ${expires}`,
    'Preferred-Languages: en, fr',
    'Canonical: https://retroboard.maoudia.com/.well-known/security.txt',
    'Policy: https://github.com/maoudia/RetroBoard/security/policy',
    '',
  ].join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = join(process.argv[2] ?? '.output/public', '.well-known')
  const body = securityTxt()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'security.txt'), body)
  console.log(`security.txt written, ${body.match(/^Expires: .+$/m)?.[0]}`)
}
