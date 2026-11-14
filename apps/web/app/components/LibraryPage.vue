<script setup lang="ts">
/** `/boards` without a board link: the person's board library (change user-drive-storage). */
const { t } = useT()
const heading = ref<HTMLElement | null>(null)
useHead({ title: computed(() => `${t('library.title')} - RetroBoard`) })
onMounted(() => heading.value?.focus({ preventScroll: true }))
</script>

<template>
  <main class="library-page" data-testid="library-page">
    <header class="head">
      <h1 ref="heading" tabindex="-1">{{ t('library.title') }}</h1>
      <p class="lead muted">{{ t('library.lead') }}</p>
      <div class="actions">
        <NuxtLink class="btn btn-primary" to="/new" data-testid="library-new"><Icon name="lucide:plus" /> {{ t('library.new') }}</NuxtLink>
        <NuxtLink class="btn" to="/"><Icon name="lucide:house" /> {{ t('service.home') }}</NuxtLink>
      </div>
    </header>
    <LibraryList />
    <LegalLinks />
  </main>
</template>

<style scoped>
.library-page { min-height: 100dvh; display: grid; align-content: start; gap: var(--sp-5); width: min(100%, 52rem); margin: 0 auto; padding: var(--sp-6) var(--sp-4); }
.head { display: grid; gap: var(--sp-2); }
h1 { font-size: var(--fs-2xl); outline: none; }
.lead { max-width: 60ch; }
.actions { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-2); }
[data-screen="tv"] .library-page { width: min(100%, 90rem); }
[data-screen="tv"] h1 { font-size: var(--fs-3xl); }
</style>
