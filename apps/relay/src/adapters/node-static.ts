import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { extname, join, sep } from 'node:path'
import { Readable } from 'node:stream'
import type { AssetsPort } from '../core/headers'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
}

/** Build-tool files that the hosted asset layer reads but never serves. */
const PRIVATE = new Set(['/_headers', '/_redirects'])

/** Candidate files for a URL path, in the order of the hosted asset layer: the file itself, `<path>.html`, `<path>/index.html`. */
export function candidates(pathname: string): string[] {
  if (pathname === '/') return ['/index.html']
  const bare = pathname.replace(/\/+$/, '')
  return pathname.endsWith('/') ? [`${bare}/index.html`, `${bare}.html`] : [bare, `${bare}.html`, `${bare}/index.html`]
}

/** Segments are decoded once; a malformed escape, a NUL byte or a backslash is never a file. */
export function safePath(pathname: string): string | null {
  let decoded: string
  try { decoded = decodeURIComponent(pathname) } catch { return null }
  if (decoded.includes('\0') || decoded.includes('\\') || !decoded.startsWith('/')) return null
  return decoded.split('/').includes('..') ? null : decoded
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

/**
 * The static site read from a directory, held to the rules of the hosted asset layer (the assets port contract):
 * exact file, `.html`, directory index, a missing file (hashed ones included) is a plain 404 for the handler to dress,
 * `ETag` with conditional GET, `HEAD`, and nothing outside the root, symbolic links included.
 */
export function createAssets(root: string): AssetsPort {
  const base = realpath(root)
  /** The first candidate that is a regular file inside the root. */
  const find = async (pathname: string) => {
    const rootReal = await base
    for (const candidate of candidates(pathname)) {
      if (PRIVATE.has(candidate)) continue
      const file = join(rootReal, candidate)
      try {
        const real = await realpath(file)
        if (real !== rootReal && !real.startsWith(rootReal + sep)) continue
        const info = await stat(real)
        if (info.isFile()) return { real, info }
      } catch { /* not there */ }
    }
    return null
  }
  return {
    async fetch(input) {
      const request = typeof input === 'string' ? new Request(input) : input
      const method = request.method
      if (method !== 'GET' && method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
      const pathname = safePath(new URL(request.url).pathname)
      const hit = pathname === null ? null : await find(pathname)
      if (!hit) return notFound()
      const etag = `W/"${hit.info.size.toString(16)}-${Math.floor(hit.info.mtimeMs).toString(16)}"`
      const headers = new Headers({
        'Content-Type': TYPES[extname(hit.real).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: etag,
      })
      const match = request.headers.get('If-None-Match')
      if (match && match.split(',').some((t) => t.trim() === etag || t.trim() === '*')) return new Response(null, { status: 304, headers })
      headers.set('Content-Length', String(hit.info.size))
      if (method === 'HEAD') return new Response(null, { status: 200, headers })
      return new Response(Readable.toWeb(createReadStream(hit.real)) as unknown as ReadableStream, { status: 200, headers })
    },
  }
}
