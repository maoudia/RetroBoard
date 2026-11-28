/**
 * Where the floating chat button rests (change chat-floating-dock). Pure: no DOM, no storage; the component measures
 * and applies. A place is an edge and a fraction along it (snap) or two fractions of the usable area (free), never
 * pixels, so it survives a rotation, a resized window and another screen of the same device.
 */

export type Edge = 'left' | 'right' | 'top' | 'bottom'
export type Place =
  | { mode: 'snap'; edge: Edge; at: number }
  | { mode: 'free'; x: number; y: number }
export type DockMode = 'snap' | 'free'
export type Dir = 'left' | 'right' | 'up' | 'down'

export interface Size { w: number; h: number }
export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

/** The button is 48 px (target size, WCAG 2.5.8) and keeps 8 px from the edge of the safe area. */
export const BUTTON = 48
export const MARGIN = 8
/** A drop within this distance of two edges snaps to the corner: one button plus a margin. */
export const CORNER_ZONE = 56
/** One arrow press in free mode. */
export const STEP = 24
/** Air kept around an avoided element. */
const GAP = 4

export const DEFAULT_PLACE: Place = { mode: 'snap', edge: 'right', at: 0.8 }
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/** The eight places of the profile picker: four corners, four edge middles (a corner is `at` 0 or 1 on an edge). */
export const PLACES = [
  { key: 'top-left', edge: 'top', at: 0 }, { key: 'top', edge: 'top', at: 0.5 }, { key: 'top-right', edge: 'top', at: 1 },
  { key: 'left', edge: 'left', at: 0.5 }, { key: 'right', edge: 'right', at: 0.5 },
  { key: 'bottom-left', edge: 'bottom', at: 0 }, { key: 'bottom', edge: 'bottom', at: 0.5 }, { key: 'bottom-right', edge: 'bottom', at: 1 },
] as const satisfies readonly { key: string; edge: Edge; at: number }[]
export type PlaceKey = (typeof PLACES)[number]['key']

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))
const clamp01 = (v: number) => clamp(v, 0, 1)

/** Where the top-left corner of the button may be: the window less the safe-area insets, a margin and the keyboard. */
export function span(size: Size, insets: Insets, keyboard = 0) {
  return {
    minX: insets.left + MARGIN,
    maxX: size.w - insets.right - MARGIN - BUTTON,
    minY: insets.top + MARGIN,
    maxY: size.h - Math.max(insets.bottom, keyboard) - MARGIN - BUTTON,
  }
}

/** Fractions of the usable area (0..1, 0.5 when the area has no room) from a pixel value. */
const frac = (v: number, lo: number, hi: number) => (hi > lo ? clamp01((v - lo) / (hi - lo)) : 0.5)

/** A stored value that may be anything: a valid place, or the fallback. */
export function validPlace(raw: unknown, fallback: Place = DEFAULT_PLACE): Place {
  if (!raw || typeof raw !== 'object') return fallback
  const p = raw as Record<string, unknown>
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  if (p.mode === 'snap' && (p.edge === 'left' || p.edge === 'right' || p.edge === 'top' || p.edge === 'bottom') && num(p.at)) return { mode: 'snap', edge: p.edge, at: clamp01(p.at) }
  if (p.mode === 'free' && num(p.x) && num(p.y)) return { mode: 'free', x: clamp01(p.x), y: clamp01(p.y) }
  return fallback
}
export const validMode = (raw: unknown): DockMode => (raw === 'free' ? 'free' : 'snap')

/**
 * The place for a drop. `point` is the centre of the button. In snap mode the nearest edge wins (ties go to the
 * left and right edges, where a thumb reaches on a phone) and a drop within CORNER_ZONE of two edges takes the corner;
 * in free mode the position is kept as fractions of the usable area.
 */
export function dock(point: Point, size: Size, insets: Insets, mode: DockMode = 'snap', keyboard = 0): Place {
  const s = span(size, insets, keyboard)
  const x = point.x - BUTTON / 2
  const y = point.y - BUTTON / 2
  if (mode === 'free') return { mode: 'free', x: frac(x, s.minX, s.maxX), y: frac(y, s.minY, s.maxY) }
  const dl = point.x - insets.left
  const dr = size.w - insets.right - point.x
  const dt = point.y - insets.top
  const db = size.h - insets.bottom - point.y
  const nearX = Math.min(dl, dr)
  const nearY = Math.min(dt, db)
  const fx = frac(x, s.minX, s.maxX)
  const fy = frac(y, s.minY, s.maxY)
  if (nearX <= CORNER_ZONE && nearY <= CORNER_ZONE) {
    return nearX <= nearY ? { mode: 'snap', edge: dl <= dr ? 'left' : 'right', at: dt <= db ? 0 : 1 } : { mode: 'snap', edge: dt <= db ? 'top' : 'bottom', at: dl <= dr ? 0 : 1 }
  }
  if (nearX <= nearY) return { mode: 'snap', edge: dl <= dr ? 'left' : 'right', at: fy }
  return { mode: 'snap', edge: dt <= db ? 'top' : 'bottom', at: fx }
}

/** The pixel position of a place, before any avoidance. */
export function position(place: Place, size: Size, insets: Insets, keyboard = 0): Point {
  const s = span(size, insets, keyboard)
  const along = (a: number, lo: number, hi: number) => lo + clamp01(a) * Math.max(0, hi - lo)
  if (place.mode === 'free') return { x: along(place.x, s.minX, s.maxX), y: along(place.y, s.minY, s.maxY) }
  const { edge, at } = place
  if (edge === 'left') return { x: s.minX, y: along(at, s.minY, s.maxY) }
  if (edge === 'right') return { x: Math.max(s.minX, s.maxX), y: along(at, s.minY, s.maxY) }
  if (edge === 'top') return { x: along(at, s.minX, s.maxX), y: s.minY }
  return { x: along(at, s.minX, s.maxX), y: Math.max(s.minY, s.maxY) }
}

const overlaps = (p: Point, b: Box) => p.x < b.x + b.w + GAP && p.x + BUTTON > b.x - GAP && p.y < b.y + b.h + GAP && p.y + BUTTON > b.y - GAP
const hits = (p: Point, avoid: readonly Box[]) => avoid.some((b) => overlaps(p, b))

/** The nearest position to `p` on the line of its edge that touches no avoided box, or null when the line is full. */
function slide(p: Point, axis: 'x' | 'y', lo: number, hi: number, avoid: readonly Box[]): Point | null {
  if (!hits(p, avoid)) return p
  const cur = p[axis]
  const at = (v: number): Point => (axis === 'x' ? { x: v, y: p.y } : { x: p.x, y: v })
  const candidates = [lo, hi]
  for (const b of avoid) {
    const start = axis === 'x' ? b.x : b.y
    const len = axis === 'x' ? b.w : b.h
    candidates.push(start - GAP - BUTTON, start + len + GAP)
  }
  const free = candidates.filter((v) => v >= lo && v <= hi && !hits(at(v), avoid)).sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur))
  return free.length ? at(free[0]!) : null
}

const OPPOSITE: Record<Edge, Edge> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }

/**
 * Where the button actually rests: its place, moved along its edge to the nearest free slot when something that must
 * stay reachable is in the way, to the opposite edge when its own edge is full, above the keyboard while it is open.
 * Never changes the stored place: the shift is transient.
 */
export function rest(place: Place, size: Size, insets: Insets, avoid: readonly Box[] = [], keyboard = 0): Point {
  const s = span(size, insets, keyboard)
  const p = position(place, size, insets, keyboard)
  const axis = place.mode === 'snap' && (place.edge === 'top' || place.edge === 'bottom') ? 'x' : 'y'
  const lo = axis === 'x' ? s.minX : s.minY
  const hi = axis === 'x' ? s.maxX : s.maxY
  const here = slide(p, axis, lo, hi, avoid)
  if (here) return here
  if (place.mode === 'snap') {
    const there = slide(position({ ...place, edge: OPPOSITE[place.edge] }, size, insets, keyboard), axis, lo, hi, avoid)
    if (there) return there
  }
  return p
}

/** The old pixel key (`retroboard:chat-bubble`, top-left corner of the bubble) as a place, once. */
export function fromPixels(old: unknown, size: Size, insets: Insets, mode: DockMode = 'snap'): Place | null {
  if (!old || typeof old !== 'object') return null
  const { x, y } = old as Record<string, unknown>
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null
  return dock({ x: x + BUTTON / 2, y: y + BUTTON / 2 }, size, insets, mode)
}

/** The side the drawer opens on: the edge of the button when it rests on the left or right, else the chosen side. */
export function drawerSide(mode: DockMode, place: Place, chosen: 'left' | 'right'): 'left' | 'right' {
  return mode === 'snap' && place.mode === 'snap' && (place.edge === 'left' || place.edge === 'right') ? place.edge : chosen
}

/** The same place on the other side of the screen (the drawer's flip button follows the button). */
export function mirror(place: Place): Place {
  if (place.mode === 'free') return { mode: 'free', x: 1 - place.x, y: place.y }
  if (place.edge === 'left' || place.edge === 'right') return { ...place, edge: OPPOSITE[place.edge] }
  return { ...place, at: 1 - place.at }
}

/** Which side of the screen the badge goes on: the inner side, towards the centre, so it is never clipped. */
export function badgeSide(place: Place): { h: 'left' | 'right'; v: 'top' | 'bottom' } {
  if (place.mode === 'free') return { h: place.x > 0.5 ? 'left' : 'right', v: place.y > 0.5 ? 'top' : 'bottom' }
  const { edge, at } = place
  if (edge === 'left') return { h: 'right', v: at > 0.5 ? 'top' : 'bottom' }
  if (edge === 'right') return { h: 'left', v: at > 0.5 ? 'top' : 'bottom' }
  return { h: at > 0.5 ? 'left' : 'right', v: edge === 'top' ? 'bottom' : 'top' }
}

/** The key of the picker place that is the nearest to a place, or null when none is close (a free or odd place). */
export function placeKey(place: Place): PlaceKey | null {
  if (place.mode !== 'snap') return null
  let best: PlaceKey | null = null
  let bestD = 0.13
  for (const p of PLACES) {
    if (p.edge !== place.edge) continue
    const d = Math.abs(p.at - place.at)
    if (d < bestD) { best = p.key; bestD = d }
  }
  return best
}
export const placeOf = (key: PlaceKey): Place => {
  const p = PLACES.find((q) => q.key === key)!
  return { mode: 'snap', edge: p.edge, at: p.at }
}

/** The place as fractions of the window (0 left/top .. 1 right/bottom), to find its cell in the 3x3 grid of eight places. */
function cell(place: Place): { cx: number; cy: number } {
  const [fx, fy] = place.mode === 'free' ? [place.x, place.y] : place.edge === 'left' ? [0, place.at] : place.edge === 'right' ? [1, place.at] : place.edge === 'top' ? [place.at, 0] : [place.at, 1]
  return { cx: Math.round(fx * 2), cy: Math.round(fy * 2) }
}

/** Move mode, snap: the next of the eight places in a direction (the centre cell is skipped, the border stops). */
export function nextPlace(place: Place, dir: Dir): Place {
  let { cx, cy } = cell(place)
  const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
  const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0
  cx += dx
  cy += dy
  if (cx === 1 && cy === 1) { cx += dx; cy += dy }
  if (cx < 0 || cx > 2 || cy < 0 || cy > 2) return place
  const edge: Edge = cy === 0 ? 'top' : cy === 2 ? 'bottom' : cx === 0 ? 'left' : 'right'
  const at = edge === 'left' || edge === 'right' ? cy / 2 : cx / 2
  return { mode: 'snap', edge, at }
}

/** Move mode, free: one 24 px step in a direction, kept inside the usable area. */
export function stepFree(place: Place, dir: Dir, size: Size, insets: Insets, keyboard = 0): Place {
  const s = span(size, insets, keyboard)
  const p = position(place, size, insets, keyboard)
  const x = dir === 'left' ? p.x - STEP : dir === 'right' ? p.x + STEP : p.x
  const y = dir === 'up' ? p.y - STEP : dir === 'down' ? p.y + STEP : p.y
  return { mode: 'free', x: frac(x, s.minX, s.maxX), y: frac(y, s.minY, s.maxY) }
}

/** Switching mode keeps the button where it is: the place of the current resting position in the other model. */
export function convert(place: Place, to: DockMode, size: Size, insets: Insets, keyboard = 0): Place {
  if (place.mode === to) return place
  const p = position(place, size, insets, keyboard)
  return dock({ x: p.x + BUTTON / 2, y: p.y + BUTTON / 2 }, size, insets, to, keyboard)
}

/** The keyboard hides the bottom of the window while the visual viewport is under 75% of it. */
export function keyboardHeight(windowH: number, viewportH: number, offsetTop = 0): number {
  return viewportH > 0 && viewportH < windowH * 0.75 ? Math.max(0, Math.round(windowH - viewportH - offsetTop)) : 0
}
