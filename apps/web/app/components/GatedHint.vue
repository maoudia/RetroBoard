<script setup lang="ts">
import type { Availability } from '@retroboard/application'
const { t } = useT()
/** `what`: i18n prefix of the gated action (gated.write, gated.vote, ...): `.closed`, `.opens`. */
const props = defineProps<{ availability: Availability; what: string; testid?: string }>()
const phase = (k: string | null) => (k ? t(`agenda.phase.${k}` as never) : '')
const text = computed(() => (props.availability.bypassed ? t('gated.bypass') : t(`${props.what}.closed` as never, { phase: phase(props.availability.closedBy) })))
const opens = computed(() => (!props.availability.allowed && props.availability.opensAt ? t('gated.opens', { phase: phase(props.availability.opensAt) }) : ''))
</script>

<template>
  <p v-if="availability.closedBy" :id="testid" class="gated" :class="{ bypass: availability.bypassed }" :data-testid="testid">
    <Icon :name="availability.bypassed ? 'lucide:shield-check' : 'lucide:lock'" aria-hidden="true" />
    <span>{{ text }}<template v-if="opens"> - {{ opens }}</template></span>
  </p>
</template>

<style scoped>
.gated { margin: 0; display: flex; align-items: center; gap: .4rem; font-size: var(--fs-xs); color: var(--muted); }
.gated.bypass { color: var(--accent); }
</style>
