<script setup lang="ts">
import type { FormatLang } from '@retroboard/protocol'
import { translate } from '~/i18n'
import { sectionSlug } from '~/utils/changelog'
import site from '../../site.json'

/**
 * The release notes, from the project changelog (change public-launch). The releases are parsed from CHANGELOG.md when the site
 * is built (nuxt.config.ts) and prerendered: nothing is fetched at runtime and nothing is collected. The content language is the
 * route's, like the format pages; the lines themselves stay as the changelog wrote them.
 */
const props = defineProps<{ lang: FormatLang }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.lang, key, params)

const REPO = 'https://github.com/maoudia/retroboard'
const paths: Record<FormatLang, string> = { fr: '/whats-new', en: '/en/whats-new' }
const other: Record<FormatLang, FormatLang> = { fr: 'en', en: 'fr' }
const releases = __RELEASE_NOTES__
const origin = site.origin
const title = tr('whatsnew.title')
const description = tr('whatsnew.desc')

useHead({
  title,
  htmlAttrs: { lang: props.lang },
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: origin + paths[props.lang] },
    { property: 'og:locale', content: props.lang === 'en' ? 'en_US' : 'fr_FR' },
    { name: 'twitter:card', content: 'summary' },
  ],
  link: [
    { rel: 'canonical', href: origin + paths[props.lang] },
    { rel: 'alternate', hreflang: props.lang, href: origin + paths[props.lang] },
    { rel: 'alternate', hreflang: other[props.lang], href: origin + paths[other[props.lang]] },
    { rel: 'alternate', hreflang: 'x-default', href: origin + paths.fr },
  ],
})

/** The date as written in the changelog (a day, no time zone), spelled in the page language. */
const day = (iso: string) => new Intl.DateTimeFormat(props.lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
const sectionTitle = (title: string) => {
  const slug = sectionSlug(title)
  return slug ? tr(`whatsnew.section.${slug}`) : title
}
</script>

<template>
  <main id="main" class="notes" data-testid="whats-new">
    <nav class="top" :aria-label="tr('whatsnew.nav')">
      <NuxtLink to="/" class="back"><Icon name="lucide:arrow-left" /> {{ tr('formats.page.home') }}</NuxtLink>
      <a :href="paths[other[lang]]" :hreflang="other[lang]" :lang="other[lang]" :aria-label="tr('formats.page.langOtherLabel')" data-testid="whats-new-lang">{{ tr('formats.page.langOther') }}</a>
    </nav>

    <h1>{{ tr('whatsnew.h1') }}</h1>
    <p class="lead">{{ tr('whatsnew.lead') }}</p>
    <p class="muted note">{{ tr('whatsnew.note') }}</p>

    <template v-if="releases.length">
      <article v-for="r in releases" :key="r.version" class="release" data-testid="release">
        <h2>
          {{ tr('whatsnew.version', { version: r.version }) }}
          <time :datetime="r.date">{{ day(r.date) }}</time>
        </h2>
        <section v-for="s in r.sections" :key="s.title">
          <h3>{{ sectionTitle(s.title) }}</h3>
          <ul>
            <li v-for="(item, i) in s.items" :key="i" data-testid="release-item">
              <strong v-if="item.scope" class="scope">{{ item.scope }}</strong> {{ item.text }}
            </li>
          </ul>
        </section>
      </article>
      <p><a :href="`${REPO}/blob/main/CHANGELOG.md`" rel="noopener" target="_blank" data-testid="whats-new-history">{{ tr('whatsnew.history') }}</a></p>
    </template>
    <p v-else data-testid="whats-new-empty">{{ tr('whatsnew.empty') }} <a :href="`${REPO}/releases`" rel="noopener" target="_blank">{{ tr('whatsnew.history') }}</a></p>

    <p class="muted foot">{{ tr('whatsnew.privacy') }}</p>
  </main>
</template>

<style scoped>
.notes { max-width: 46rem; margin: 0 auto; padding: var(--sp-5) var(--sp-4) var(--sp-6); line-height: 1.55; }
.top { display: flex; justify-content: space-between; gap: var(--sp-3); }
.top a, .back { display: inline-flex; gap: var(--sp-2); align-items: center; color: inherit; min-height: 2.75rem; }
h1 { margin: var(--sp-4) 0 var(--sp-2); }
h2 { font-size: var(--fs-lg); margin: var(--sp-5) 0 var(--sp-2); display: flex; flex-wrap: wrap; gap: var(--sp-1) var(--sp-3); align-items: baseline; }
h2 time { font-size: var(--fs-sm); font-weight: normal; color: var(--muted); }
h3 { font-size: var(--fs-md); margin: var(--sp-3) 0 var(--sp-1); }
.lead { font-size: var(--fs-md); }
.note { font-size: var(--fs-sm); }
.release ul { margin: 0; padding-left: var(--sp-5); display: grid; gap: var(--sp-1); }
.scope { font-weight: 600; }
.foot { margin-top: var(--sp-6); font-size: var(--fs-sm); }
a { color: inherit; }
</style>
