<script setup lang="ts">
import { joinTeam, teamShareOf } from '@retroboard/application'
import { buildTeamFile, parseTeamFile, teamLink } from '~/utils/team-share'

/** Takes a team to another device: an encrypted link or a .retroteam file, and opens a file received (change team-workspaces). */
const { t } = useT()
const team = useTeamStore()
const { push } = useToasts()
const { $ports } = useNuxtApp()
const picked = ref(team.current?.id ?? '')
const link = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const target = computed(() => { const x = team.teams.find((t) => t.id === (picked.value || team.current?.id)); return x ? teamShareOf(x) : null })
watch(picked, () => { link.value = '' })

async function makeLink() {
  const share = target.value
  if (share) link.value = await teamLink(share, window.location.origin)
}
async function copy() {
  try { await $ports.clipboard.writeText(link.value); push(t('team.share.copied'), 'ok') } catch { /* the field stays selectable */ }
}
function download() {
  const share = target.value
  if (share) $ports.file.save(`${share.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team'}.retroteam`, buildTeamFile(share), 'application/json')
}
async function importFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const share = parseTeamFile(await file.text())
  if (!share) { push(t('team.share.invalid'), 'warn'); return }
  team.update((w) => joinTeam(w, share))
  picked.value = share.id
  push(t('team.share.joined', { name: share.name }), 'ok')
}
</script>

<template>
  <div class="share" data-testid="team-share">
    <p class="muted small">{{ t('team.share.hint') }}</p>
    <ul v-if="team.teams.length" class="names" :aria-label="t('team.team')" data-testid="team-names">
      <li v-for="x in team.teams" :key="x.id"><span aria-hidden="true">{{ x.emoji }}</span> {{ x.name }}</li>
    </ul>
    <div v-if="team.teams.length" class="row">
      <select v-if="team.teams.length > 1" v-model="picked" class="field sel" :aria-label="t('team.team')" data-testid="team-share-select">
        <option v-for="x in team.teams" :key="x.id" :value="x.id">{{ x.emoji }} {{ x.name }}</option>
      </select>
      <button class="btn btn-sm" type="button" data-testid="team-link-make" @click="makeLink"><Icon name="lucide:link" /> {{ t('team.share.link') }}</button>
      <button class="btn btn-sm" type="button" data-testid="team-file-export" @click="download"><Icon name="lucide:download" /> {{ t('team.share.file') }}</button>
    </div>
    <div v-if="link" class="row">
      <input class="field" readonly :value="link" :aria-label="t('team.share.link')" data-testid="team-link" @focus="($event.target as HTMLInputElement).select()" />
      <button class="btn btn-sm" type="button" data-testid="team-link-copy" @click="copy"><Icon name="lucide:copy" /> {{ t('team.share.copy') }}</button>
    </div>
    <div class="row">
      <button class="btn btn-sm" type="button" data-testid="team-file-import" @click="fileInput?.click()"><Icon name="lucide:upload" /> {{ t('team.share.import') }}</button>
      <input ref="fileInput" class="sr-only" type="file" accept=".retroteam,application/json" tabindex="-1" aria-hidden="true" data-testid="team-file-input" @change="importFile">
    </div>
  </div>
</template>

<style scoped>
.share { display: grid; gap: .6rem; }
.names { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem .9rem; font-weight: 600; }
.row { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
.row .field:not(.sel) { flex: 1; min-width: 12rem; }
.sel { width: auto; min-width: 150px; }
</style>
