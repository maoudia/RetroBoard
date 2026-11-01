<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <ServicePage icon="lucide:monitor-x" :title="t('service.unsupported.title')" :lead="t('service.unsupported.lead')" testid="service-unsupported">
    <template #actions>
      <NuxtLink class="btn btn-primary" to="/check" data-testid="service-check"><Icon name="lucide:check-circle" /> {{ t('service.unsupported.check') }}</NuxtLink>
      <NuxtLink class="btn" to="/"><Icon name="lucide:house" /> {{ t('service.home') }}</NuxtLink>
    </template>
  </ServicePage>
</template>
