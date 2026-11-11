<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <nav class="legal-links" :aria-label="t('legal.nav')">
    <NuxtLink to="/legal" data-testid="link-legal">{{ t('legal.title') }}</NuxtLink>
    <NuxtLink to="/privacy" data-testid="link-privacy">{{ t('privacy.title') }}</NuxtLink>
    <NuxtLink to="/terms" data-testid="link-terms">{{ t('terms.title') }}</NuxtLink>
    <NuxtLink to="/accessibility" data-testid="link-accessibility">{{ t('accessibility.title') }}</NuxtLink>
    <!-- AGPL section 13: every user of the network service is offered the source (change licensing-and-monetization). -->
    <a href="https://github.com/maoudia/retroboard" rel="noopener" target="_blank" data-testid="link-source">{{ t('legal.source') }}</a>
  </nav>
</template>

<style scoped>
.legal-links { display: flex; flex-wrap: wrap; gap: .4rem 1rem; font-size: var(--fs-sm); }
.legal-links a { color: inherit; }
</style>
