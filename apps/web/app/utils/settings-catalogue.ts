/**
 * The audit of change simple-mode-ux-pass as data: every setting or control of the set-up surfaces, its class
 * (rubric of design.md) and whether simple mode shows it. Read by the budget test, later by the options dialog,
 * the profile, the search and the guide, so one place says what simple mode may show.
 * Data only: no I/O, no framework import.
 */
import type { MessageKey } from '@retroboard/i18n'

export type SettingsSurface = 'creation' | 'options' | 'profile' | 'toolbar'
/** Essential (E), occasional (O) or expert (X): only essential settings are shown in simple mode. */
export type SettingClass = 'essential' | 'occasional' | 'expert'

export interface CatalogueEntry {
  /** The id of the audit table (C1, O5, P4, T2). */
  id: string
  surface: SettingsSurface
  class: SettingClass
  /** The visible group the control belongs to ("Votes", "Appearance"); simple budgets count distinct groups. */
  group: string
  label: MessageKey
  hint?: MessageKey
  /** Shown in simple mode. */
  simple: boolean
  /** Simple, but folded in a disclosure that starts closed (it counts once, apart from the visible groups). */
  collapsed?: boolean
}

/** What simple mode may show per surface (design.md, "Budgets"). A change that adds a control lowers another or raises this with its reason. */
export const SIMPLE_BUDGETS: Record<SettingsSurface, { groups: number; collapsed: number }> = {
  creation: { groups: 4, collapsed: 0 },
  options: { groups: 6, collapsed: 1 },
  profile: { groups: 7, collapsed: 0 },
  toolbar: { groups: 9, collapsed: 0 },
}

/** The longest hint a simple control may carry (design.md, "Settings information architecture"). */
export const MAX_SIMPLE_HINT = 90

const E = 'essential'
const O = 'occasional'
const X = 'expert'

export const SETTINGS_CATALOGUE: readonly CatalogueEntry[] = [
  // Creation page (/new)
  { id: 'C1', surface: 'creation', class: E, group: 'title', label: 'setup.name', simple: true },
  { id: 'C2', surface: 'creation', class: E, group: 'password', label: 'setup.passcode', hint: 'setup.passcode.hint', simple: false },
  { id: 'C2a', surface: 'creation', class: E, group: 'title', label: 'setup.passcode.auto', hint: 'setup.passcode.auto.hint', simple: true },
  { id: 'C3', surface: 'creation', class: E, group: 'theme', label: 'setup.step1', simple: true },
  { id: 'C4', surface: 'creation', class: X, group: 'theme-extras', label: 'setup.ambient', hint: 'setup.ambient.hint', simple: false },
  { id: 'C5', surface: 'creation', class: E, group: 'format', label: 'setup.step2', simple: true },
  { id: 'C6', surface: 'creation', class: O, group: 'solo', label: 'new.soloMode', hint: 'new.soloMode.hint', simple: false },
  { id: 'C7', surface: 'creation', class: X, group: 'presenter', label: 'new.presenterMenus', hint: 'new.presenterMenus.hint', simple: false },
  { id: 'C8', surface: 'creation', class: E, group: 'agenda', label: 'agenda.use', hint: 'agenda.use.simple.hint', simple: true },
  { id: 'C9', surface: 'creation', class: X, group: 'agenda-editor', label: 'agenda.title', simple: false },
  { id: 'C10', surface: 'creation', class: O, group: 'agenda-editor', label: 'agenda.autoStart', simple: false },
  { id: 'C11', surface: 'creation', class: X, group: 'agenda-editor', label: 'agenda.rules', simple: false },
  { id: 'C12', surface: 'creation', class: O, group: 'team', label: 'team.team', simple: false },
  { id: 'C13', surface: 'creation', class: O, group: 'team', label: 'team.project', simple: false },
  { id: 'C14', surface: 'creation', class: O, group: 'carry', label: 'carry.title', hint: 'carry.intro', simple: false },
  { id: 'C15', surface: 'creation', class: O, group: 'facilitation', label: 'setup.fac.title', simple: false },
  { id: 'C16', surface: 'creation', class: O, group: 'voting', label: 'setup.voting.enabled', hint: 'setup.voting.enabled.hint', simple: false },
  { id: 'C17', surface: 'creation', class: O, group: 'voting', label: 'options.votesPer', hint: 'options.votesPer.hint', simple: false },
  { id: 'C18', surface: 'creation', class: O, group: 'voting', label: 'options.secret', hint: 'options.secret.hint', simple: false },
  { id: 'C19', surface: 'creation', class: X, group: 'voting', label: 'setup.votable', hint: 'setup.votable.hint', simple: false },
  { id: 'C20', surface: 'creation', class: X, group: 'arrivals', label: 'setup.arrivals', hint: 'setup.arrivals.hint', simple: false },

  // Board options (OptionsDialog)
  { id: 'O1', surface: 'options', class: E, group: 'retro', label: 'options.name', simple: true },
  { id: 'O2', surface: 'options', class: O, group: 'look', label: 'options.noteSize', simple: false },
  { id: 'O3', surface: 'options', class: O, group: 'look', label: 'options.noteText', simple: false },
  { id: 'O4', surface: 'options', class: X, group: 'notes', label: 'options.noteMax', simple: false },
  { id: 'O5', surface: 'options', class: E, group: 'votes', label: 'setup.voting.enabled', hint: 'setup.voting.enabled.hint', simple: true },
  { id: 'O6', surface: 'options', class: E, group: 'votes', label: 'options.votesPer', hint: 'options.votesPer.hint', simple: true },
  { id: 'O7', surface: 'options', class: X, group: 'votes', label: 'options.allOnOne', hint: 'options.allOnOne.hint', simple: false },
  { id: 'O8', surface: 'options', class: X, group: 'votes', label: 'options.perItem', simple: false },
  { id: 'O9', surface: 'options', class: X, group: 'votes', label: 'options.votable', simple: false },
  { id: 'O10', surface: 'options', class: X, group: 'votes', label: 'setup.votable', hint: 'setup.votable.hint', simple: false },
  { id: 'O11', surface: 'options', class: E, group: 'votes', label: 'options.secret', hint: 'options.secret.hint', simple: true },
  { id: 'O12', surface: 'options', class: X, group: 'access', label: 'options.arrivals', hint: 'options.arrivals.hint', simple: false },
  { id: 'O13', surface: 'options', class: E, group: 'access', label: 'options.lock', hint: 'options.lock.hint', simple: true },
  { id: 'O14', surface: 'options', class: X, group: 'access', label: 'options.browserAgents', hint: 'options.browserAgents.hint', simple: false },
  { id: 'O15', surface: 'options', class: O, group: 'access', label: 'roles.open', hint: 'roles.open.hint', simple: false },
  { id: 'O16', surface: 'options', class: O, group: 'actions', label: 'actions.title', simple: false },
  { id: 'O17', surface: 'options', class: X, group: 'talk', label: 'talk.title', simple: false },
  { id: 'O18', surface: 'options', class: O, group: 'retro', label: 'options.theme', simple: true },
  { id: 'O19', surface: 'options', class: O, group: 'columns', label: 'options.format', hint: 'options.columns.hint', simple: true },
  { id: 'O20', surface: 'options', class: O, group: 'danger', label: 'options.danger', simple: true, collapsed: true },

  // Profile (ProfileDialog)
  { id: 'P1', surface: 'profile', class: E, group: 'identity', label: 'profile.showName', hint: 'profile.showName.hint', simple: true },
  { id: 'P2', surface: 'profile', class: O, group: 'identity', label: 'profile.avatarColor', simple: true },
  { id: 'P3', surface: 'profile', class: E, group: 'mode', label: 'mode.label', hint: 'mode.hint', simple: true },
  { id: 'P4', surface: 'profile', class: E, group: 'language', label: 'profile.language', hint: 'profile.language.hint', simple: true },
  { id: 'P5', surface: 'profile', class: E, group: 'variant', label: 'profile.variant', hint: 'profile.variant.hint', simple: true },
  { id: 'P6', surface: 'profile', class: O, group: 'appearance', label: 'profile.defaultTheme', simple: false },
  { id: 'P7', surface: 'profile', class: O, group: 'appearance', label: 'profile.presentGroups', hint: 'profile.presentGroups.hint', simple: false },
  { id: 'P8', surface: 'profile', class: X, group: 'appearance', label: 'profile.ambient', hint: 'profile.ambient.hint', simple: false },
  { id: 'P9', surface: 'profile', class: X, group: 'appearance', label: 'profile.motion', hint: 'profile.motion.hint', simple: false },
  { id: 'P10', surface: 'profile', class: X, group: 'appearance', label: 'profile.density', simple: false },
  { id: 'P11', surface: 'profile', class: X, group: 'appearance', label: 'profile.shortcuts', hint: 'profile.shortcuts.hint', simple: false },
  { id: 'P12', surface: 'profile', class: X, group: 'notifications', label: 'profile.notifyPos', simple: false },
  { id: 'P13', surface: 'profile', class: X, group: 'notifications', label: 'profile.stepperTime', simple: false },
  { id: 'P14', surface: 'profile', class: O, group: 'notifications', label: 'profile.phaseWarning', simple: false },
  { id: 'P15', surface: 'profile', class: O, group: 'notifications', label: 'profile.systemNotify', hint: 'profile.systemNotify.hint', simple: false },
  { id: 'P16', surface: 'profile', class: X, group: 'notifications', label: 'profile.chatStatus', hint: 'profile.chatStatus.hint', simple: false },
  { id: 'P17', surface: 'profile', class: O, group: 'sound', label: 'profile.sound', simple: true },
  { id: 'P18', surface: 'profile', class: E, group: 'privacy-summary', label: 'profile.retention', hint: 'profile.retention.hint', simple: true },
  { id: 'P19', surface: 'profile', class: O, group: 'privacy', label: 'profile.shareCursor', hint: 'profile.shareCursor.hint', simple: false },
  { id: 'P20', surface: 'profile', class: X, group: 'privacy', label: 'profile.showCursors', simple: false },

  // Board toolbar (AppToolbar): "in view" in simple mode, the rest behind More
  { id: 'T1', surface: 'toolbar', class: E, group: 'share', label: 'toolbar.share', simple: true },
  { id: 'T2', surface: 'toolbar', class: E, group: 'people', label: 'toolbar.participants', simple: true },
  { id: 'T3', surface: 'toolbar', class: E, group: 'undo', label: 'undo.title', simple: true },
  { id: 'T4', surface: 'toolbar', class: O, group: 'redo', label: 'redo.title', simple: false },
  { id: 'T5', surface: 'toolbar', class: O, group: 'history', label: 'history.title', simple: false },
  { id: 'T6', surface: 'toolbar', class: E, group: 'actions', label: 'toolbar.actions', simple: true },
  { id: 'T7', surface: 'toolbar', class: E, group: 'chat', label: 'chat.title', simple: true },
  { id: 'T8', surface: 'toolbar', class: O, group: 'filter', label: 'toolbar.filter', simple: false },
  { id: 'T9', surface: 'toolbar', class: E, group: 'present', label: 'toolbar.presenter', simple: true },
  { id: 'T10', surface: 'toolbar', class: O, group: 'writing', label: 'toolbar.writing.hide', simple: false },
  { id: 'T11', surface: 'toolbar', class: E, group: 'export', label: 'toolbar.export', simple: true },
  { id: 'T12', surface: 'toolbar', class: O, group: 'activity', label: 'activity.title', simple: false },
  { id: 'T13', surface: 'toolbar', class: E, group: 'options', label: 'toolbar.options', simple: true },
  { id: 'T14', surface: 'toolbar', class: O, group: 'boards', label: 'toolbar.boards', simple: false },
  { id: 'T15', surface: 'toolbar', class: O, group: 'variant', label: 'toolbar.variant.toDark', simple: false },
  { id: 'T16', surface: 'toolbar', class: E, group: 'profile', label: 'profile.title', simple: true },
]

/** The simple budget of a surface, as the catalogue spends it: distinct visible groups and collapsed disclosures. */
export function simpleUsage(surface: SettingsSurface, catalogue: readonly CatalogueEntry[] = SETTINGS_CATALOGUE): { groups: string[]; collapsed: string[] } {
  const rows = catalogue.filter((e) => e.surface === surface && e.simple)
  const uniq = (xs: string[]) => [...new Set(xs)]
  return { groups: uniq(rows.filter((e) => !e.collapsed).map((e) => e.group)), collapsed: uniq(rows.filter((e) => e.collapsed).map((e) => e.group)) }
}

/** The failures of the simple budgets, each naming the surface and what it shows ([] when all hold). */
export function budgetViolations(catalogue: readonly CatalogueEntry[] = SETTINGS_CATALOGUE): string[] {
  const out: string[] = []
  for (const surface of Object.keys(SIMPLE_BUDGETS) as SettingsSurface[]) {
    const { groups, collapsed } = simpleUsage(surface, catalogue)
    const b = SIMPLE_BUDGETS[surface]
    if (groups.length > b.groups) out.push(`${surface}: ${groups.length} simple groups, budget ${b.groups} (${groups.join(', ')})`)
    if (collapsed.length > b.collapsed) out.push(`${surface}: ${collapsed.length} collapsed disclosures, budget ${b.collapsed} (${collapsed.join(', ')})`)
  }
  return out
}
