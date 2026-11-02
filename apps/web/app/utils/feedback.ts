/** Feedback links. Pure: nothing here reads the board, so no room id, key, passcode or content can leak into a URL. */
const REPO = 'https://github.com/maoudia/retroboard'

export const FOLLOW_LINKS = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/maoudia' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/maoudia' },
  { id: 'x', label: 'X', href: 'https://x.com/maoudia' },
  { id: 'devto', label: 'DEV.to', href: 'https://dev.to/maoudia' },
] as const

export const HOME_URL = 'https://maoudia.com'

export interface BugContext { version: string, browser: string, screen: string, locale: string }

/** Screen class only (never exact pixel sizes): phone, tablet, desktop or tv. */
export function screenClass(width: number): string {
  return width < 600 ? 'phone' : width < 1024 ? 'tablet' : width < 2200 ? 'desktop' : 'tv'
}

/** Browser family and major version from the user agent (no full UA string). */
export function browserName(ua: string): string {
  const m = /(Edg|Firefox|OPR|Chrome|Version)\/(\d+)/.exec(ua)
  if (!m) return 'unknown'
  const family = m[1] === 'Edg' ? 'Edge' : m[1] === 'OPR' ? 'Opera' : m[1] === 'Version' ? 'Safari' : m[1]
  return `${family} ${m[2]}`
}

/** GitHub issue form link prefilled with the environment line only. */
export function bugReportUrl(ctx: BugContext): string {
  const env = `RetroBoard ${ctx.version}, ${ctx.browser}, ${ctx.screen}, ${ctx.locale}`
  const q = new URLSearchParams({ template: 'bug.yml', env })
  return `${REPO}/issues/new?${q.toString()}`
}

export const ideaUrl = `${REPO}/issues/new?template=idea.yml`
export const discussionsUrl = `${REPO}/discussions`
