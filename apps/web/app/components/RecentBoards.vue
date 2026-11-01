<script setup lang="ts">
import { getTheme } from '@retroboard/themes'
import { lastOpenedLabel } from '~/utils/relative-time'

/**
 * The boards this browser opened recently (change recent-boards-visible). Local only: the list is
 * sealed with the device key, a board is reachable from its link and from here.
 */
const props = withDefaults(defineProps<{ limit?: number; exclude?: string; removable?: boolean; testid?: string }>(), { limit: 12, exclude: undefined, removable: false, testid: 'recents-list' })
const emit = defineEmits<{ open: [] }>()
const { t, locale } = useT()
const recents = useRecentsStore()
const items = computed(() => recents.items.filter((r) => r.id !== props.exclude).slice(0, props.limit))
const now = ref(Date.now())
</script>

<template>
  <ul v-if="items.length" class="recent" :data-testid="testid">
    <li v-for="r in items" :key="r.id">
      <NuxtLink :to="{ path: '/board', hash: r.hash }" :data-testid="`recent-${r.id}`" @click="emit('open')">
        <span class="dot" :style="{ background: getTheme(r.themeId).tokens.accent }" aria-hidden="true" />
        <strong>{{ r.title }}</strong>
        <small class="muted">{{ lastOpenedLabel(r.at, now, locale) }}</small>
      </NuxtLink>
      <button v-if="removable" class="mini-btn" type="button" :aria-label="t('profile.recents.remove')" :data-testid="`recent-remove-${r.id}`" @click="recents.remove(r.id)"><Icon name="lucide:x" /></button>
    </li>
  </ul>
</template>

<style scoped>
.recent { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.recent li { display: flex; align-items: center; gap: .5rem; padding: .15rem .35rem; border-radius: var(--r-sm); }
.recent li:hover { background: var(--accent-soft); }
.recent a { flex: 1; min-width: 0; display: flex; align-items: center; gap: .6rem; min-height: 32px; color: inherit; text-decoration: none; }
.recent strong { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.recent small { flex: none; font-size: var(--fs-xs); }
.dot { flex: none; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px var(--border); }
</style>
