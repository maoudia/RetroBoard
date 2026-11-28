import { describe, expect, it } from 'vitest'
import { closeIn, openIn, reconcile } from '../app/utils/open-groups'

describe('open groups per column', () => {
  it('keeps one open group per column and leaves the other columns alone', () => {
    let o = openIn({}, 'a', 'g1')
    o = openIn(o, 'b', 'g2')
    expect(o).toEqual({ a: 'g1', b: 'g2' })
    o = openIn(o, 'a', 'g3')
    expect(o).toEqual({ a: 'g3', b: 'g2' })
  })
  it('returns the same object when nothing changes', () => {
    const o = { a: 'g1' }
    expect(openIn(o, 'a', 'g1')).toBe(o)
    expect(closeIn(o, 'b')).toBe(o)
    expect(closeIn(o, 'a')).toEqual({})
  })
  it('closes a group that vanished and only that one', () => {
    const o = { a: 'g1', b: 'g2' }
    expect(reconcile(o, [{ id: 'g2', columnId: 'b' }])).toEqual({ b: 'g2' })
  })
  it('keeps an unchanged state as is', () => {
    const o = { a: 'g1' }
    expect(reconcile(o, [{ id: 'g1', columnId: 'a' }])).toBe(o)
    expect(reconcile({}, [])).toEqual({})
  })
  it('follows a group moved to another column', () => {
    expect(reconcile({ a: 'g1' }, [{ id: 'g1', columnId: 'b' }])).toEqual({ b: 'g1' })
  })
  it('lets the group already open in the target column keep its place', () => {
    expect(reconcile({ a: 'g1', b: 'g2' }, [{ id: 'g1', columnId: 'b' }, { id: 'g2', columnId: 'b' }])).toEqual({ b: 'g2' })
  })
})
