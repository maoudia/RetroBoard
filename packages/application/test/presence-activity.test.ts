import type { Peer } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { presenceBetween } from '../src'

const peer = (name: string, key: string, over: Partial<Peer> = {}): Peer => ({ name, me: false, key, conn: `c-${key}`, ...over })
const me = peer('Alice', 'a', { me: true })

describe('presenceBetween', () => {
  it('announces nobody on the baseline', () => {
    expect(presenceBetween(null, [me, peer('Bob', 'b')], 1)).toEqual([])
  })

  it('announces joins and departures with the name', () => {
    const bob = peer('Bob', 'b')
    expect(presenceBetween([me], [me, bob], 5)).toEqual([{ kind: 'participant.joined', at: 5, name: 'Bob' }])
    expect(presenceBetween([me, bob], [me], 6)).toEqual([{ kind: 'participant.left', at: 6, name: 'Bob' }])
  })

  it('a reconnect with a new connection id is not a leave and a join', () => {
    expect(presenceBetween([me, peer('Bob', 'b', { conn: 'old' })], [me, peer('Bob', 'b', { conn: 'new' })], 7)).toEqual([])
  })

  it('never announces me or hidden participants', () => {
    expect(presenceBetween([], [me, peer('Spy', 's', { hidden: true })], 8)).toEqual([])
  })

  it('announces a joiner once the name arrives, not while anonymous, and never as a leave and a join', () => {
    const anon: Peer = { name: null, me: false, conn: 'x1' }
    const named: Peer = { name: 'Dana', me: false, conn: 'x1', key: 'd' }
    expect(presenceBetween([me], [me, anon], 9)).toEqual([])
    expect(presenceBetween([me, anon], [me, named], 10)).toEqual([{ kind: 'participant.joined', at: 10, name: 'Dana' }])
    expect(presenceBetween([me, anon], [me], 11)).toEqual([])
  })

  it('matches the same participant by key or connection id', () => {
    expect(presenceBetween([me, { name: 'Eve', me: false, conn: 'e1' }], [me, { name: 'Eve', me: false, conn: 'e1', key: 'e' }], 12)).toEqual([])
    expect(presenceBetween([me, { name: 'Eve', me: false, conn: 'e1', key: 'e' }], [me, { name: 'Eve', me: false, conn: 'e2', key: 'e' }], 13)).toEqual([])
  })
})
