<script setup lang="ts">
import { browserName, bugReportUrl, discussionsUrl, FOLLOW_LINKS, HOME_URL, ideaUrl, screenClass } from '~/utils/feedback'
defineProps<{ compact?: boolean }>()
const { t, locale } = useT()
const config = useRuntimeConfig()
// Only the environment line: no board id, key, passcode or content ever reaches this URL.
const bug = computed(() => import.meta.client
  ? bugReportUrl({ version: String(config.public.appVersion), browser: browserName(navigator.userAgent), screen: screenClass(window.innerWidth), locale: String(locale.value) })
  : bugReportUrl({ version: String(config.public.appVersion), browser: 'unknown', screen: 'desktop', locale: String(locale.value) }))
</script>

<template>
  <div class="fb" :class="{ compact }" data-testid="feedback">
    <p v-if="!compact" class="fb-lead">{{ t('feedback.lead') }}</p>
    <div class="fb-actions">
      <a class="btn" :href="bug" target="_blank" rel="noopener" data-testid="feedback-bug"><Icon name="lucide:bug" /> {{ t('feedback.bug') }}</a>
      <a class="btn" :href="ideaUrl" target="_blank" rel="noopener" data-testid="feedback-idea"><Icon name="lucide:lightbulb" /> {{ t('feedback.idea') }}</a>
      <a class="btn" :href="discussionsUrl" target="_blank" rel="noopener" data-testid="feedback-discuss"><Icon name="lucide:message-circle" /> {{ t('feedback.discuss') }}</a>
    </div>
    <p class="fb-follow">
      <span>{{ t('feedback.find') }}</span>
      <a :href="HOME_URL" target="_blank" rel="noopener">maoudia.com</a>
      <a v-for="l in FOLLOW_LINKS" :key="l.id" :href="l.href" target="_blank" rel="noopener" :data-testid="`follow-${l.id}`">{{ l.label }}</a>
    </p>
  </div>
</template>

<style scoped>
.fb { display: grid; gap: var(--sp-3, .75rem); }
.fb-lead { margin: 0; }
.fb-actions { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }
.compact .fb-actions { justify-content: flex-start; }
.fb-follow { display: flex; flex-wrap: wrap; gap: .4rem .9rem; align-items: center; justify-content: center; margin: 0; font-size: var(--fs-sm); }
.compact .fb-follow { justify-content: flex-start; }
.fb-follow a { color: inherit; text-underline-offset: 3px; }
</style>
