/** One line of a release: the Conventional Commit scope (when it has one) and its subject, as release-please wrote it. */
export interface ReleaseItem { scope: string | null; text: string }
export interface ReleaseSection { title: string; items: ReleaseItem[] }
export interface Release { version: string; date: string; sections: ReleaseSection[] }

declare global {
  /** The latest releases parsed from CHANGELOG.md at build time (nuxt.config.ts `vite.define`); never read at runtime. */
  const __RELEASE_NOTES__: readonly Release[]
}

const HEADING = /^## \[?(\d+\.\d+\.\d+[^\]\s)]*)\]?(?:\([^)]*\))? \((\d{4}-\d{2}-\d{2})\)\s*$/
const ITEM = /^[*-] (?:\*\*([^*]+?):\*\* )?(.+)$/

/** Markdown links keep their label, a trailing "(abc1234)" or "(abc1234, closes #12)" commit reference goes, backticks go. */
function clean(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s*\([0-9a-f]{7,40}(?:,[^)]*)?\)\s*$/, '')
    .replace(/`/g, '')
    .trim()
}

/** The latest `limit` releases of a release-please CHANGELOG, newest first. Pure: unknown lines are ignored, a malformed file gives an empty list. */
export function parseChangelog(markdown: string, limit = 12): Release[] {
  const releases: Release[] = []
  let release: Release | null = null
  let section: ReleaseSection | null = null
  for (const line of markdown.split(/\r?\n/)) {
    const heading = HEADING.exec(line)
    if (heading) {
      if (releases.length >= limit) break
      release = { version: heading[1]!, date: heading[2]!, sections: [] }
      releases.push(release)
      section = null
    } else if (release && line.startsWith('### ')) {
      section = { title: line.slice(4).replace(/^[^\p{L}\p{N}]+/u, '').trim(), items: [] }
      release.sections.push(section)
    } else if (section) {
      const item = ITEM.exec(line)
      const text = item ? clean(item[2]!) : ''
      if (text) section.items.push({ scope: item![1]?.trim() ?? null, text })
    }
  }
  return releases.map((r) => ({ ...r, sections: r.sections.filter((s) => s.items.length > 0) }))
}

/** The dictionary key (`whatsnew.section.<slug>`) of a release-please section title, or null for a title the page does not know. */
export function sectionSlug(title: string): string | null {
  switch (title.toLowerCase()) {
    case 'features': return 'features'
    case 'bug fixes': return 'fixes'
    case 'performance': return 'perf'
    case 'refactoring': return 'refactor'
    case 'breaking changes': return 'breaking'
    default: return null
  }
}
