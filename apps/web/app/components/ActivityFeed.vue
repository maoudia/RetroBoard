<script setup lang="ts">
import type { ActivityEntry } from '@retroboard/application'
const { t, locale } = useT()
const activity = useActivityStore()
const time = (at: number) => formatClock(at, locale.value)
const label = (e: ActivityEntry) => t(`activity.${e.kind}` as never, { phase: e.phase ? t(`agenda.phase.${e.phase}` as never) : '', name: e.name ?? t('common.anonymous') } as never)
</script>

<template>
  <Dropdown width="var(--panel-w)" fixed>
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" aria-haspopup="dialog" data-testid="btn-activity" :aria-label="activity.unread ? t('activity.unread', { n: activity.unread }) : t('activity.title')" @click="toggle">
        <Icon name="lucide:bell" class="ico" /><span>{{ t('activity.title') }}</span>
        <span v-if="activity.unread" class="badge" data-testid="activity-unread">{{ activity.unread }}</span>
      </button>
    </template>
    <template #default>
      <div class="feed" role="region" :aria-label="t('activity.title')" data-testid="activity-panel">
        <ActivityOpened @opened="activity.markRead()" />
        <p v-if="!activity.entries.length" class="muted panel-empty">{{ t('activity.empty') }}</p>
        <ul v-else>
          <li v-for="e in activity.entries" :key="e.id" class="panel-row"><span class="meta">{{ time(e.at) }}</span><span class="body">{{ label(e) }}</span></li>
        </ul>
      </div>
    </template>
  </Dropdown>
</template>

<style scoped>
.feed { padding: var(--panel-pad); }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--row-gap); }
</style>
