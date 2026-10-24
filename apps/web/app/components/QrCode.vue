<script setup lang="ts">
/**
 * QR code generated in the browser (uqr, MIT): the link never leaves the device.
 * The encoder is loaded on first display to keep it out of the main bundle.
 */
const props = defineProps<{ value: string; label: string; size?: number }>()
const path = ref('')
const modules = ref(0)

watch(() => props.value, async (value) => {
  if (!value) { path.value = ''; return }
  const { encode } = await import('uqr')
  const qr = encode(value, { ecc: 'M', border: 4 })
  let d = ''
  qr.data.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x} ${y}h1v1h-1z` }))
  modules.value = qr.size
  path.value = d
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
.qr { display: block; max-width: 100%; height: auto; border-radius: 8px; }
.bg { fill: #fff; }
.fg { fill: #000; }
</style>
