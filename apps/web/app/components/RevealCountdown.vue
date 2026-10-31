<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const drafts = useDraftsStore()
const { publish } = usePublish()

/**
 * "Reveal all": the facilitator starts a countdown for everyone. At the deadline each client publishes
 * its own drafts (they are private to this browser), unless the person chose to keep them private.
 */
const now = ref(Date.now())
const keep = ref(false)
let handled = 0
let announced = 0
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { now.value = Date.now() + board.skew }, 250) })
onBeforeUnmount(() => clearInterval(timer))

const endsAt = computed(() => board.snapshot?.reveal?.endsAt ?? 0)
const left = computed(() => Math.max(0, Math.ceil((endsAt.value - now.value) / 1000)))
const active = computed(() => endsAt.value > 0 && endsAt.value > now.value)

// A new countdown starts with the choice reset; the screen readers hear it once, not every second.
const message = ref('')
watch(endsAt, (e) => {
  if (e > 0 && e > Date.now() + board.skew && e !== announced) { announced = e; keep.value = false; message.value = ''; void nextTick(() => { message.value = t('reveal.announce') }) }
}, { immediate: true })

// At the deadline: publish once per countdown. A countdown found already over long ago (reload) does nothing.
watch([now, endsAt], () => {
  const e = endsAt.value
  if (!e || handled === e || now.value < e) return
  handled = e
  if (now.value - e > 5_000) return
  if (!keep.value && drafts.count > 0) publish()
  keep.value = false
})
</script>

<template>
  <!-- On body: page-level stacking rules (position: relative on page children) must not apply. -->
  <Teleport to="body">
    <p class="sr-only" role="status" data-testid="reveal-status">{{ message }}</p>
    <div v-if="active" class="reveal glass" data-testid="reveal-countdown" :data-left="left">
      <strong class="mono big" aria-hidden="true">{{ left }}</strong>
      <div class="txt">
        <span class="ttl">{{ t('reveal.title', { n: left }) }}</span>
        <label class="check"><input v-model="keep" type="checkbox" data-testid="reveal-keep" /> {{ t('reveal.keep') }}</label>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.reveal { position: fixed; z-index: 45; top: 7.5rem; left: 50%; translate: -50% 0; display: flex; align-items: center; gap: 1rem; padding: .7rem 1.2rem; border-radius: var(--r-card); border: 1px solid var(--accent); box-shadow: var(--shadow-2); background: var(--surface2); }
.big { font-size: var(--fs-3xl); line-height: 1; color: var(--accent); min-width: 2ch; text-align: center; }
.txt { display: grid; gap: .25rem; }
.ttl { font-weight: 700; }
.check { display: flex; gap: .5rem; align-items: center; font-size: var(--fs-sm); }
.check input { width: 18px; height: 18px; accent-color: var(--accent); }
</style>
