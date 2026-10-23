<script setup lang="ts">
import { prefersReducedMotion } from '~/utils/fx'
import type { AmbientKind } from '~/themes/types'

/** Background atmosphere drawn on a canvas: bats, snow, code rain, petals. Off for reduced motion. */
const theme = useThemeStore()
const settings = useSettingsStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let last = 0
let stop: (() => void) | undefined

interface P { x: number; y: number; vx: number; vy: number; s: number; r: number; vr: number; ch: string }
const SPRITES: Record<Exclude<AmbientKind, 'none'>, string[]> = {
  bats: ['\u{1F987}', '\u{1F47B}', '\u{1F577}\u{FE0F}'],
  snow: ['\u{2744}\u{FE0F}', '\u{2745}', '\u{2746}'],
  matrix: ['0', '1', '\u{30A2}', '\u{30B7}', '{', '}', '<', '>'],
  petals: ['\u{1F338}', '\u{1F33A}'],
}
const COUNT: Record<Exclude<AmbientKind, 'none'>, number> = { bats: 14, snow: 46, matrix: 36, petals: 26 }

function start(kind: AmbientKind) {
  stop?.()
  const c = canvas.value
  if (!c || kind === 'none' || prefersReducedMotion()) { c?.getContext('2d')?.clearRect(0, 0, c.width, c.height); return }
  const ctx = c.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
  size()
  const mk = (initial: boolean): P => {
    const s = (kind === 'bats' ? 20 : kind === 'matrix' ? 14 : 12) + Math.random() * (kind === 'bats' ? 14 : 12)
    return {
      x: Math.random() * innerWidth, y: initial ? Math.random() * innerHeight : -30,
      vx: kind === 'bats' ? 0.5 + Math.random() * 1.2 : (Math.random() - 0.5) * 0.6,
      vy: kind === 'bats' ? (Math.random() - 0.5) * 0.4 : 0.35 + Math.random() * (kind === 'matrix' ? 1.6 : 0.9),
      s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.02, ch: SPRITES[kind][Math.floor(Math.random() * SPRITES[kind].length)]!,
    }
  }
  const ps = Array.from({ length: COUNT[kind] }, () => mk(true))
  const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#fff'
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    if (document.hidden || t - last < 33) return
    last = t
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of ps) {
      p.x += p.vx + (kind === 'snow' || kind === 'petals' ? Math.sin(t / 900 + p.r) * 0.4 : 0)
      p.y += p.vy + (kind === 'bats' ? Math.sin(t / 500 + p.r) * 0.8 : 0)
      p.r += p.vr
      if (p.y > innerHeight + 30 || p.x > innerWidth + 40 || p.x < -40 || p.y < -60) Object.assign(p, mk(false), kind === 'bats' ? { x: -30, y: Math.random() * innerHeight * 0.6 } : {})
      ctx.save()
      ctx.translate(p.x, p.y)
      if (kind !== 'matrix') ctx.rotate(Math.sin(p.r) * 0.5)
      ctx.globalAlpha = kind === 'matrix' ? 0.28 : kind === 'bats' ? 0.5 : 0.5
      ctx.font = `${p.s}px ${kind === 'matrix' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`
      if (kind === 'matrix') ctx.fillStyle = color
      ctx.fillText(p.ch, 0, 0)
      ctx.restore()
    }
  }
  raf = requestAnimationFrame(frame)
  window.addEventListener('resize', size)
  stop = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
}

onMounted(() => watch([() => theme.themeId, () => settings.s.ambient, () => settings.s.motion], () => start(settings.s.ambient ? theme.theme.motion.ambient : 'none'), { immediate: true }))
onBeforeUnmount(() => stop?.())
</script>

<template>
  <canvas ref="canvas" class="ambient" aria-hidden="true" />
</template>

<style scoped>
.ambient { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
</style>
