<script setup lang="ts">
import { inviteFromHash } from '~/utils/invite'
const { t } = useT()

/**
 * Encryption state as an icon instead of a sentence (change feedback-wave-4): a shield when the board is end-to-end
 * encrypted, an open shield when it is not. Hover or focus shows a short tooltip, a tap opens the explanation.
 */
const route = useRoute()
const invite = computed(() => (import.meta.client ? inviteFromHash(route.hash) : null))
const encrypted = computed(() => invite.value?.kind === 'encrypted')
const passcode = computed(() => invite.value?.kind === 'encrypted' && !!invite.value.ring.passcode)
const state = computed<'locked' | 'link' | 'open'>(() => (!encrypted.value ? 'open' : passcode.value ? 'locked' : 'link'))
const icon = computed(() => ({ locked: 'lucide:shield-check', link: 'lucide:shield', open: 'lucide:shield-off' })[state.value])
</script>

<template>
  <Dropdown align="start" width="280px">
    <template #trigger="{ toggle, open }">
      <button class="mini-btn shield" type="button" :data-state="state" aria-haspopup="true" :aria-expanded="open" :aria-label="t(`crypto.${state}.short`)" :title="t(`crypto.${state}.short`)" data-testid="encryption-badge" @click="toggle">
        <Icon :name="icon" />
      </button>
    </template>
    <p class="expl" data-testid="encryption-explain"><strong>{{ t(`crypto.${state}.short`) }}</strong><span>{{ t(`crypto.${state}.long`) }}</span></p>
  </Dropdown>
</template>

<style scoped>
.shield[data-state="locked"] { color: var(--success); }
.shield[data-state="link"] { color: var(--text); }
.shield[data-state="open"] { color: var(--danger); }
.expl { display: grid; gap: .3rem; margin: 0; padding: .5rem .75rem; font-size: var(--fs-sm); line-height: 1.4; }
.expl strong { font-size: var(--fs-md); }
</style>
