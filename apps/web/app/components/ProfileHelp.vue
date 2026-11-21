<script setup lang="ts">
/** Help is the same on every page: the guide (the chapter of the page when it has one) and the ways to tell us what is missing. Lazy: the profile dialog is in the entry. */
const { t } = useT()
const route = useRoute()
</script>

<template>
  <section class="grp">
    <h3>{{ t('guide.open') }}</h3>
    <GuideLink button :chapter="route.path.startsWith('/poker') ? 'poker' : undefined" />
  </section>
  <section class="grp">
    <h3>{{ t('feedback.title') }}</h3>
    <FeedbackLinks compact />
  </section>
</template>

<style scoped>
/* The look of the sections of the profile dialog. */
.grp { display: grid; grid-template-columns: minmax(0, 1fr); gap: .8rem; margin-top: .9rem; padding-top: .9rem; border-top: 1px solid var(--border); }
h3 { margin: 0; font-size: var(--fs-sm); color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-family: var(--f-body); font-weight: 800; }
</style>
