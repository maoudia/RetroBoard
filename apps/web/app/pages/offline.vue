<script setup lang="ts">
const { t } = useT()
const recents = useRecentsStore()
const online = ref(true)
const sync = () => { online.value = navigator.onLine }
onMounted(() => { sync(); window.addEventListener('online', sync); window.addEventListener('offline', sync) })
onBeforeUnmount(() => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync) })
</script>

<template>
  <ServicePage icon="lucide:wifi-off" :title="t('service.offline.title')" :lead="t('service.offline.lead')" testid="service-offline">
    <p v-if="online" class="back" role="status" data-testid="service-online">{{ t('service.offline.back') }}</p>
    <section v-if="recents.items.length" class="local" :aria-label="t('service.offline.local')">
      <h2>{{ t('service.offline.local') }}</h2>
      <ul data-testid="service-offline-boards">
        <li v-for="r in recents.items" :key="r.id"><NuxtLink :to="{ path: '/board', hash: r.hash }"><Icon name="lucide:rotate-ccw" /> {{ r.title }}</NuxtLink></li>
      </ul>
    </section>
    <p v-else class="none" data-testid="service-offline-none">{{ t('service.offline.none') }}</p>
    <template #actions>
      <NuxtLink class="btn btn-primary" to="/" data-testid="service-home"><Icon name="lucide:rotate-ccw" /> {{ t('service.retry') }}</NuxtLink>
    </template>
  </ServicePage>
</template>

<style scoped>
.local { width: 100%; text-align: left; }
.local h2 { font-size: 1rem; margin: 0 0 .4rem; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
li a { display: flex; gap: .5rem; align-items: center; padding: .6rem .8rem; border: 1px solid var(--line, #d2d2d7); border-radius: 10px; color: inherit; text-decoration: none; }
.back { margin: 0; font-weight: 600; color: var(--accent); }
.none { margin: 0; color: var(--muted); }
</style>
