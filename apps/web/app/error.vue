<script setup lang="ts">
import { suggestRoutes } from '@retroboard/application'
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useT()
const route = useRoute()

const KNOWN = ['/', '/new', '/check', '/offline', '/legal', '/privacy', '/terms', '/accessibility']
const notFound = computed(() => props.error.statusCode === 404)
const suggestions = computed(() => (notFound.value ? suggestRoutes(route.path, KNOWN) : []))
/** Shown to the visitor and logged in this console only: nothing is sent anywhere. */
const errorId = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('')
onMounted(() => { if (!notFound.value) console.error(`[RetroBoard] error ${errorId}`, props.error) })
const home = () => clearError({ redirect: '/' })
const go = (path: string) => clearError({ redirect: path })
</script>

<template>
  <ServicePage
    v-if="notFound" icon="lucide:compass" :code="404" :title="t('service.notFound.title')" :lead="t('service.notFound.lead')" testid="service-404"
  >
    <p v-if="suggestions.length" class="mean" data-testid="service-suggestions">
      {{ t('service.notFound.didYouMean') }}
      <template v-for="(s, i) in suggestions" :key="s"><button class="link" type="button" @click="go(s)">{{ s }}</button><span v-if="i < suggestions.length - 1">, </span></template>
    </p>
    <template #actions>
      <button class="btn btn-primary" type="button" data-testid="service-home" @click="home"><Icon name="lucide:arrow-left" /> {{ t('service.home') }}</button>
    </template>
  </ServicePage>
  <ServicePage v-else icon="lucide:triangle-alert" :code="500" :title="t('service.error.title')" :lead="t('service.error.lead')" testid="service-500">
    <p class="mean">{{ t('service.error.id') }} <code class="mono" data-testid="service-error-id">{{ errorId }}</code></p>
    <template #actions>
      <button class="btn btn-primary" type="button" data-testid="service-reload" @click="home"><Icon name="lucide:rotate-ccw" /> {{ t('service.reload') }}</button>
    </template>
  </ServicePage>
</template>

<style scoped>
.mean { margin: 0; }
.link { border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font: inherit; font-weight: 600; }
</style>
