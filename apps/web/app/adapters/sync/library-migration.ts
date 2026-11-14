/**
 * One-time, idempotent import of what earlier versions kept apart: the sealed list of recent boards
 * (`retroboard:recents`) and the solo marks (`retroboard:solo`) become entries of the library (change user-drive-storage).
 * The old keys stay for one release so a rollback loses nothing; a board that already has a record, a tombstone included,
 * is never imported again, so forgetting a board is not undone by the next start.
 */
import { type Library, type LibraryStorePort, getEntry, saveEntry } from '@retroboard/application'
import { safeStorage } from '~/utils/storage'
import { inviteFromHash } from '~/utils/invite'

export const LEGACY_RECENTS_KEY = 'retroboard:recents'
export const LEGACY_SOLO_KEY = 'retroboard:solo'

interface StoredRecent { id: string; themeId: string; at: number; sealed?: string; title?: string; hash?: string }

function parseSealed(plain: string | null): { title: string; hash: string } | null {
  try {
    const v = (plain ? JSON.parse(plain) : null) as { title?: unknown; hash?: unknown } | null
    return v && typeof v.title === 'string' && typeof v.hash === 'string' ? { title: v.title, hash: v.hash } : null
  } catch { return null }
}

/** Decodes the legacy list: sealed entries through `open`, entries written in clear by older versions as they are. */
export async function readLegacyRecents(open: (sealed: string) => Promise<string | null>): Promise<{ id: string; title: string; hash: string; themeId: string; at: number }[]> {
  const stored = safeStorage.get<StoredRecent[]>(LEGACY_RECENTS_KEY, [])
  const out: { id: string; title: string; hash: string; themeId: string; at: number }[] = []
  for (const r of Array.isArray(stored) ? stored : []) {
    if (typeof r?.id !== 'string' || typeof r.at !== 'number') continue
    if (r.sealed) {
      const v = parseSealed(await open(r.sealed))
      if (v) out.push({ id: r.id, title: v.title, hash: v.hash, themeId: r.themeId, at: r.at })
    } else if (typeof r.title === 'string') {
      out.push({ id: r.id, title: r.title, hash: r.hash ?? `#${r.id}`, themeId: r.themeId, at: r.at })
    }
  }
  return out
}

export async function migrateLegacyLibrary(
  store: LibraryStorePort, open: (sealed: string) => Promise<string | null>, now: number, device: string,
): Promise<number> {
  const legacy = await readLegacyRecents(open)
  if (!legacy.length) return 0
  const solo = new Set(safeStorage.get<string[]>(LEGACY_SOLO_KEY, []))
  let imported = 0
  await store.update((library: Library) => {
    imported = 0
    let next = library
    for (const r of legacy) {
      if (Object.hasOwn(next, r.id) || getEntry(next, r.id)) continue
      const invite = inviteFromHash(r.hash)
      const created = invite?.kind === 'legacy' || !!invite?.ring.facilitatorSecret
      next = saveEntry(next, {
        boardId: r.id, title: r.title, themeId: r.themeId, role: created ? 'facilitator' : 'participant', origin: created ? 'created' : 'joined',
        fragment: r.hash, hasPasscode: !!(invite?.kind === 'encrypted' && invite.ring.passcode), solo: solo.has(r.id), createdAt: r.at, lastActivityAt: r.at,
      }, now, device)
      imported++
    }
    return next
  })
  return imported
}
