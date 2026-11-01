/**
 * Time display options (change time-display-options): what a clock says, as the person chose.
 * Pure: the stepper, the global ring and tests share it.
 */
export type TimeMode = 'remaining' | 'elapsed'

export interface TimeLabel {
  /** m:ss of the chosen figure: time left (never below 0:00) or time elapsed. */
  text: string
  /** Past the planned time. */
  overtime: boolean
  /** "+m:ss" once over the planned time, null before. */
  over: string | null
}

const mmss = (ms: number): string => {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function timeLabel(plannedMs: number, elapsedMs: number, mode: TimeMode): TimeLabel {
  const left = plannedMs - elapsedMs
  const overtime = left < 0
  return {
    text: mode === 'elapsed' ? mmss(elapsedMs) : mmss(left),
    overtime,
    over: overtime ? `+${mmss(-left)}` : null,
  }
}
