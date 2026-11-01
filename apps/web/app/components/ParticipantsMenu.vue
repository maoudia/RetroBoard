<script setup lang="ts">
import { nameKey } from '@retroboard/application'
import type { Peer } from '@retroboard/domain'
const { t } = useT()
const board = useBoardStore()
const live = useLiveStore()
const { push } = useToasts()
const initial = (n: string | null) => (n?.trim()[0] ?? '?').toUpperCase()
const hue = (n: string | null) => { let h = 0; for (const c of n ?? 'x') h = (h * 31 + c.charCodeAt(0)) % 360; return h }

/** Two people with the same name: a small rank tells them apart (identity-conflicts). */
const sameName = computed(() => {
  const count = new Map<string, number>()
  for (const p of board.peers) { const k = nameKey(p.name); if (k) count.set(k, (count.get(k) ?? 0) + 1) }
  const seen = new Map<string, number>()
  return board.peers.map((p) => {
    const k = nameKey(p.name)
    if (!k || (count.get(k) ?? 0) < 2) return 0
    seen.set(k, (seen.get(k) ?? 0) + 1)
    return seen.get(k)!
  })
})

/** Role changes need the peer's session key (encrypted boards) and the facilitator's rights. */
const manageable = (p: Peer) => board.access.canManageRoles && !p.me && !!p.key
const handOver = ref<Peer | null>(null)
const renaming = ref<Peer | null>(null)
function rename(p: Peer, name: string) {
  if (!p.key || !board.sendRename(p.key, name)) push(t('roles.failed'), 'warn')
}

const talkOn = computed(() => (board.settings?.talkMode ?? 'off') !== 'off')
/** Facilitators give the floor to anyone; a participant takes it when self start is allowed. */
function giveFloor(p: Peer) {
  const r = p.me && !board.access.canSteer ? board.commands.takeFloor() : board.commands.giveFloor(p.key!, p.name)
  if (!r.ok) push(t('roles.failed'), 'warn')
}

/** Live status of another participant: typing (in which column) or idle. Online says nothing. */
function statusLabel(p: Peer): string | null {
  if (p.me) return null
  const s = live.status(p.conn)
  if (s.status === 'typing') {
    const col = board.columns.find((c) => c.id === s.column)?.title
    return col ? t('live.typingIn', { column: col }) : t('live.typing')
  }
  return s.status === 'idle' ? t('live.idle') : null
}

function role(change: 'role.delegate' | 'role.revoke' | 'role.handover' | 'role.claim' | 'participant.hide' | 'participant.unhide', p: Peer) {
  if (!p.key || !board.sendRole(change, p.key)) { push(t('roles.failed'), 'warn'); return }
  if (change === 'participant.hide') push(t('roles.hidden.newBoard'), 'warn')
}
</script>

<template>
  <Dropdown width="300px">
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" data-testid="btn-participants" @click="toggle">
        <Icon name="lucide:users" class="ico" /><span>{{ t('toolbar.participants') }}</span>
        <span class="badge" data-testid="peer-count">{{ board.peers.length }}</span>
      </button>
    </template>
    <span class="head muted">{{ t('participants.online') }}</span>
    <p v-if="board.roomCode" class="code muted" :title="t('share.roomCode.hint')" data-testid="peers-room-code">{{ t('share.roomCode') }} <strong>{{ board.roomCode }}</strong></p>
    <ul class="list" data-testid="peers">
      <li v-for="(p, i) in board.peers" :key="p.key ?? i" :data-role="p.role" :data-testid="`peer-${i}`">
        <span class="av" :style="{ background: `hsl(${hue(p.name)} 70% 72%)` }">{{ initial(p.name) }}</span>
        <span class="nm">{{ p.name ?? t('common.anonymous') }}<small v-if="sameName[i]" class="st muted" :data-testid="`peer-rank-${i}`">#{{ sameName[i] }}</small><small v-if="p.renamed" class="st muted" :data-testid="`peer-renamed-${i}`">{{ t('roles.renamed') }}</small><small v-if="statusLabel(p)" class="st muted" :data-testid="`peer-status-${i}`">{{ statusLabel(p) }}</small></span>
        <span v-if="p.role === 'facilitator' && !board.settings?.openFacilitation" class="pill role" data-testid="badge-facilitator"><Icon name="lucide:crown" /> {{ t('roles.facilitator') }}</span>
        <span v-else-if="p.role === 'co-facilitator' && !board.settings?.openFacilitation" class="pill role" data-testid="badge-co"><Icon name="lucide:shield" /> {{ t('roles.co') }}</span>
        <span v-if="p.hidden" class="pill muted" data-testid="badge-hidden">{{ t('roles.hidden') }}</span>
        <span v-if="p.me" class="pill">{{ t('common.you') }}</span>
        <span v-if="talkOn && p.key && board.snapshot?.talk.active?.speaker === p.key" class="pill talking" data-testid="badge-speaking"><Icon name="lucide:mic" /> {{ t('talk.now') }}</span>
        <button
          v-else-if="talkOn && p.key && (board.access.canSteer || (p.me && board.settings?.talkSelfStart))" class="mini-btn" type="button"
          :aria-label="t(p.me ? 'talk.take' : 'talk.give', { name: p.name ?? t('common.anonymous') })" :title="t(p.me ? 'talk.take' : 'talk.give', { name: p.name ?? t('common.anonymous') })"
          :data-testid="`talk-give-${i}`" @click="giveFloor(p)"
        ><Icon name="lucide:mic" /></button>
        <span v-if="manageable(p)" class="acts">
          <button v-if="p.role === 'participant'" class="mini-btn" type="button" :aria-label="t('roles.promote', { name: p.name ?? t('common.anonymous') })" :title="t('roles.promote.short')" data-testid="role-promote" @click="role('role.delegate', p)"><Icon name="lucide:shield-plus" /></button>
          <button v-if="p.role === 'co-facilitator'" class="mini-btn" type="button" :aria-label="t('roles.revoke', { name: p.name ?? t('common.anonymous') })" :title="t('roles.revoke.short')" data-testid="role-revoke" @click="role('role.revoke', p)"><Icon name="lucide:shield-minus" /></button>
          <button v-if="!p.hidden" class="mini-btn" type="button" :aria-label="t('roles.handover', { name: p.name ?? t('common.anonymous') })" :title="t('roles.handover.short')" data-testid="role-handover" @click="handOver = p"><Icon name="lucide:crown" /></button>
          <button v-if="p.role === 'participant'" class="mini-btn" type="button" :aria-label="t('roles.rename', { name: p.name ?? t('common.anonymous') })" :title="t('roles.rename.short')" data-testid="role-rename" @click="renaming = p"><Icon name="lucide:pencil" /></button>
          <button v-if="p.role === 'participant' && !p.hidden" class="mini-btn" type="button" :aria-label="t('roles.hide', { name: p.name ?? t('common.anonymous') })" :title="t('roles.hide.short')" data-testid="role-hide" @click="role('participant.hide', p)"><Icon name="lucide:eye-off" /></button>
          <button v-if="p.hidden" class="mini-btn" type="button" :aria-label="t('roles.unhide', { name: p.name ?? t('common.anonymous') })" :title="t('roles.unhide.short')" data-testid="role-unhide" @click="role('participant.unhide', p)"><Icon name="lucide:eye" /></button>
        </span>
      </li>
    </ul>
    <p v-if="board.links" class="note muted links" :data-p2p="board.links.p2p" data-testid="links-state">
      <Icon :name="board.links.p2p ? 'lucide:waypoints' : 'lucide:server'" />
      {{ board.links.p2p ? t('links.p2p', { n: board.links.peers }) : t('links.relay') }}
    </p>
    <p v-if="board.snapshot?.access" class="note muted">{{ t('roles.e2eNote') }}</p>
  </Dropdown>
  <RenameDialog :open="renaming !== null" :name="renaming?.name ?? null" @update:open="(v: boolean) => { if (!v) renaming = null }" @save="(n: string) => renaming && rename(renaming, n)" />
  <ConfirmDialog
    :open="handOver !== null" confirm-icon="lucide:arrow-right-left" :title="t('roles.handover.title')" :confirm-label="t('roles.handover.ok')"
    :message="t('roles.handover.msg', { name: handOver?.name ?? t('common.anonymous') })"
    @update:open="(v: boolean) => { if (!v) handOver = null }" @confirm="handOver && role('role.handover', handOver); handOver = null"
  />
</template>

<style scoped>
.head { font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: .3rem .5rem; }
.code { margin: 0 .5rem .35rem; font-size: var(--fs-xs); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
li { display: flex; align-items: center; gap: .5rem; padding: .35rem .5rem; border-radius: var(--r-sm); flex-wrap: wrap; }
.av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; font-weight: 800; font-size: var(--fs-xs); color: #1b1b1b; flex: none; }
.nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st { display: block; font-size: var(--fs-xs); }
.talking { display: inline-flex; align-items: center; gap: .25rem; color: var(--accent); }
.role { display: inline-flex; align-items: center; gap: .25rem; }
.acts { display: inline-flex; gap: 2px; }
.note { margin: .4rem .5rem 0; font-size: var(--fs-xs); }
</style>
