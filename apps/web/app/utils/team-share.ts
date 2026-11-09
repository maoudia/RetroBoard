import { fromBase64Url, fromUtf8, open, randomKey, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { parseTeamShare, type TeamShare } from '@retroboard/application'

/**
 * A team on its way to another device (change team-workspaces): an encrypted link and a `.retroteam` file.
 * Both carry a TeamShare, which holds no board content by construction.
 */
export const TEAM_FILE_FORMAT = 'retroboard-team'
const AAD = utf8('retroboard:team:v1')
const PREFIX = '#team='

/** The link keeps the team in its fragment, sealed with a fresh key placed next to it: the fragment never reaches a server. */
export async function teamLink(share: TeamShare, origin: string): Promise<string> {
  const key = randomKey()
  const sealed = await seal(key, utf8(JSON.stringify(share)), AAD)
  return `${origin}/${PREFIX}${toBase64Url(key)}.${toBase64Url(sealed)}`
}

export const isTeamHash = (hash: string): boolean => hash.startsWith(PREFIX)

/** The team of a link fragment, or null when it is not a team link, was altered or does not hold a team. */
export async function teamFromHash(hash: string): Promise<TeamShare | null> {
  if (!isTeamHash(hash)) return null
  const [k, ct, ...extra] = hash.slice(PREFIX.length).split('.')
  const key = k ? fromBase64Url(k) : null
  const sealed = ct ? fromBase64Url(ct) : null
  if (!key || !sealed || extra.length || key.length !== 32) return null
  const plain = await open(key, sealed, AAD)
  if (!plain) return null
  try { return parseTeamShare(JSON.parse(fromUtf8(plain))) } catch { return null }
}

export const buildTeamFile = (share: TeamShare): string => `${JSON.stringify({ format: TEAM_FILE_FORMAT, version: 1, team: share }, null, 2)}\n`

/** The team of a `.retroteam` file, or null when the file is not one of this version. */
export function parseTeamFile(text: string): TeamShare | null {
  try {
    const f = JSON.parse(text) as { format?: unknown; version?: unknown; team?: unknown } | null
    return f && f.format === TEAM_FILE_FORMAT && f.version === 1 ? parseTeamShare(f.team) : null
  } catch { return null }
}
