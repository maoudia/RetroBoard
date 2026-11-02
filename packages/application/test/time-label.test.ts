import { describe, expect, it } from 'vitest'
import { timeLabel } from '../src'

const MIN = 60_000
describe('timeLabel', () => {
  it('shows the time left, or the time elapsed', () => {
    expect(timeLabel(5 * MIN, 90_000, 'remaining')).toEqual({ text: '3:30', overtime: false, over: null })
    expect(timeLabel(5 * MIN, 90_000, 'elapsed')).toEqual({ text: '1:30', overtime: false, over: null })
  })
  it('boundaries: start, exactly planned, one second over', () => {
    expect(timeLabel(5 * MIN, 0, 'remaining').text).toBe('5:00')
    expect(timeLabel(5 * MIN, 0, 'elapsed').text).toBe('0:00')
    expect(timeLabel(5 * MIN, 5 * MIN, 'remaining')).toEqual({ text: '0:00', overtime: false, over: null })
    expect(timeLabel(5 * MIN, 5 * MIN + 1000, 'remaining')).toEqual({ text: '0:00', overtime: true, over: '+0:01' })
  })
  it('in overtime the time left stays at 0:00 and the excess is spelled out; elapsed keeps counting', () => {
    expect(timeLabel(5 * MIN, 6 * MIN + 5000, 'remaining')).toEqual({ text: '0:00', overtime: true, over: '+1:05' })
    expect(timeLabel(5 * MIN, 6 * MIN + 5000, 'elapsed')).toEqual({ text: '6:05', overtime: true, over: '+1:05' })
  })
  it('long durations read like a person says them (change ux-irritants-wave-2)', () => {
    expect(timeLabel(5 * MIN, 59 * MIN + 59_000, 'elapsed').text).toBe('59:59')
    expect(timeLabel(5 * MIN, 65 * MIN, 'elapsed').text).toBe('1h05')
    expect(timeLabel(4 * MIN, 10_953 * MIN, 'remaining').over).toBe('+7d')
    expect(timeLabel(4 * MIN, 23 * 60 * MIN + 59 * MIN, 'elapsed').text).toBe('23h59')
  })
})
