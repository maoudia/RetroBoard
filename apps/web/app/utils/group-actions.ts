import type { MessageBase } from '@retroboard/i18n'

/** The quick actions of a group (cluster): one list read by the three-dot menu on the stack and by the panel footer, so they cannot drift (change group-colors-menu-and-scope). */
export type GroupActionId = 'open' | 'rename' | 'recolor' | 'toAction' | 'pin' | 'freeze' | 'moveTo' | 'mergeInto' | 'dissolve'

export interface GroupRights {
  /** The board is locked: nothing that changes the group is offered. */
  locked: boolean
  frozen: boolean
  pinned: boolean
  /** Facilitator or co-facilitator. */
  canSteer: boolean
  /** The current phase accepts actions. */
  actionAllowed: boolean
  /** Other groups of the column. */
  mergeTargets: number
  /** Other columns of the board. */
  otherColumns: number
}

export interface GroupActionEntry {
  id: GroupActionId
  icon: string
  label: MessageBase
  disabled?: boolean
  /** Open and Rename are what the panel already is: the menu offers them, the footer does not. */
  menuOnly?: boolean
}

export function groupActions(r: GroupRights): GroupActionEntry[] {
  const change = !r.locked && !r.frozen
  const list: (GroupActionEntry | false)[] = [
    { id: 'open', icon: 'lucide:layers', label: 'group.open', menuOnly: true },
    change && { id: 'rename', icon: 'lucide:pencil', label: 'group.rename', menuOnly: true },
    change && { id: 'recolor', icon: 'lucide:palette', label: 'cluster.recolor' },
    { id: 'toAction', icon: 'lucide:list-checks', label: 'note.toAction', disabled: !r.actionAllowed },
    r.canSteer && { id: 'pin', icon: r.pinned ? 'lucide:pin-off' : 'lucide:pin', label: r.pinned ? 'note.unpin' : 'note.pin' },
    r.canSteer && { id: 'freeze', icon: r.frozen ? 'lucide:flame' : 'lucide:snowflake', label: r.frozen ? 'note.unfreeze' : 'note.freeze' },
    change && r.otherColumns > 0 && { id: 'moveTo', icon: 'lucide:arrow-right-left', label: 'cluster.moveTo' },
    change && r.mergeTargets > 0 && { id: 'mergeInto', icon: 'lucide:combine', label: 'cluster.mergeInto' },
    !r.locked && { id: 'dissolve', icon: 'lucide:ungroup', label: 'group.dissolve', disabled: r.frozen },
  ]
  return list.filter((e): e is GroupActionEntry => !!e)
}
