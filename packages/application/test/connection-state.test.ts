import { describe, expect, it } from 'vitest'
import { connectionState, type ConnectionInput } from '../src'

const base: ConnectionInput = { me: false, conn: 'c1', direct: [], status: 'open', p2p: true }

describe('connectionState', () => {
  it('another participant is direct when a WebRTC link is open, relay otherwise', () => {
    expect(connectionState({ ...base, direct: ['c1'] })).toBe('direct')
    expect(connectionState({ ...base, direct: ['c2'] })).toBe('relay')
    expect(connectionState({ ...base, conn: undefined, direct: ['c1'] })).toBe('relay')
  })

  it('me follows the transport peer-to-peer flag', () => {
    expect(connectionState({ ...base, me: true, p2p: true })).toBe('direct')
    expect(connectionState({ ...base, me: true, p2p: false })).toBe('relay')
  })

  it('everybody reads reconnecting while my own link to the relay is down', () => {
    for (const status of ['reconnecting', 'connecting'] as const) {
      expect(connectionState({ ...base, status, direct: ['c1'] })).toBe('reconnecting')
      expect(connectionState({ ...base, me: true, status })).toBe('reconnecting')
    }
    expect(connectionState({ ...base, status: 'waiting', direct: ['c1'] })).toBe('direct')
  })
})
