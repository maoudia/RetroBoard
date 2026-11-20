<script setup lang="ts">
import { type Goal, TEMPLATES, getTemplate, localizeTemplate } from '@retroboard/domain'
import { type FormatLang, formatPath } from '@retroboard/protocol'
import { translate } from '~/i18n'
import site from '../../site.json'

/**
 * One page per retro format, or the index when `id` is absent (change public-launch). The content language is the route's,
 * not the visitor's: a crawler sees each language at its own URL, and the text comes from the catalogue, never from the page.
 */
const props = defineProps<{ lang: FormatLang; id?: string }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.lang, key, params)

const formats = computed(() => TEMPLATES.map((x) => localizeTemplate(x, props.lang)))
const format = computed(() => {
  const found = props.id ? getTemplate(props.id) : undefined
  return found ? localizeTemplate(found, props.lang) : null
})
if (props.id && !format.value) throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

const other: Record<FormatLang, FormatLang> = { fr: 'en', en: 'fr' }
const here = computed(() => formatPath(props.id ?? null, props.lang))
const there = computed(() => formatPath(props.id ?? null, other[props.lang]))
const origin = site.origin
const title = computed(() => format.value
  ? tr('formats.page.title', { name: format.value.name })
  : tr('formats.index.title'))
const description = computed(() => format.value
  ? tr('formats.page.desc', { description: format.value.description, columns: format.value.columns.map((c) => c.title).join(', ') })
  : tr('formats.index.desc', { names: formats.value.map((x) => x.name).join(', ') }))
useHead({
  title,
  htmlAttrs: { lang: props.lang },
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: computed(() => origin + here.value) },
    { property: 'og:locale', content: props.lang === 'en' ? 'en_US' : 'fr_FR' },
    { name: 'twitter:card', content: 'summary' },
  ],
  link: [
    { rel: 'canonical', href: computed(() => origin + here.value) },
    { rel: 'alternate', hreflang: props.lang, href: computed(() => origin + here.value) },
    { rel: 'alternate', hreflang: other[props.lang], href: computed(() => origin + there.value) },
    { rel: 'alternate', hreflang: 'x-default', href: computed(() => origin + formatPath(props.id ?? null, 'fr')) },
  ],
})

const goalLabel = (g: Goal) => tr(`goal.${g}`)
</script>

<template>
  <main id="main" class="format" :data-testid="format ? `format-${format.id}` : 'formats-index'">
    <nav class="top" :aria-label="tr('formats.page.nav')">
      <NuxtLink to="/" class="back"><Icon name="lucide:arrow-left" /> {{ tr('formats.page.home') }}</NuxtLink>
      <a :href="there" :hreflang="other[lang]" :lang="other[lang]" :aria-label="tr('formats.page.langOtherLabel')" data-testid="format-lang">{{ tr('formats.page.langOther') }}</a>
    </nav>

    <template v-if="format">
      <h1 data-testid="format-name">{{ format.name }}</h1>
      <p class="lead">{{ format.description }}</p>
      <NuxtLink :to="{ path: '/new', query: { format: format.id } }" class="btn btn-primary start" data-testid="format-start">
        <Icon name="lucide:play" /> {{ tr('formats.page.start') }}
      </NuxtLink>

      <section>
        <h2>{{ tr('formats.page.columns') }}</h2>
        <ol class="columns">
          <li v-for="c in format.columns" :key="c.title" data-testid="format-column">
            <Icon :name="`lucide:${c.icon}`" />
            <span><strong>{{ c.title }}</strong><br>{{ c.subtitle }}</span>
          </li>
        </ol>
      </section>

      <section class="facts">
        <div>
          <h2>{{ tr('formats.page.goals') }}</h2>
          <ul class="goals"><li v-for="g in format.goals" :key="g">{{ goalLabel(g) }}</li></ul>
        </div>
        <div>
          <h2>{{ tr('formats.page.time') }}</h2>
          <p>{{ tr('formats.page.minutes', { min: format.minutes[0], max: format.minutes[1] }) }}</p>
        </div>
      </section>
    </template>

    <template v-else>
      <h1>{{ tr('formats.index.h1') }}</h1>
      <p class="lead">{{ tr('formats.index.lead', { n: formats.length }) }}</p>
    </template>

    <section>
      <h2>{{ format ? tr('formats.page.others') : tr('formats.page.all') }}</h2>
      <ul class="others">
        <li v-for="x in formats.filter((f) => f.id !== format?.id)" :key="x.id">
          <NuxtLink :to="formatPath(x.id, lang)" data-testid="format-link"><strong>{{ x.name }}</strong></NuxtLink>
          <span>{{ x.description }}</span>
        </li>
      </ul>
      <p v-if="format"><NuxtLink :to="formatPath(null, lang)">{{ tr('formats.page.all') }}</NuxtLink></p>
    </section>

    <p class="muted foot">{{ tr('formats.page.privacy') }}</p>
  </main>
</template>

<style scoped>
.format { max-width: 46rem; margin: 0 auto; padding: var(--sp-5) var(--sp-4) var(--sp-6); line-height: 1.55; }
.top { display: flex; justify-content: space-between; gap: var(--sp-3); }
.top a, .back { display: inline-flex; gap: var(--sp-2); align-items: center; color: inherit; min-height: 2.75rem; }
h1 { margin: var(--sp-4) 0 var(--sp-2); }
h2 { font-size: var(--fs-lg); margin: var(--sp-5) 0 var(--sp-2); }
.lead { font-size: var(--fs-md); }
.start { text-decoration: none; }
.columns, .goals, .others { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--sp-2); }
.columns li { display: flex; gap: var(--sp-3); align-items: flex-start; padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-card); }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); gap: var(--sp-4); }
.others li { display: grid; gap: var(--sp-1); }
.others a { color: inherit; }
.foot { margin-top: var(--sp-6); font-size: var(--fs-sm); }
</style>
