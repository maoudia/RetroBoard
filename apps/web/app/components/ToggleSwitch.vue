<script setup lang="ts">
/**
 * The one on/off control of the app (feedback-wave-4): optional icon, a short label, an optional hint, a switch.
 * Attributes such as data-testid land on the input itself so tests and assistive technologies talk to the switch.
 */
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; hint?: string; icon?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="tgl" :class="{ off: disabled }">
    <Icon v-if="icon" :name="icon" class="tgl-ico" />
    <span class="tgl-text"><strong>{{ label }}</strong><small v-if="hint" class="muted">{{ hint }}</small></span>
    <input v-bind="$attrs" v-model="model" type="checkbox" role="switch" class="switch" :disabled="disabled">
  </label>
</template>

<style scoped>
.tgl { display: flex; align-items: center; gap: .6rem; min-block-size: 36px; padding: .35rem .85rem; border-radius: var(--r-pill); cursor: pointer; transition: background-color .12s; }
.tgl:hover { background: var(--accent-soft); }
.tgl:focus-within { outline: 2px solid var(--accent); outline-offset: -2px; }
.tgl.off { opacity: .5; cursor: default; }
.tgl-ico { flex: none; font-size: var(--fs-lg); }
.tgl-text { display: grid; gap: 1px; min-width: 0; flex: 1; font-size: var(--fs-md); }
.tgl-text small { font-size: var(--fs-sm); }
</style>
