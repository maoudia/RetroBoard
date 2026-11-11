/**
 * Screen classes, breakpoints and the fluid type scale (change responsive-and-i18n-hardening).
 * Pure data and pure functions: the web app writes `screenTokens` on <html> next to the theme tokens and sets `data-screen`.
 */
export type ScreenId = 'phone' | 'tablet' | 'laptop' | 'wide' | 'tv'

/** Lower bound of each class in CSS px; phone also covers anything narrower than 360. */
export const BREAKPOINTS: Readonly<Record<ScreenId, number>> = { phone: 360, tablet: 600, laptop: 1024, wide: 1600, tv: 2400 }
export const SCREEN_IDS = Object.keys(BREAKPOINTS) as readonly ScreenId[]

/** Multiplier on the whole fluid scale: a room screen is read from a distance (24 px note text at 3840 px). */
export const TYPE_SCALE: Readonly<Record<ScreenId, number>> = { phone: 1, tablet: 1, laptop: 1, wide: 1.125, tv: 1.5 }

export function screenOf(width: number): ScreenId {
  return [...SCREEN_IDS].reverse().find((id) => width >= BREAKPOINTS[id]) ?? 'phone'
}

/** Size in rem at the phone floor (360 px) and at the wide ceiling (1600 px); the scale grows linearly in between. */
const FLUID_STEPS: Readonly<Record<string, readonly [min: number, max: number]>> = {
  xs: [0.75, 0.8125], sm: [0.875, 0.9375], md: [1, 1.0625], lg: [1.125, 1.25], xl: [1.25, 1.5], '2xl': [1.5, 1.875], '3xl': [1.75, 2.5],
}

const round = (n: number) => String(Math.round(n * 10000) / 10000)

/** `clamp(min, intercept + slope vw, max)` so the size is `min` at `from` px and `max` at `to` px. */
function fluid(minRem: number, maxRem: number, from: number, to: number): string {
  const slope = ((maxRem - minRem) * 16 / (to - from)) * 100
  const intercept = minRem - (slope / 100 * from) / 16
  return `clamp(${round(minRem)}rem, ${round(intercept)}rem + ${round(slope)}vw, ${round(maxRem)}rem)`
}

/** The CSS custom properties of one screen class: breakpoints (for scripts and docs), the type scale multiplier and the fluid sizes. */
export function screenTokens(screen: ScreenId): Record<string, string> {
  const vars: Record<string, string> = { '--screen': screen, '--type-scale': String(TYPE_SCALE[screen]) }
  for (const id of SCREEN_IDS) vars[`--bp-${id}`] = `${BREAKPOINTS[id]}px`
  for (const [step, [min, max]] of Object.entries(FLUID_STEPS)) {
    vars[`--fluid-${step}`] = `calc(${fluid(min, max, BREAKPOINTS.phone, BREAKPOINTS.wide)} * var(--type-scale))`
  }
  return vars
}
