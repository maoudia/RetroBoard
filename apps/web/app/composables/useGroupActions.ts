import type { ColumnItem } from '@retroboard/application'
import { groupActions, type GroupActionId } from '~/utils/group-actions'

type GroupItem = Extract<ColumnItem, { kind: 'group' }>

/**
 * The actions of a group with their rights, and what each one does (change group-colors-menu-and-scope).
 * The three-dot menu on the stack and the footer of the panel both read `entries`, so they offer the same actions.
 */
export function useGroupActions(item: () => GroupItem) {
  const { t } = useT()
  const board = useBoardStore()
  const ui = useUiStore()
  const gate = computed(() => board.availability('action.add'))
  const mergeTargets = computed(() => board.itemsFor(item().group.columnId, 'time').filter((i): i is GroupItem => i.kind === 'group' && i.group.id !== item().group.id))
  const otherColumns = computed(() => board.columns.filter((c) => c.id !== item().group.columnId))
  const entries = computed(() => groupActions({
    locked: board.locked,
    frozen: !!item().group.frozen,
    pinned: !!item().group.pinned,
    canSteer: board.access.canSteer,
    actionAllowed: gate.value.allowed,
    mergeTargets: mergeTargets.value.length,
    otherColumns: otherColumns.value.length,
  }))
  const has = (id: GroupActionId) => entries.value.some((e) => e.id === id)
  const actionTitle = computed(() => (gate.value.allowed ? undefined : t('gated.actions.closed', { phase: gate.value.closedBy ? t(`agenda.phase.${gate.value.closedBy}` as never) : '' })))
  /** A voted group asks before it is dissolved. */
  const voted = computed(() => (item().group.votes ?? 0) > 0 || item().group.myVotes > 0 || item().votes > 0)
  const dissolveAsk = ref(false)

  const open = () => ui.openGroup(item().group.columnId, item().group.id)
  const rename = () => ui.openGroup(item().group.columnId, item().group.id, { rename: true })
  const recolor = (color: number) => board.commands.recolorGroup(item().group.id, color)
  const morePalette = () => ui.openPalette(item().group.id, 'group')
  const togglePin = () => board.commands[item().group.pinned ? 'unpin' : 'pin'](item().group.id)
  const toggleFreeze = () => board.commands[item().group.frozen ? 'unfreeze' : 'freeze'](item().group.id)
  /** The panel closes (the group and its place are unchanged), then the action form opens on the group. */
  function toAction() {
    const { group, title } = item()
    ui.closeGroup(group.columnId)
    ui.openActionFrom({ sourceId: group.id, text: title, owner: '' })
  }
  /** The group moves; its panel, if open, follows it to the new column. */
  const moveTo = (columnId: string) => board.commands.moveGroup(item().group.id, columnId)
  /** The group merges into the target, which opens in its column. */
  function mergeInto(targetId: string) {
    const target = mergeTargets.value.find((m) => m.group.id === targetId)
    board.commands.mergeGroups(item().group.id, targetId)
    ui.openGroup(target?.group.columnId ?? item().group.columnId, targetId)
  }
  const dissolve = () => { if (voted.value) dissolveAsk.value = true; else doDissolve() }
  const doDissolve = () => board.commands.dissolveGroup(item().group.id)
  return { entries, has, mergeTargets, otherColumns, actionTitle, voted, dissolveAsk, open, rename, recolor, morePalette, togglePin, toggleFreeze, toAction, moveTo, mergeInto, dissolve, doDissolve }
}
