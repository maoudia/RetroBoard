<script setup lang="ts">
/** The mark of RetroBoard at the left of every bar of the application: the way home (change poker-design-v2, the poker pages share the bar of the board). */
const { t } = useT()
</script>

<template>
  <NuxtLink to="/" class="logo" :aria-label="t('toolbar.home')" data-testid="app-home"><Icon name="lucide:sparkles" /></NuxtLink>
</template>

<style scoped>
.logo { display: grid; place-items: center; width: 40px; height: 40px; flex: none; font-size: var(--fs-xl); border-radius: var(--r-card); background: var(--accent); color: var(--accent-ink); text-decoration: none; box-shadow: 0 6px 20px -6px var(--accent); transition: transform .2s var(--ease); }
.logo:hover { transform: rotate(-8deg) scale(1.08); }
@media (max-width: 520px) { .logo { width: 34px; height: 34px; } }
</style>
