<script setup lang="ts">
import { inviteFromHash, participantLink } from '~/utils/invite'
const { t } = useT()
const board = useBoardStore()
const route = useRoute()

/** Join card for the room screen: QR of the participant link, never the facilitator secret. */
const invite = computed(() => inviteFromHash(route.hash))
const url = computed(() => (invite.value?.kind === 'encrypted' ? participantLink(invite.value, window.location.origin) : null))
const passcode = computed(() => invite.value?.kind === 'encrypted' && !!invite.value.ring.passcode)
const folded = ref(false)
/** The X closes this card only; presenter mode goes on (#271). */
const dismissed = ref(false)
</script>

<template>
  <!-- On body: page children are position: relative (board.vue), which would break fixed. -->
  <Teleport to="body">
    <aside v-if="url && !dismissed" class="join glass" :class="{ folded }" :aria-label="t('presenter.join')" data-testid="presenter-join">
      <header>
        <strong>{{ t('presenter.join') }}</strong>
        <button class="mini-btn" type="button" :aria-expanded="!folded" :aria-label="t(folded ? 'presenter.unfold' : 'presenter.fold')" @click="folded = !folded">
          <Icon :name="folded ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
        </button>
        <button class="mini-btn" type="button" :aria-label="t('presenter.closeJoin')" data-testid="presenter-join-close" @click="dismissed = true"><Icon name="lucide:x" /></button>
      </header>
      <template v-if="!folded">
        <QrCode :value="url" :label="t('share.qr.alt')" :size="200" />
        <p class="muted small">{{ t('presenter.scan') }}</p>
        <p v-if="board.roomCode" class="small words" data-testid="presenter-room-code">{{ board.roomCode }}</p>
        <p v-if="passcode" class="small" data-testid="presenter-passcode"><Icon name="lucide:key-round" /> {{ t('presenter.passcode') }}</p>
      </template>
    </aside>
  </Teleport>
</template>

<style scoped>
.join { position: fixed; right: 1rem; bottom: 1rem; z-index: 35; display: grid; gap: .5rem; width: 232px; padding: .75rem; border-radius: var(--r-card); border: 1px solid var(--border); }
header { display: flex; align-items: center; gap: .25rem; }
header strong { flex: 1; }
.words { font-weight: 700; font-size: var(--fs-md); }
.small { margin: 0; font-size: var(--fs-sm); display: flex; gap: .35rem; align-items: center; }
</style>
