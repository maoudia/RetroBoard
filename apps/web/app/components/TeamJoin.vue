<script setup lang="ts">
import { joinTeam, type TeamShare } from '@retroboard/application'
import { teamFromHash } from '~/utils/team-share'

/** Opens a team link: asks before adding the team to this device, then clears the fragment (change team-workspaces). */
const { t } = useT()
const team = useTeamStore()
const { push } = useToasts()
const pending = ref<TeamShare | null>(null)
const asking = computed({ get: () => pending.value !== null, set: (v) => { if (!v) leave() } })

function leave() {
  pending.value = null
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
onMounted(async () => {
  const share = await teamFromHash(window.location.hash)
  if (share) pending.value = share
  else { push(t('team.share.invalid'), 'warn'); leave() }
})
function join() {
  const share = pending.value
  if (!share) return
  team.update((w) => joinTeam(w, share))
  push(t('team.share.joined', { name: share.name }), 'ok')
  leave()
}
</script>

<template>
  <ConfirmDialog v-model:open="asking" :title="t('team.join.title')" :message="t('team.join.msg', { name: pending?.name ?? '' })" :confirm-label="t('team.join.ok')" confirm-icon="lucide:users" @confirm="join" />
</template>
