/** Route prefixes that never carry public content: boards, poker rooms, join links, the browser check, the offline shell, the dev pages and the storage sign-in callback. */
export const PRIVATE_PREFIXES = ['/boards', '/board', '/poker/room', '/check', '/offline', '/dev', '/storage'] as const

/** True for a private route whatever the indexing switch says; `/boardsfoo` is not `/boards`, `/boards/x` is. */
export function isPrivatePath(pathname: string): boolean {
  const path = pathname.replace(/\.html$/, '')
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/** The indexing switch of `apps/web/site.json`: nothing indexed (before the launch, self-hosting) or the public pages indexed. */
export type Indexing = 'none' | 'public'

/** Anything but the exact value `public` keeps the site out of every index. */
export function parseIndexing(value: unknown): Indexing {
  return value === 'public' ? 'public' : 'none'
}

/** The two languages of the format pages; French is the source language and has no prefix. */
export type FormatLang = 'fr' | 'en'

/** True for the format index and the format pages of both languages (prerendered files, not shells of the app). */
export function isFormatPath(pathname: string): boolean {
  return /^\/(en\/)?formats(\/|$)/.test(pathname)
}

/** URL of the format index (`id` null) or of one format page, with the language prefix and a trailing slash. */
export function formatPath(id: string | null, lang: FormatLang): string {
  return `${lang === 'en' ? '/en' : ''}/formats/${id === null ? '' : `${id}/`}`
}
