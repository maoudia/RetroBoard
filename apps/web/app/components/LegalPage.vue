<script setup lang="ts">
import { td } from '~/i18n'
const { t } = useT()

/**
 * Legal, privacy and terms pages: text lives in i18n (fr, en) as `${doc}.${n}.h`, `${doc}.${n}.p`
 * and optional bullets `${doc}.${n}.li.${m}`. Sections are listed by the page.
 */
const props = defineProps<{ doc: 'legal' | 'privacy' | 'terms' | 'accessibility'; sections: { bullets?: number }[] }>()
useHead({ title: computed(() => `${td(`${props.doc}.title`)} - RetroBoard`) })
</script>

<template>
  <main class="legal" :data-testid="`page-${doc}`">
    <NuxtLink to="/" class="back"><Icon name="lucide:arrow-left" /> {{ t('check.back') }}</NuxtLink>
    <h1>{{ td(`${doc}.title`) }}</h1>
    <p class="lead">{{ td(`${doc}.lead`) }}</p>
    <p class="beta"><Icon name="lucide:flask-conical" /> {{ t('legal.beta') }}</p>
    <section v-for="(s, i) in sections" :key="i">
      <h2>{{ td(`${doc}.${i + 1}.h`) }}</h2>
      <p>{{ td(`${doc}.${i + 1}.p`) }}</p>
      <ul v-if="s.bullets">
        <li v-for="m in s.bullets" :key="m" :data-testid="`${doc}-${i + 1}-${m}`">{{ td(`${doc}.${i + 1}.li.${m}`) }}</li>
      </ul>
    </section>
    <p class="muted updated">{{ t('legal.updated') }}</p>
    <LegalLinks />
  </main>
</template>

<style scoped>
.legal { max-width: 44rem; margin: 0 auto; padding: 2rem 1rem 3rem; line-height: 1.55; }
.back { display: inline-flex; gap: .4rem; align-items: center; color: inherit; }
h1 { margin: 1rem 0 .5rem; }
h2 { font-size: 1.15rem; margin: 1.6rem 0 .4rem; }
.lead { font-size: 1.05rem; }
.beta { display: flex; gap: .5rem; align-items: center; padding: .6rem .8rem; border-radius: 10px; border: 1px solid var(--border, #d2d2d7); }
ul { padding-left: 1.2rem; display: grid; gap: .3rem; }
.updated { margin-top: 2rem; font-size: .85rem; }
</style>
