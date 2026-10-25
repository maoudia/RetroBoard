/**
 * Status messages for assistive technology (change accessibility-wcag, WCAG 4.1.3): events are
 * collected for a short window and merged, so a burst of notes is one polite message
 * ("3 new notes in Start") instead of three. Pure: the web app owns the timers and the regions.
 */
export type AnnounceItem =
  | { kind: 'note'; column: string }
  /** `detail`: what opened and closed with the phase, appended as is. */
  | { kind: 'phase'; phase: string; detail?: string }
  | { kind: 'revealed' }

/** Message keys; `a11y.newNotes` has `.one` and `.other` forms (see i18n plural rules). */
export type AnnounceKey = 'a11y.newNotes' | 'a11y.phase' | 'a11y.revealed'
export type AnnounceSay = (key: AnnounceKey, params: Record<string, string | number>) => string

/** How long events are collected before one merged message is spoken. */
export const ANNOUNCE_WINDOW_MS = 1500

/**
 * Merges a window of events into polite messages: notes are counted per column (columns in order
 * of first appearance), only the last phase change is kept, the reveal is said once. The phase and
 * the reveal come first because they change what the person can do.
 */
export function summarizeAnnouncements(items: readonly AnnounceItem[], say: AnnounceSay): string[] {
  const out: string[] = []
  const phase = [...items].reverse().find((i): i is Extract<AnnounceItem, { kind: 'phase' }> => i.kind === 'phase')
  if (phase) out.push(phase.detail ? `${say('a11y.phase', { phase: phase.phase })}. ${phase.detail}` : say('a11y.phase', { phase: phase.phase }))
  if (items.some((i) => i.kind === 'revealed')) out.push(say('a11y.revealed', {}))
  const perColumn = new Map<string, number>()
  for (const i of items) if (i.kind === 'note') perColumn.set(i.column, (perColumn.get(i.column) ?? 0) + 1)
  for (const [column, n] of perColumn) out.push(say('a11y.newNotes', { n, column }))
  return out
}

/** Ids present in `next` and not in `prev`; empty when there is no previous list (first load). */
export function newIds(prev: ReadonlySet<string> | null, next: readonly string[]): string[] {
  if (!prev) return []
  return next.filter((id) => !prev.has(id))
}
