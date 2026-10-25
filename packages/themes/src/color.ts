/** WCAG 2.x relative luminance and contrast ratio, for hex colours (#rgb or #rrggbb). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

/** sRGB mix: `t` of `a`, the rest of `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  return `#${toHex(ar * t + br * (1 - t))}${toHex(ag * t + bg * (1 - t))}${toHex(ab * t + bb * (1 - t))}`
}

/** Minimum contrast of a control boundary against its surroundings (WCAG 2.2 SC 1.4.11). */
export const CONTROL_CONTRAST = 3.05

/**
 * Border for fields and other controls whose boundary identifies them: the text colour faded
 * toward the surface just enough to reach 3:1 on every background the theme uses.
 */
export function controlColor(k: { text: string; bg: string; bg2: string; surface: string; surface2: string }): string {
  const grounds = [k.bg, k.bg2, k.surface, k.surface2]
  for (let t = 0.3; t <= 1.0001; t += 0.02) {
    const c = mix(k.text, k.surface, t)
    if (grounds.every((g) => contrast(c, g) >= CONTROL_CONTRAST)) return c
  }
  return k.text
}

export interface RingColors {
  /** Outer ring (whole retro), current phase, next phase, overtime, empty track. */
  ring1: string
  ring2: string
  ring3: string
  over: string
  track: string
}

/**
 * Activity ring colours of a variant (change activity-rings-timer): the theme's own accent,
 * secondary accent and success colours, so every theme has rings in its palette. The colour
 * tests keep each of them at 3:1 or more against every background of the theme.
 */
export function ringColors(k: { accent: string; accent2: string; muted: string; danger: string; border: string }): RingColors {
  return { ring1: k.accent, ring2: k.accent2, ring3: k.muted, over: k.danger, track: k.border }
}
