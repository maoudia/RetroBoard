<script setup lang="ts">
/**
 * One layout for every service page (404, 500, offline, board not found...): icon, title,
 * explanation, actions in the default slot, optional details. Product tokens, never the board theme.
 */
const props = defineProps<{ icon: string; title: string; lead: string; code?: number | string; testid?: string }>()
const heading = ref<HTMLElement | null>(null)
useHead({ title: computed(() => `${props.code ? `${props.code} - ` : ''}${props.title} - RetroBoard`) })
// Screen readers land on the explanation, not on the page footer.
onMounted(() => heading.value?.focus({ preventScroll: true }))
</script>

<template>
  <main class="service" :data-testid="testid ?? 'service-page'" :data-code="code">
    <Icon :name="icon" class="ico" aria-hidden="true" />
    <p v-if="code" class="code mono" aria-hidden="true">{{ code }}</p>
    <h1 ref="heading" tabindex="-1">{{ title }}</h1>
    <p class="lead">{{ lead }}</p>
    <slot />
    <div class="actions"><slot name="actions" /></div>
    <LegalLinks />
  </main>
</template>

<style scoped>
.service { min-height: 100dvh; display: grid; align-content: center; justify-items: center; gap: .9rem; padding: 2rem 1rem; text-align: center; max-width: 36rem; margin: 0 auto; }
.ico { width: 56px; height: 56px; color: var(--accent); }
.code { margin: 0; font-size: var(--fs-md); letter-spacing: .2em; color: var(--muted); }
h1 { margin: 0; font-size: clamp(1.6rem, 5vw, 2.4rem); outline: none; }
.lead { margin: 0; color: var(--muted); font-size: var(--fs-md); }
.actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; }
</style>
