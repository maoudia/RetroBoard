import { describe, expect, it } from 'vitest'
import { type GroupRights, groupActions } from '../app/utils/group-actions'

const base: GroupRights = { locked: false, frozen: false, pinned: false, canSteer: false, actionAllowed: true, mergeTargets: 2, otherColumns: 2 }
const ids = (r: Partial<GroupRights>) => groupActions({ ...base, ...r }).map((e) => e.id)

describe('group actions', () => {
  it('offers a participant everything but pin and freeze', () => {
    expect(ids({})).toEqual(['open', 'rename', 'recolor', 'toAction', 'moveTo', 'mergeInto', 'dissolve'])
  })
  it('offers a facilitator pin and freeze too', () => {
    expect(ids({ canSteer: true })).toEqual(['open', 'rename', 'recolor', 'toAction', 'pin', 'freeze', 'moveTo', 'mergeInto', 'dissolve'])
  })
  it('keeps only what does not change the group on a locked board', () => {
    expect(ids({ locked: true })).toEqual(['open', 'toAction'])
    expect(ids({ locked: true, canSteer: true })).toEqual(['open', 'toAction', 'pin', 'freeze'])
  })
  it('keeps a frozen group readable: no change, dissolve disabled, unfreeze for facilitators', () => {
    const list = groupActions({ ...base, frozen: true, canSteer: true })
    expect(list.map((e) => e.id)).toEqual(['open', 'toAction', 'pin', 'freeze', 'dissolve'])
    expect(list.find((e) => e.id === 'dissolve')?.disabled).toBe(true)
    expect(list.find((e) => e.id === 'freeze')?.label).toBe('note.unfreeze')
  })
  it('hides move and merge when there is nowhere to go', () => {
    expect(ids({ mergeTargets: 0, otherColumns: 0 })).toEqual(['open', 'rename', 'recolor', 'toAction', 'dissolve'])
  })
  it('disables the action entry when the phase does not allow actions', () => {
    expect(groupActions({ ...base, actionAllowed: false }).find((e) => e.id === 'toAction')?.disabled).toBe(true)
  })
  it('marks open and rename as menu only, so the footer and the menu agree on the rest', () => {
    const footer = groupActions({ ...base, canSteer: true }).filter((e) => !e.menuOnly).map((e) => e.id)
    expect(footer).toEqual(['recolor', 'toAction', 'pin', 'freeze', 'moveTo', 'mergeInto', 'dissolve'])
  })
})
