import type { CelebrationId } from '@retroboard/themes'

/** Small canvas and CSS effects. Skipped entirely when the person prefers reduced motion. */
/** True when the OS asks for less motion, or the person chose "reduced" in their profile. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced')

type ParticleKind = 'confetti' | 'snow' | 'petal'
interface Particles { count?: number; decay?: number; kind?: ParticleKind }

/** One burst of canvas particles from a point; the canvas clears itself. */
function particles(x: number, y: number, colors: readonly string[], { count = 46, decay = 0.012, kind = 'confetti' }: Particles = {}): void {
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.celebration = kind
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '100' })
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }
  ctx.scale(dpr, dpr)
  const gravity = kind === 'confetti' ? 0.28 : kind === 'snow' ? 0.03 : 0.05
  const parts = Array.from({ length: count }, (_, i) => {
    const a = Math.random() * Math.PI * 2
    const v = kind === 'confetti' ? 3 + Math.random() * 7 : kind === 'snow' ? 0.8 + Math.random() * 2.4 : 0.4 + Math.random() * 1.2
    return {
      x: kind === 'petal' ? x + (Math.random() - 0.5) * 120 : x, y: kind === 'petal' ? y - 20 - Math.random() * 30 : y,
      vx: Math.cos(a) * v, vy: kind === 'confetti' ? Math.sin(a) * v - 5 : kind === 'snow' ? Math.sin(a) * v - 0.6 : Math.abs(Math.sin(a)) * v,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * (kind === 'confetti' ? 0.4 : 0.12), sway: Math.random() * Math.PI * 2 + i,
      w: kind === 'confetti' ? 5 + Math.random() * 6 : kind === 'snow' ? 2 + Math.random() * 3 : 6 + Math.random() * 4,
      h: kind === 'confetti' ? 3 + Math.random() * 4 : kind === 'snow' ? 2 + Math.random() * 3 : 3 + Math.random() * 2,
      c: colors[Math.floor(Math.random() * colors.length)]!, life: 1,
    }
  })
  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    let alive = false
    for (const p of parts) {
      p.vy += gravity; p.vx *= kind === 'confetti' ? 0.99 : 0.985
      if (kind === 'petal') { p.sway += 0.08; p.vx += Math.sin(p.sway) * 0.05 }
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= decay
      if (p.life <= 0) continue
      alive = true
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.r)
      ctx.fillStyle = p.c
      if (kind === 'confetti') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      else { ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
    if (alive) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}

export function confetti(x: number, y: number, colors: readonly string[], count = 46): void {
  if (prefersReducedMotion()) return
  particles(x, y, colors, { count })
}

/** A celebration lasts at most this long (change done-celebration: 1.5 s at most), the static check mark under reduced motion this long. */
export const CELEBRATION_MS = 1200
export const STATIC_MS = 600
/** One at a time per device: this many play one after the other, the rest collapse into one combined burst. */
export const QUEUE_MAX = 3

/**
 * Plays jobs one after the other, at most `max` of them, then one combined job for everything pushed beyond.
 * `run` starts a job and calls `done` when it has finished (the next one starts then). Pure scheduling: no DOM.
 */
export function createCelebrationQueue<J>(opts: { run: (job: J, done: () => void) => void; combine: (jobs: J[]) => J; max?: number }) {
  const max = opts.max ?? QUEUE_MAX
  const waiting: J[] = []
  const extra: J[] = []
  let running = false
  const next = () => {
    const job = waiting.shift() ?? (extra.length ? opts.combine(extra.splice(0)) : undefined)
    if (job === undefined) { running = false; return }
    let finished = false
    opts.run(job, () => { if (!finished) { finished = true; next() } })
  }
  return {
    push(job: J) {
      if (!running) { running = true; waiting.push(job); next(); return }
      if (waiting.length + 1 < max) waiting.push(job)
      else extra.push(job)
    },
    pending: () => waiting.length + extra.length + (running ? 1 : 0),
  }
}

interface Look { colors: readonly string[]; label: string }
const NS = 'http://www.w3.org/2000/svg'

function svgShape(cls: string, paths: readonly string[], viewBox = '0 0 48 48'): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('class', cls)
  for (const d of paths) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '100'); svg.appendChild(p) }
  return svg
}
const span = (cls: string, text = ''): HTMLSpanElement => { const e = document.createElement('span'); e.className = cls; e.textContent = text; return e }
const CHECK = 'M10 25 L20 35 L38 14'

/** Overlay of one celebration: absolutely placed on the host, never focusable, gone when the animation ends. */
function overlay(host: HTMLElement, id: string, look: Look, ms: number, ...parts: Element[]): void {
  // A host that is not positioned gets `position: relative` through the CSSOM while the overlay lives (a class would be overwritten when Vue patches the host's class binding).
  const placed = getComputedStyle(host).position === 'static'
  if (placed) host.style.position = 'relative'
  const o = span(`cele cele-${id}`)
  o.setAttribute('aria-hidden', 'true')
  o.dataset.celebration = id
  look.colors.slice(0, 3).forEach((c, i) => o.style.setProperty(`--cele-${i + 1}`, c))
  for (const p of parts) o.appendChild(p)
  host.appendChild(o)
  setTimeout(() => { o.remove(); if (placed) host.style.position = '' }, ms)
}

const centre = (host: HTMLElement) => { const r = host.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
const burst = (kind: ParticleKind, count: number) => (host: HTMLElement, look: Look) => {
  const { x, y } = centre(host)
  particles(x, y, look.colors, { count, kind, decay: 0.014 })
}
const drawn = (id: string, paths: readonly string[]) => (host: HTMLElement, look: Look) => overlay(host, id, look, CELEBRATION_MS, svgShape('cele-svg', paths))

/** One signature per theme (the ids are the ones of `packages/themes`): class-based keyframes in `celebration.css`, or a bounded particle canvas. */
const EFFECTS: Record<CelebrationId, (host: HTMLElement, look: Look) => void> = {
  color: burst('confetti', 36),
  sticky: (h, l) => overlay(h, 'sticky', l, CELEBRATION_MS, span('cele-disc', '\u2713')),
  paper: (h, l) => overlay(h, 'paper', l, CELEBRATION_MS, span('cele-ink', l.label)),
  corporate: drawn('corporate', [CHECK]),
  minimal: (h, l) => overlay(h, 'minimal', l, CELEBRATION_MS, span('cele-line')),
  slate: drawn('slate', ['M9 27 L19 37 L39 11', 'M12 42 L36 41']),
  cyber: (h, l) => overlay(h, 'cyber', l, CELEBRATION_MS, span('cele-scan'), span('cele-neon', '\u2713')),
  halloween: drawn('halloween', ['M12 40 L12 21 C12 11 36 11 36 21 L36 40 L31 35 L26 40 L22 35 L17 40 Z', 'M19 22 L19 24', 'M29 22 L29 24']),
  noel: burst('snow', 40),
  sakura: burst('petal', 22),
  studio: (h, l) => overlay(h, 'studio', l, CELEBRATION_MS, span('cele-beam'), span('cele-neon', '\u2713')),
}

/** A static check mark for 600 ms: what a celebration becomes under reduced motion. */
function staticCheck(host: HTMLElement, look: Look): void {
  overlay(host, 'static', look, STATIC_MS, span('cele-neon', '\u2713'))
}

/** Particle effects: one canvas for the whole screen, so they play once however many hosts there are. */
const CANVAS: ReadonlySet<CelebrationId> = new Set(['color', 'noel', 'sakura'])

/** Plays the celebration `id` on each host (the idea on the board, its action in the drawer). Reduced motion shows the static check mark instead. Never takes focus, never blocks input. */
export function playCelebration(hosts: readonly HTMLElement[], id: CelebrationId, look: Look): void {
  if (prefersReducedMotion()) { for (const h of hosts) staticCheck(h, look); return }
  const effect = EFFECTS[id] ?? EFFECTS.color
  for (const h of CANVAS.has(id) ? hosts.slice(0, 1) : hosts) effect(h, look)
}

/** The combined burst for the celebrations that did not fit in the queue: one confetti from the middle of the screen. */
export function playCombined(colors: readonly string[]): void {
  if (prefersReducedMotion()) return
  particles(window.innerWidth / 2, window.innerHeight / 3, colors, { count: 80, decay: 0.014 })
}
