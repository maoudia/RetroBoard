<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <nav class="legal-links" :aria-label="t('legal.nav')">
    <NuxtLink to="/legal" data-testid="link-legal">{{ t('legal.title') }}</NuxtLink>
    <NuxtLink to="/privacy" data-testid="link-privacy">{{ t('privacy.title') }}</NuxtLink>
    <NuxtLink to="/terms" data-testid="link-terms">{{ t('terms.title') }}</NuxtLink>
  </nav>
</template>

<style scoped>
.legal-links { display: flex; flex-wrap: wrap; gap: .4rem 1rem; font-size: .85rem; }
.legal-links a { color: inherit; }
</style>
