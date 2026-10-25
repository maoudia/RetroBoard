/** Paths the single-page app answers. Anything else under the SPA fallback is a real 404. */
export const APP_ROUTES: ReadonlySet<string> = new Set(["/", "/new", '/board', '/check', '/offline', '/unsupported', '/maintenance', '/busy', '/legal', '/privacy', '/terms', '/accessibility'])

export function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname
}

/** True when the asset layer answered with the SPA shell for a path that is not an app route. */
export function isUnknownAppPath(pathname: string, response: Response): boolean {
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return false
  return !APP_ROUTES.has(normalizePath(pathname))
}

export function wantsHtml(request: Request): boolean {
  if (request.headers.get('Sec-Fetch-Mode') === 'navigate') return true
  const accept = request.headers.get('Accept') ?? ''
  return accept.includes('text/html')
}

/**
 * Browsers navigating get the branded page, every other client a short text body;
 * the status code is the same for both.
 */
export function pickErrorResponse(request: Request, status: number, branded: Response | null, text: string): Response {
  if (branded && wantsHtml(request)) {
    return new Response(request.method === 'HEAD' ? null : branded.body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
  }
  return new Response(request.method === 'HEAD' ? null : text, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}
