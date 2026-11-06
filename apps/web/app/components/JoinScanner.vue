<script setup lang="ts">
import { hashFromScan } from '~/utils/invite'

/** The part of the Barcode Detection API used here (not in the TypeScript DOM lib). */
interface Detector { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> }
interface DetectorClass { new (opts: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> }
const detectorClass = () => (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector

const emit = defineEmits<{ found: [hash: string] }>()
const { t } = useT()
const supported = ref(false)
const open = ref(false)
const state = ref<'starting' | 'scanning' | 'denied' | 'nocamera' | 'failed'>('starting')
const notBoard = ref(false)
const video = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null
let timer: ReturnType<typeof setInterval> | undefined

// Camera scanning needs the browser's own QR reader: Chromium and Safari have it, other browsers keep the paste field.
onMounted(async () => {
  const Reader = detectorClass()
  if (!Reader || !navigator.mediaDevices?.getUserMedia) return
  supported.value = (await Reader.getSupportedFormats().catch(() => [] as string[])).includes('qr_code')
})

function stop() {
  clearInterval(timer)
  timer = undefined
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

async function start() {
  state.value = 'starting'
  notBoard.value = false
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  } catch (e) {
    const name = (e as DOMException).name
    state.value = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'failed'
    return
  }
  await nextTick()
  const el = video.value
  const Reader = detectorClass()
  if (!el || !Reader || !open.value) { stop(); return }
  el.srcObject = stream
  await el.play().catch(() => {})
  const reader = new Reader({ formats: ['qr_code'] })
  state.value = 'scanning'
  let busy = false
  timer = setInterval(async () => {
    if (busy || el.readyState < 2) return
    busy = true
    try {
      for (const code of await reader.detect(el)) {
        const hash = hashFromScan(code.rawValue)
        if (hash) { open.value = false; emit('found', hash); return }
        notBoard.value = true
      }
    } catch { /* a frame that cannot be read is skipped */ } finally { busy = false }
  }, 250)
}

watch(open, (v) => { if (v) void start(); else stop() })
onBeforeUnmount(stop)
</script>

<template>
  <button v-if="supported" type="button" class="ghost" data-testid="join-scan" @click="open = true"><Icon name="lucide:scan-line" /> {{ t('landing.join.scan') }}</button>
  <BaseDialog v-model:open="open" :title="t('landing.join.scan.title')" width="440px">
    <p class="muted">{{ t('landing.join.scan.hint') }}</p>
    <video v-show="state === 'scanning' || state === 'starting'" ref="video" class="preview" muted playsinline :aria-label="t('landing.join.scan.preview')" data-testid="scan-video" />
    <p class="muted" role="status" data-testid="scan-state" :data-state="state">
      <template v-if="state === 'starting'">{{ t('landing.join.scan.starting') }}</template>
      <template v-else-if="state === 'scanning' && notBoard">{{ t('landing.join.scan.notBoard') }}</template>
      <template v-else-if="state === 'scanning'">{{ t('landing.join.scan.scanning') }}</template>
      <template v-else>{{ t(`landing.join.scan.${state}` as never) }}</template>
    </p>
  </BaseDialog>
</template>

<style scoped>
.preview { width: 100%; max-height: 50dvh; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r-card); background: #000; }
</style>
