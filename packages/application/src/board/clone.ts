import type { CloneColumn, ImportedAction, PhaseInput, Snapshot } from '@retroboard/domain'

/**
 * What a new board takes from an existing one (change feedback-wave-7). Never any idea, vote, chat or name:
 * - `board`: the title, theme, columns and agenda settings (an empty copy of the structure);
 * - `actions`: only the open actions, to be imported in a new empty board.
 */
export type CloneKind = 'board' | 'actions'

export interface CloneSpec {
  kind: CloneKind
  title: string
  themeId: string
  columns?: CloneColumn[]
  agenda?: { phases: PhaseInput[]; rules: boolean; autoPublish: boolean; chain: boolean }
  actions?: ImportedAction[]
}

export function cloneSpec(snap: Snapshot, kind: CloneKind, copyLabel: string): CloneSpec {
  const title = `${snap.settings.title ?? ''}`.trim()
  if (kind === 'actions') {
    const actions = snap.actions
      .filter((a) => a.status !== 'done' && a.status !== 'dropped')
      .map((a) => ({ text: a.text, owner: a.owner, status: a.status, ...(a.due ? { due: a.due } : {}), from: title || undefined }) as ImportedAction)
    return { kind, title: title ? `${title} - ${copyLabel}` : copyLabel, themeId: snap.settings.themeId, actions }
  }
  const a = snap.agenda
  return {
    kind,
    title: title ? `${title} - ${copyLabel}` : copyLabel,
    themeId: snap.settings.themeId,
    columns: snap.columns.map((c) => ({ title: c.title, subtitle: c.subtitle, icon: c.icon, ...(c.color === undefined ? {} : { color: c.color }), ...(c.votable === false ? { votable: false } : {}) })),
    ...(a ? { agenda: { phases: a.phases.map((p) => ({ kind: p.kind, minutes: Math.max(1, Math.round(p.plannedMs / 60_000)) })), rules: a.rules, autoPublish: a.autoPublish, chain: a.chain !== false } } : {}),
  }
}
