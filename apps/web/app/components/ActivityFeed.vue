<script setup lang="ts">
import type { ActivityEntry } from '@retroboard/application'
const { t, locale } = useT()
const activity = useActivityStore()
const time = (at: number) => new Date(at).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
const label = (e: ActivityEntry) => t(`activity.${e.kind}` as never, { phase: e.phase ? t(`agenda.phase.${e.phase}` as never) : '' } as never)
</script>

<template>
  <Dropdown width="280px">
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" aria-haspopup="dialog" data-testid="btn-activity" :aria-label="activity.unread ? t('activity.unread', { n: activity.unread }) : t('activity.title')" @click="toggle">
        <Icon name="lucide:bell" class="ico" /><span>{{ t('activity.title') }}</span>
        <span v-if="activity.unread" class="badge" data-testid="activity-unread">{{ activity.unread }}</span>
      </button>
    </template>
    <template #default>
      <div class="feed" role="region" :aria-label="t('activity.title')" data-testid="activity-panel">
        <ActivityOpened @opened="activity.markRead()" />
        <p v-if="!activity.entries.length" class="muted empty">{{ t('activity.empty') }}</p>
        <ul v-else>
          <li v-for="e in activity.entries" :key="e.id"><span class="mono muted">{{ time(e.at) }}</span> {{ label(e) }}</li>
        </ul>
      </div>
    </template>
  </Dropdown>
</template>

<style scoped>
.feed { padding: .5rem .6rem; max-height: 50vh; overflow: auto; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; font-size: .88rem; }
.empty { margin: 0; font-size: .88rem; }
</style>
