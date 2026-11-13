// Post-generate step: writes `_headers` so the asset layer sends the security headers of the hashed files under /_nuxt/,
// which no longer pass through the Worker (wrangler.jsonc `run_worker_first`, ADR-0034).
// These values are a copy of `withSecurityHeaders` in apps/relay/src/core/headers.ts (this script cannot import the relay package);
// scripts/ci/test/asset-headers.test.ts fails when the two drift.
// No Cache-Control on purpose: `_headers` also decorates the 404 of a missing file, and an immutable 404 would stay in the
// browser cache for a year. Without it the platform default (`max-age=0, must-revalidate`) applies and a revisit costs a free 304.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const ASSET_HEADERS = {
  'Strict-Transport-Security': 'max-age=15552000',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), interest-cohort=()',
  'X-Robots-Tag': 'noindex, nofollow',
}

/** The body of the `_headers` file. */
export function renderHeaders(headers = ASSET_HEADERS) {
  return ['/_nuxt/*', ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`), ''].join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = process.argv[2] ?? '.output/public'
  writeFileSync(join(dir, '_headers'), renderHeaders())
  console.log(`headers: ${Object.keys(ASSET_HEADERS).length} security header(s) for /_nuxt/*`)
}
