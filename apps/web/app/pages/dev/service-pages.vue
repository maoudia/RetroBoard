<script setup lang="ts">
/** Development catalogue of every service page. Absent from the production build. */
if (!import.meta.dev) throw createError({ statusCode: 404, fatal: true })
const entries = [
  { path: '/nope-nope', label: '404' },
  { path: '/offline', label: 'offline' },
  { path: '/unsupported', label: 'unsupported browser' },
  { path: '/board#x', label: 'invalid board link' },
  { path: '/check', label: 'browser check' },
]
</script>

<template>
  <main class="cat">
    <h1>Service pages</h1>
    <p>Development only. Toggle light/dark and the locale from the landing page, then open each page.</p>
    <ul data-testid="service-catalogue">
      <li v-for="e in entries" :key="e.path"><NuxtLink :to="e.path">{{ e.label }}</NuxtLink> <code>{{ e.path }}</code></li>
    </ul>
  </main>
</template>

<style scoped>
.cat { max-width: 40rem; margin: 0 auto; padding: 2rem 1rem; }
</style>
