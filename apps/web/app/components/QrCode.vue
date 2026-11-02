<script setup lang="ts">
/**
 * QR code generated in the browser (uqr, MIT): the link never leaves the device.
 * The encoder is loaded on first display to keep it out of the main bundle.
 */
const props = defineProps<{ value: string; label: string; size?: number }>()
const path = ref('')
const modules = ref(0)
// One shared load and one encoded result per link: the QR is instant once the encoder is warm (change ux-irritants-wave-2).
const cache = new Map<string, { d: string; size: number }>()

watch(() => props.value, async (value) => {
  if (!value) { path.value = ''; return }
  let hit = cache.get(value)
  if (!hit) {
    const { encode } = await import('uqr')
    const qr = encode(value, { ecc: 'M', border: 4 })
    let d = ''
    // One rectangle per run of dark modules instead of one per module: a shorter path to build and to paint.
    qr.data.forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        if (!row[x]) { x++; continue }
        let end = x
        while (end < row.length && row[end]) end++
        d += `M${x} ${y}h${end - x}v1h-${end - x}z`
        x = end
      }
    })
    hit = { d, size: qr.size }
    cache.set(value, hit)
  }
  modules.value = hit.size
  path.value = hit.d
}, { immediate: true })
</script>

<template>
  <svg
    v-if="path" class="qr" role="img" :aria-label="label" :viewBox="`0 0 ${modules} ${modules}`"
    :width="size ?? 220" :height="size ?? 220" shape-rendering="crispEdges" data-testid="qr"
  >
    <rect class="bg" :width="modules" :height="modules" />
    <path class="fg" :d="path" />
  </svg>
</template>

<style scoped>
/* Always dark on light, whatever the theme: phone cameras need the contrast. */
.qr { display: block; max-width: 100%; height: auto; border-radius: var(--r-sm); }
.bg { fill: #fff; }
.fg { fill: #000; }
</style>
