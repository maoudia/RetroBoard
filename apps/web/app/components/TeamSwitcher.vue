<script setup lang="ts">
/** Picks the team whose boards the lists show and whose way of starting a board the next one follows (change team-workspaces). */
const { t } = useT()
const team = useTeamStore()
</script>

<template>
  <div v-if="team.teams.length >= 2" class="switcher" role="group" :aria-label="t('team.switcher')" data-testid="team-switcher">
    <button type="button" class="chip" :class="{ on: !team.view }" :aria-pressed="!team.view" data-testid="team-switch-all" @click="team.view = ''">{{ t('team.all') }}</button>
    <button v-for="x in team.teams" :key="x.id" type="button" class="chip" :class="{ on: team.view === x.id }" :aria-pressed="team.view === x.id" :data-testid="`team-switch-${x.id}`" @click="team.switchTo(x.id)">
      <span aria-hidden="true">{{ x.emoji }}</span> {{ x.name }}
    </button>
  </div>
</template>

<style scoped>
.switcher { display: flex; flex-wrap: wrap; gap: .4rem; }
.chip { min-height: 32px; padding: .2rem .7rem; border-radius: 999px; border: 1.5px solid var(--border); background: var(--surface); color: inherit; cursor: pointer; font-weight: 600; font-size: var(--fs-sm); }
.chip.on { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
</style>
