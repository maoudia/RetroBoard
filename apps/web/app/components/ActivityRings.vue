<script setup lang="ts">
import type { Ring, RingProgress } from '@retroboard/application'

/**
 * Activity rings (change activity-rings-timer): outer = whole retro, middle = current phase,
 * inner = next phase. Past a full turn a ring continues in the overtime colour. Colours come
 * from the theme (--ring-*). A ring that closes plays a short pulse, none under reduced motion.
 * Decorative: the text alternative lives in the parent (rings.summary).
 */
const props = withDefaults(defineProps<{ progress: RingProgress; size?: number }>(), { size: 56 })

const STROKE = 5
const radii = [24, 16.5, 9]
const circ = (r: number) => 2 * Math.PI * r
const dash = (r: number, share: number) => `${circ(r) * Math.max(0, Math.min(1, share))} ${circ(r)}`

interface Layer { key: string; r: number; ring: Ring | null; color: string }
const layers = computed<Layer[]>(() => [
  { key: 'outer', r: radii[0]!, ring: props.progress.outer, color: 'var(--ring-1)' },
  { key: 'current', r: radii[1]!, ring: props.progress.current, color: 'var(--ring-2)' },
  { key: 'next', r: radii[2]!, ring: props.progress.next, color: 'var(--ring-3)' },
])

// Celebration: a ring that goes from open to closed.
const closed = reactive<Record<string, boolean>>({})
const pulsing = reactive<Record<string, boolean>>({})
watch(layers, (ls) => {
  for (const l of ls) {
    const now = !!l.ring?.complete
    if (now && closed[l.key] === false) {
      pulsing[l.key] = true
      setTimeout(() => { pulsing[l.key] = false }, 1200)
    }
    closed[l.key] = now
  }
}, { immediate: true })
</script>

<template>
  <svg :viewBox="`0 0 56 56`" :width="size" :height="size" aria-hidden="true" class="rings" data-testid="activity-rings">
    <g v-for="l in layers" :key="l.key" transform="rotate(-90 28 28)" :class="{ pulse: pulsing[l.key] }">
      <circle class="track" cx="28" cy="28" :r="l.r" :stroke-width="STROKE" />
      <circle
        v-if="l.ring && l.ring.fill > 0" class="fill" :data-ring="l.key" cx="28" cy="28" :r="l.r" :stroke-width="STROKE"
        :stroke="l.color" :stroke-dasharray="dash(l.r, l.ring.fill)"
      />
      <circle
        v-if="l.ring && l.ring.over > 0" class="fill over" :data-ring="`${l.key}-over`" cx="28" cy="28" :r="l.r" :stroke-width="STROKE"
        :stroke-dasharray="dash(l.r, l.ring.over)"
      />
    </g>
  </svg>
</template>

<style scoped>
.rings { flex: none; }
circle { fill: none; stroke-linecap: round; }
.track { stroke: var(--ring-track); }
.over { stroke: var(--ring-over); }
.pulse { animation: ring-pulse 1.1s ease-out 1; transform-origin: 28px 28px; transform-box: view-box; }
@keyframes ring-pulse { 0% { opacity: 1; filter: none; } 40% { opacity: 1; filter: drop-shadow(0 0 4px var(--ring-1)); } 100% { opacity: 1; filter: none; } }
@media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
</style>
