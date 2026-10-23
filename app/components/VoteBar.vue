<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const drafts = useDraftsStore()
const { publish } = usePublish()
const limit = computed(() => board.settings?.voteLimit ?? 0)
</script>

<template>
  <div class="votebar glass" data-testid="votebar">
    <div class="left">
      <span class="pill"><Icon name="lucide:thumbs-up" /> {{ t('votebar.votes', { n: limit }) }}</span>
      <span v-if="board.locked" class="pill lock"><Icon name="lucide:lock" /> {{ t('votebar.locked') }}</span>
    </div>
    <div class="mid" aria-live="polite">
      <span class="dots" aria-hidden="true">
        <span v-for="i in limit" :key="i" class="d" :class="{ used: i > board.votesLeft }" />
      </span>
      <span data-testid="votes-left"><strong class="mono">{{ board.votesLeft }}</strong> {{ t('votebar.left', { n: board.votesLeft, limit }) }}</span>
    </div>
    <div class="right">
      <button class="btn btn-sm" type="button" :aria-pressed="board.secretVoting" data-testid="secret-toggle" @click="board.send({ t: 'settings.update', secretVoting: !board.secretVoting })">
        <Icon :name="board.secretVoting ? 'lucide:eye-off' : 'lucide:eye'" /> {{ t('votebar.secret', { state: board.secretVoting ? t('votebar.on') : t('votebar.off') }) }}
      </button>
      <button class="btn btn-sm btn-primary" type="button" :disabled="!drafts.count || board.locked" data-testid="publish-all" @click="publish()">
        <Icon name="lucide:send" /> {{ t('votebar.publishAll') }}<span v-if="drafts.count"> ({{ drafts.count }})</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.votebar { display: flex; align-items: center; justify-content: space-between; gap: .75rem 1.5rem; flex-wrap: wrap; padding: .5rem 1rem; border-bottom: 1px solid var(--border); }
.left, .mid, .right { display: flex; align-items: center; gap: .6rem; }
.mid { font-size: .95rem; }
.dots { display: inline-flex; gap: 5px; }
.d { width: 11px; height: 11px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px color-mix(in oklab, var(--accent) 60%, transparent); transition: transform .3s var(--ease), background .3s, box-shadow .3s; }
.d.used { background: var(--border); box-shadow: none; transform: scale(.75); }
.lock { background: color-mix(in oklab, var(--danger) 18%, transparent); color: var(--danger); }
.btn[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
</style>
