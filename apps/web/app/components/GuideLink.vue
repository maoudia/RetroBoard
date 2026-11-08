<script setup lang="ts">
/**
 * A link to the static user guide (change user-manual-and-tutorials): the guide home, or one chapter and step in the
 * current language. The guide is plain HTML outside the app, so it is an ordinary link, not a router link.
 */
const props = defineProps<{ chapter?: string; step?: string; label?: 'open' | 'learn'; button?: boolean }>()
const { t, locale } = useT()
const href = computed(() => `/guide/${locale.value}/${props.chapter ? `${props.chapter}.html${props.step ? `#${props.step}` : ''}` : ''}`)
</script>

<template>
  <a :class="button ? 'btn' : 'guide-link'" :href="href" target="_blank" rel="noopener" :data-testid="`guide-link-${chapter ?? 'home'}`">
    <Icon name="lucide:book-open" /> {{ t(label === 'learn' ? 'guide.learn' : 'guide.open') }}
    <span class="sr-only">{{ t('guide.newTab') }}</span>
  </a>
</template>

<style scoped>
.guide-link { display: inline-flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); font-weight: 600; color: var(--accent); text-decoration: none; }
.guide-link:hover { text-decoration: underline; }
</style>
